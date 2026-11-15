'use strict';
/* ============================================================
   ЛОГАРИФМ · АП-2 — движок сеансов связи. Кино-редакция.
   Советская ЭВМ «РУБИН», абонентский пункт АП-2.
   Типы битов сеанса:
     {sys} система мгновенно   {say} машина печатает   {ab} абонент печатает
     {me} реплика пользователя {big} кинетическое слово {err} ошибка линии
     {f} рамка с формулой      {anim} визуализация      {pause} пауза
     {clear} очистка экрана    {glitch} помехи          {choice} выбор с разбором ошибок
   Ответ пользователя — всегда выбор из вариантов.
   Читаемость: умный автоскролл (листал вверх — лента не дёргается,
   плашка «показать новое»), статус игры — на закреплённом пульте.
   ============================================================ */
window.TERM = window.TERM || {};

(function () {
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var U = {
    clamp: function (v, a, b) { return Math.max(a, Math.min(b, v)); },
    rnd: function (a, b) { return a + Math.random() * (b - a); },
    repeat: function (s, n) { return new Array(Math.max(0, Math.round(n)) + 1).join(s); },
    plain: function (s) { return String(s).replace(/\[\[(?:amb|ok|dim|err):([^\]]*)\]\]/g, '$1'); },
    mk: function (s) {
      return String(s).replace(/\[\[(amb|ok|dim|err):([^\]]*)\]\]/g, function (_, c, t) {
        return '<span class="' + c + '">' + t + '</span>';
      });
    },
    visLen: function (s) { return U.plain(s).length; },
    pad: function (s, w) {
      s = U.plain(s);
      return s.length >= w ? s.slice(0, w) : s + U.repeat(' ', w - s.length);
    }
  };
  TERM.U = U;

  var eps = [];
  TERM.register = function (ep) {
    ep.label = ep.label || ('СЕАНС ' + String(eps.length + 1).padStart(2, '0'));
    eps.push(ep);
  };

  var el = {};
  var st = {
    cur: -1, token: 0, started: false,
    skip: false, choiceOpen: false, paused: false,
    stick: true, newCount: 0
  };

  /* ---------- ПАУЗА: стоп-кадр сеанса ---------- */
  function setPaused(v) {
    st.paused = !!v;
    if (v) st.skip = false;
    if (el.btnPause) {
      el.btnPause.setAttribute('aria-pressed', String(st.paused));
      el.btnPause.classList.toggle('tbtn--on', st.paused);
      el.btnPause.textContent = st.paused ? 'ПУСК' : 'ПАУЗА';
    }
    if (el.linkDot) el.linkDot.classList.toggle('paused', st.paused);
  }
  TERM.setPaused = setPaused;

  function save() {
    try { localStorage.setItem('termlog.progress.v1', JSON.stringify({ e: st.cur })); } catch (e) {}
  }
  function load() {
    try { return JSON.parse(localStorage.getItem('termlog.progress.v1') || 'null'); } catch (e) { return null; }
  }

  /* ---------- Умный автоскролл ---------- */
  function updatePill() {
    if (!el.pill) return;
    if (!st.stick && st.newCount > 0) {
      el.pill.hidden = false;
      el.count.textContent = st.newCount > 1 ? '+' + st.newCount : '';
    } else {
      el.pill.hidden = true;
    }
  }
  function onScroll() {
    if (!el.feed) return;
    var dist = el.feed.scrollHeight - el.feed.scrollTop - el.feed.clientHeight;
    var was = st.stick;
    st.stick = dist < 90;
    if (st.stick && !was) { st.newCount = 0; updatePill(); }
    TERM.bg.setScroll(el.feed.scrollTop * 0.01);
  }
  function scroll() {
    if (!el.feed) return;
    if (st.stick) {
      var dist = el.feed.scrollHeight - el.feed.scrollTop - el.feed.clientHeight;
      /* большой прыжок — плавно, чтобы картинка не «мелькала» */
      if (dist > 700 && el.feed.scrollTo) {
        el.feed.scrollTo({ top: el.feed.scrollHeight, behavior: 'smooth' });
      } else {
        el.feed.scrollTop = el.feed.scrollHeight;
      }
    } else {
      st.newCount++;
      updatePill();
    }
  }
  function forceScroll() {
    st.stick = true; st.newCount = 0;
    if (el.feed) el.feed.scrollTop = el.feed.scrollHeight;
    updatePill();
  }
  TERM.scroll = scroll;

  function line(cls, who) {
    var root = document.createElement('div');
    root.className = 'ln ' + cls;
    var html = '';
    if (who) html += '<span class="who">' + who + '</span>';
    html += '<span class="txt"></span>';
    root.innerHTML = html;
    el.inner.appendChild(root);
    scroll();
    var txt = root.querySelector('.txt');
    return { root: root, txt: txt };
  }

  function instant(cls, who, text) {
    var l = line(cls, who);
    l.txt.innerHTML = U.mk(text);
    scroll();
    return l;
  }

  function consumeSkip() { var s = st.skip; st.skip = false; return s; }

  /* Печать с эффектом телетайпа */
  function type(l, text, speed) {
    return new Promise(function (res) {
      if (typeof text !== 'string') text = String(text);
      var caret = document.createElement('span');
      caret.className = 'caret';
      l.root.appendChild(caret);
      l.txt.textContent = '';
      function finish() {
        l.txt.innerHTML = U.mk(text);
        caret.remove();
        scroll();
        res();
      }
      if (consumeSkip()) { finish(); return; }
      var i = 0;
      (function tick() {
        if (st.paused) { setTimeout(tick, 150); return; }  /* стоп-кадр */
        if (consumeSkip()) { finish(); return; }
        i += 1;
        if (i >= text.length) { finish(); return; }
        l.txt.textContent = text.slice(0, i);
        if (i % 6 === 0) TERM.sfx.tick();
        scroll();
        setTimeout(tick, speed);
      })();
    });
  }

  function wait(ms) {
    return new Promise(function (res) {
      if (consumeSkip()) { res(); return; }
      var acc = 0, last = performance.now();
      (function chk() {
        var now = performance.now();
        if (st.paused) { last = now; setTimeout(chk, 150); return; }  /* стоп-кадр: время не течёт */
        acc += now - last; last = now;
        if (st.skip || acc >= ms) { consumeSkip(); res(); return; }
        setTimeout(chk, 40);
      })();
    });
  }

  /* «АБОНЕНТ ПЕЧАТАЕТ…» */
  var thinkEl = null;
  function thinking() {
    stopThinking();
    thinkEl = instant('ln--sys', '', 'АБОНЕНТ ПЕЧАТАЕТ');
    thinkEl.root.classList.add('thinking');
  }
  function stopThinking() {
    if (thinkEl) { thinkEl.root.remove(); thinkEl = null; }
  }

  /* ---------- Карточки с формулами ---------- */
  function frame(spec, cont) {
    var arr = Array.isArray(spec) ? spec : (spec.l || []);
    var title = Array.isArray(spec) ? '' : (spec.t || '');
    var card = document.createElement('div');
    card.className = 'blk blk--frame';
    var html = '';
    if (title) html += '<span class="blk-title">' + U.mk(title) + '</span>';
    html += '<div class="blk-body">';
    arr.forEach(function (s) { html += '<div class="lrow">' + (s === '' ? '&nbsp;' : U.mk(s)) + '</div>'; });
    html += '</div>';
    card.innerHTML = html;
    (cont || el.inner).appendChild(card);
    scroll();
    return card;
  }

  /* ---------- Помехи ---------- */
  async function glitchFx() {
    var fx = el.fx;
    fx.className = 'on';
    el.crt.classList.add('glitching');
    TERM.sfx.noise(0.32, 0.09, 700);
    var chars = '▓▒░█▄▀╬╪╫╗╔╠╣▚▞░▒▓';
    var s = '';
    for (var i = 0; i < 90; i++) s += chars[Math.floor(Math.random() * chars.length)];
    var l = instant('ln--err', '', s);
    await wait(340);
    l.root.remove();
    fx.className = '';
    el.crt.classList.remove('glitching');
  }

  /* ---------- Очистка экрана: GL-переход или CSS-фолбэк ---------- */
  function clearNow() {
    el.inner.innerHTML = '';
    st.stick = true; st.newCount = 0;
    updatePill();
  }
  async function crtClear() {
    if (TERM.trans.available()) {
      await TERM.trans.run(null, clearNow);
      return;
    }
    /* CSS-фолбэк */
    var fade = document.getElementById('fade');
    if (fade && !REDUCED) {
      fade.classList.remove('on'); void fade.offsetWidth; fade.classList.add('on');
      setTimeout(clearNow, 480);
      await new Promise(function (r) { setTimeout(r, 1050); });
    } else {
      clearNow();
    }
  }

  /* ---------- ПУЛЬТ ХОДА ---------- */
  var hud = (function () {
    var open = false;
    function show() {
      if (!el.hud) return;
      open = true;
      el.hud.classList.add('on');
      el.hud.setAttribute('aria-hidden', 'false');
      renderFunnel();
    }
    function hide() {
      if (!el.hud) return;
      open = false;
      el.hud.classList.remove('on');
      el.hud.setAttribute('aria-hidden', 'true');
    }
    var cells = [];
    function renderFunnel() {
      if (!el.hudFunnel) return;
      el.hudFunnel.innerHTML = '';
      cells = [];
      for (var i = 0; i < 17; i++) {
        var b = document.createElement('b');
        var i2 = document.createElement('i');
        b.appendChild(i2);
        el.hudFunnel.appendChild(b);
        cells.push(b);
      }
    }
    function update(o) {
      if (!open || !el.hudQ) return;
      el.hudQ.textContent = 'ВОПРОС ' + String(o.q).padStart(2, '0') + '/' + o.total;
      el.hudRem.textContent = U.plain(TERM.nb(o.rem));
      el.hudRem.classList.remove('flip'); void el.hudRem.offsetWidth; el.hudRem.classList.add('flip');
      el.hudCap.textContent = o.rem > 1 ? 'вариантов в живых' : 'вариант — это ответ';
      var lg2 = Math.log(100000) / Math.LN2;
      var pct = Math.log(Math.max(1, o.rem)) / Math.LN2 / lg2 * 100;
      el.hudBar.style.width = Math.max(2, Math.min(100, pct)).toFixed(1) + '%';
      el.hudRange.textContent = TERM.nb(o.lo) + ' … ' + TERM.nb(o.hi);
      for (var i = 0; i < cells.length; i++) {
        if (i < o.q - 1) cells[i].classList.remove('cur');
        cells[i].querySelector('i').style.height = i < o.q
          ? Math.max(3, Math.log(Math.max(1, 100000 / Math.pow(2, i))) / Math.LN2 / lg2 * 100).toFixed(0) + '%'
          : '0%';
      }
      if (cells[o.q - 1]) cells[o.q - 1].classList.add('cur');
      el.hudNote.textContent = 'Каждый ответ ДА или НЕТ убивает половину поля. Шкала — логарифмическая: видно, как быстро падает остаток.';
    }
    return { show: show, hide: hide, update: update };
  })();
  TERM.hud = hud;

  /* ---------- Выбор: компактная карточка, экран не закрывает ---------- */
  function askRaw(spec) {
    return new Promise(function (res) {
      st.choiceOpen = true;
      var card = el.askCard, box = el.askOpts;
      el.askKicker.textContent = spec.kicker || 'АБОНЕНТ ЖДЁТ ОТВЕТА';
      el.askPrompt.textContent = spec.prompt || '';
      box.innerHTML = '';
      card.classList.toggle('c-row', !!spec.row);
      var btns = [];
      spec.opts.forEach(function (o, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'ask-opt' + (o.dim ? ' ask-opt--dim' : '');
        b.innerHTML = '<span class="n">' + String(i + 1).padStart(2, '0') + '</span><span class="t">' + o.t + '</span>';
        b.addEventListener('click', function () { pick(i); });
        box.appendChild(b);
        btns.push(b);
      });
      st.keyboardMap = btns;
      card.classList.add('on');
      card.setAttribute('aria-hidden', 'false');
      document.body.classList.add('choice-open');
      scroll();   /* хвост ленты поднимается над карточкой (запас снизу) */
      function pick(i) {
        if (!st.choiceOpen) return;
        st.choiceOpen = false;
        st.keyboardMap = [];
        TERM.sfx.click();
        card.classList.remove('on');
        card.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('choice-open');
        setTimeout(function () { if (!st.choiceOpen) box.innerHTML = ''; }, 380);
        res(i);
      }
    });
  }

  /* Выбор с драматургией ошибок */
  async function choice(spec) {
    var attempts = 0;
    var prompt = spec.prompt;
    for (;;) {
      var idx = await askRaw({ prompt: prompt, opts: spec.opts, row: spec.row });
      var o = spec.opts[idx];
      if (spec.echo !== false) instant('ln--me', 'ВЫ', o.t);
      if (o.ok) return;
      if (o.flavor != null) {
        await wait(U.rnd(700, 1400));
        await sayAb(o.flavor);
        if (o.formula) frame(o.formula);
        if (o.retryPrompt) prompt = o.retryPrompt;
        continue;
      }
      attempts++;
      await wait(U.rnd(700, 1400));
      await sayAb(o.wrong || 'Не то. Попробуйте ещё раз — внимательно.');
      if (o.formula) frame(o.formula);
      if (attempts >= 3 && spec.fail) {
        var okOpt = spec.opts.find(function (x) { return x.ok; });
        await sayMach(spec.fail);
        if (spec.echo !== false && okOpt) instant('ln--me', 'ВЫ', okOpt.t);
        return;
      }
      if (o.retry) prompt = o.retry;
      await wait(700);
    }
  }

  function sayAb(text) {
    var l = line('ln--ab', 'АБОНЕНТ');
    return type(l, text, 27);
  }
  function sayMach(text) {
    var l = line('ln--mach', 'СИСТЕМА');
    return type(l, text, 17);
  }

  /* Крупное слово: кинетический момент + строка-эхо в ленту */
  async function bigMoment(text) {
    await TERM.kinetic.big(text);
    var words = String(text).trim().split(/\s+/);
    var acc = words.length > 1 ? words[words.length - 1] : '';
    var l = line('ln--big', '');
    var i = acc ? text.lastIndexOf(acc) : -1;
    var html = i >= 0
      ? U.mk(text.slice(0, i)) + '<span class="acc">' + U.mk(text.slice(i, i + acc.length)) + '</span>' + U.mk(text.slice(i + acc.length))
      : U.mk(text);
    l.txt.innerHTML = html;
    scroll();
  }

  var api = {
    feed: function () { return el.feed; },
    scroll: scroll,
    forceScroll: forceScroll,
    sayAb: sayAb,
    sayMach: sayMach,
    sys: function (t) { instant('ln--sys', '', t); },
    err: function (t) { instant('ln--err', '', t); },
    me: function (t) { instant('ln--me', 'ВЫ', t); },
    big: bigMoment,
    frame: function (spec, cont) { return frame(spec, cont); },
    wait: wait,
    askRaw: askRaw,
    isSkip: function () { return st.skip; },
    clearSkip: consumeSkip,
    line: line,
    U: U
  };
  TERM.api = api;

  async function playBeat(b, tok) {
    if (tok !== st.token) return;
    if (b.sys != null) { instant('ln--sys', '', b.sys); return; }
    if (b.err != null) { instant('ln--err', '', b.err); return; }
    if (b.me != null) { instant('ln--me', 'ВЫ', b.me); return; }
    if (b.glitch) { await glitchFx(); return; }
    if (b.clear) { await crtClear(); return; }
    if (b.pause) { await wait(b.pause); return; }
    if (b.ab != null) {
      thinking();
      await wait(U.rnd(650, 1400));
      if (tok !== st.token) return;
      stopThinking();
      var l1 = line('ln--ab', 'АБОНЕНТ');
      await type(l1, b.ab, 27);
      return;
    }
    if (b.say != null) { await sayMach(b.say); return; }
    if (b.big != null) { await bigMoment(b.big); return; }
    if (b.f != null) { frame(b.f); await wait(900); return; }
    if (b.anim) {
      var box = document.createElement('div');
      box.className = 'blk blk--viz';
      el.inner.appendChild(box);
      scroll();
      await new Promise(function (res) { b.anim(box, api, res); });
      /* статус-контейнеры без содержимого (например, игра — статус в HUD) не оставляем */
      if (!box.firstChild) box.remove();
      await wait(500);
      return;
    }
    if (b.choice) { await choice(b.choice); return; }
    if (b.ask) { var i2 = await askRaw(b.ask); if (b.ask.onPick) b.ask.onPick(i2); return; }
  }

  async function runSession(i) {
    i = U.clamp(i, 0, eps.length - 1);
    st.cur = i;
    st.token++;
    var tok = st.token;
    save();
    renderHeader();
    renderMenu();
    st.choiceOpen = false;
    st.keyboardMap = [];
    setPaused(false);
    document.body.classList.remove('choice-open');
    if (el.askCard) {
      el.askCard.classList.remove('on');
      el.askCard.setAttribute('aria-hidden', 'true');
      el.askOpts.innerHTML = '';
    }
    hud.hide();
    if (TERM.kinetic._cancel) TERM.kinetic._cancel();
    await crtClear();
    if (tok !== st.token) return;
    var ep = eps[i];
    TERM.kinetic.titleCard(ep.label, ep.title);
    for (var bi = 0; bi < ep.beats.length; bi++) {
      if (tok !== st.token) return;
      try { await playBeat(ep.beats[bi], tok); }
      catch (e) { console.error('[beat]', bi, e); }
    }
  }
  TERM.runSession = runSession;
  TERM.cur = function () { return st.cur; };

  /* ---------- Шапка, прогресс, меню ---------- */
  function renderHeader() {
    var ep = eps[st.cur];
    el.sess.textContent = ep.label + ' · ' + ep.title;
    var pr = el.progress;
    pr.innerHTML = '';
    for (var i = 0; i < eps.length; i++) {
      var seg = document.createElement('i');
      if (eps[i].bonus) seg.className = 'lab';
      if (st.started && i <= st.cur) seg.classList.add('on');
      seg.title = eps[i].label;
      pr.appendChild(seg);
    }
  }

  function renderMenu() {
    var pop = el.menu;
    pop.innerHTML = '';
    eps.forEach(function (ep, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'mi';
      b.setAttribute('aria-current', String(i === st.cur));
      b.innerHTML = '<span class="n">' + ep.label + '</span><span>' + ep.title + '</span>';
      b.addEventListener('click', function () {
        pop.hidden = true;
        el.menuBtn.setAttribute('aria-expanded', 'false');
        runSession(i);
      });
      pop.appendChild(b);
    });
  }

  /* ---------- Загрузка ЭВМ ---------- */
  var bootSkip = false;
  async function bootSeq() {
    var pre = document.getElementById('bootLines');
    var logo = document.getElementById('bootLogo');
    var bar = document.getElementById('bootBar');
    /* Логотип: АП-2, «2» — рубином */
    var word = 'АП-2';
    for (var li = 0; li < word.length; li++) {
      var s = document.createElement('span');
      s.className = 'bl' + (li === word.length - 1 ? ' acc' : '');
      s.textContent = word[li];
      s.style.setProperty('--d', (0.08 + li * 0.09).toFixed(2) + 's');
      logo.appendChild(s);
    }
    var brand = document.createElement('div');
    brand.className = 'boot-brand';
    brand.textContent = 'ДИСПЛЕЙНЫЙ КОМПЛЕКС «РУБИН» · БЭСМ-6';
    logo.parentNode.insertBefore(brand, logo.nextSibling);
    var rows = [
      'АБОНЕНТСКИЙ ПУНКТ АП-2 · ЛИНИЯ 07 · КАНАЛ 3',
      '',
      'ТЕСТ ЭЛТ ............. [[ok:НОРМА]]',
      'ТЕСТ ЛИНИИ ........... [[ok:НОРМА]]',
      'ТЕЛЕТАЙП ............. [[ok:ГОТОВ]]',
      'ПОИСК АБОНЕНТА ....... [[err:НЕ ОПОЗНАН]]',
      'ВХОДЯЩАЯ ПЕРЕДАЧА .... [[amb:03:17]]'
    ];
    var saved = load();
    if (saved && saved.e >= 0 && saved.e < eps.length) {
      rows.push('АРХИВ СЕАНСОВ ........ [[ok:ЕСТЬ]]');
    }
    for (var i = 0; i < rows.length; i++) {
      var div = document.createElement('div');
      div.innerHTML = U.mk(rows[i]);
      pre.appendChild(div);
      bar.style.width = ((i + 1) / rows.length * 100).toFixed(0) + '%';
      if (!bootSkip) await new Promise(function (r) { setTimeout(r, 150); });
    }
    if (!bootSkip) {
      await new Promise(function (r) { setTimeout(r, 600); });
    }
    TERM.sfx.modem();
    var boot = el.boot;
    boot.classList.add('boot--off');
    await new Promise(function (r) { setTimeout(r, 460); });
    boot.hidden = true;
  }

  TERM.boot = async function () {
    el = {
      boot: document.getElementById('boot'),
      feed: document.getElementById('feed'),
      inner: null,
      deck: document.getElementById('deck'),
      askCard: document.getElementById('askCard'),
      askKicker: document.getElementById('askKicker'),
      askPrompt: document.getElementById('askPrompt'),
      askOpts: document.getElementById('askOpts'),
      btnPause: document.getElementById('btnPause'),
      sess: document.getElementById('sessLabel'),
      progress: document.getElementById('sessProgress'),
      menu: document.getElementById('menuPop'),
      menuBtn: document.getElementById('btnMenu'),
      fx: document.getElementById('fx'),
      crt: document.getElementById('crt'),
      hud: document.getElementById('hud'),
      hudQ: document.getElementById('hudQ'),
      hudRem: document.getElementById('hudRem'),
      hudCap: document.getElementById('hudCap'),
      hudBar: document.getElementById('hudBar'),
      hudRange: document.getElementById('hudRange'),
      hudFunnel: document.getElementById('hudFunnel'),
      hudNote: document.getElementById('hudNote'),
      pill: document.getElementById('newPill'),
      count: document.getElementById('newCount'),
      linkDot: document.getElementById('linkDot')
    };
    /* внутренняя колонка ленты */
    el.inner = document.createElement('div');
    el.inner.id = 'feed-inner';
    el.feed.appendChild(el.inner);

    TERM.bg.init();
    TERM.trans.init();
    TERM.kinetic.init();

    /* клавиатура: цифры — выбор, пробел/Enter — ускорить печать, P — пауза */
    document.addEventListener('keydown', function (e) {
      if (e.code === 'KeyP' && st.started) { e.preventDefault(); setPaused(!st.paused); return; }
      if (e.key === ' ') {
        e.preventDefault();
        if (st.paused) { setPaused(false); st.skip = false; return; }  /* пробел снимает паузу */
        st.skip = true; bootSkip = true; return;
      }
      if (e.key === 'Enter') {
        if (st.paused) { setPaused(false); st.skip = false; return; }
        st.skip = true; bootSkip = true; return;
      }
      var n = parseInt(e.key, 10);
      if (n >= 1 && n <= 9 && st.keyboardMap && st.keyboardMap[n - 1]) {
        st.keyboardMap[n - 1].click();
      }
    });
    el.btnPause.addEventListener('click', function () { setPaused(!st.paused); });
    el.feed.addEventListener('click', function () { st.skip = true; });
    el.feed.addEventListener('scroll', onScroll, { passive: true });
    el.pill.addEventListener('click', forceScroll);

    el.menuBtn.addEventListener('click', function () {
      el.menu.hidden = !el.menu.hidden;
      el.menuBtn.setAttribute('aria-expanded', String(!el.menu.hidden));
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#menuPop') && !e.target.closest('#btnMenu')) {
        el.menu.hidden = true;
        el.menuBtn.setAttribute('aria-expanded', 'false');
      }
    });
    document.getElementById('btnPrevEp').addEventListener('click', function () { if (st.started) runSession(st.cur - 1); });
    document.getElementById('btnNextEp').addEventListener('click', function () { if (st.started) runSession(st.cur + 1); });
    document.getElementById('btnRestart').addEventListener('click', function () { if (st.started) runSession(st.cur); });

    var sndBtn = document.getElementById('btnSound');
    sndBtn.setAttribute('aria-pressed', TERM.sfx.enabled ? 'true' : 'false');
    sndBtn.classList.toggle('tbtn--on', TERM.sfx.enabled);
    sndBtn.addEventListener('click', function () {
      var v = !TERM.sfx.enabled;
      TERM.sfx.setEnabled(v);
      sndBtn.setAttribute('aria-pressed', v ? 'true' : 'false');
    });

    renderMenu();
    await bootSeq();
    st.started = true;
    var saved = load();
    var start = (saved && saved.e >= 0 && saved.e < eps.length) ? saved.e : 0;
    runSession(start);
  };
})();
