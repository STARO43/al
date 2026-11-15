'use strict';
/* ============================================================
   LOGARITHM · АП-2 — движок терминальной переписки.
   Советская ЭВМ, ЭЛТ-терминал, неизвестный абонент.
   Типы битов сеанса:
     {sys} система мгновенно   {say} машина печатает   {ab} абонент печатает
     {me} реплика пользователя {big} крупная строка    {err} ошибка линии
     {f} рамка с формулой      {anim} ASCII-анимация   {pause} пауза
     {clear} очистка экрана    {glitch} помехи         {choice} выбор с разбором ошибок
   Ответ пользователя — всегда выбор из вариантов.
   ============================================================ */
window.TERM = window.TERM || {};

(function () {
  var U = {
    clamp: function (v, a, b) { return Math.max(a, Math.min(b, v)); },
    rnd: function (a, b) { return a + Math.random() * (b - a); },
    repeat: function (s, n) { return new Array(Math.max(0, Math.round(n)) + 1).join(s); },
    /* ширина строки без разметки */
    plain: function (s) { return String(s).replace(/\[\[(?:amb|ok|dim|err):([^\]]*)\]\]/g, '$1'); },
    /* разметка [[ok:...]] -> span */
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
    skip: false,            // «ускорить» текущую печать/паузу
    choiceOpen: false
  };

  function save() {
    try { localStorage.setItem('termlog.progress.v1', JSON.stringify({ e: st.cur })); } catch (e) {}
  }
  function load() {
    try { return JSON.parse(localStorage.getItem('termlog.progress.v1') || 'null'); } catch (e) { return null; }
  }

  function scroll() {
    var f = el.feed;
    if (f) f.scrollTop = f.scrollHeight;
  }
  TERM.scroll = scroll;

  function line(cls, who) {
    var root = document.createElement('div');
    root.className = 'ln ' + cls;
    var html = '';
    if (who) html += '<span class="who">' + who + ' ▸ </span>';
    html += '<span class="txt"></span>';
    root.innerHTML = html;
    el.feed.appendChild(root);
    scroll();
    var txt = root.querySelector('.txt');
    return { root: root, txt: txt };
  }

  function instant(cls, who, text) {
    var l = line(cls, who);
    l.txt.textContent = text;
    scroll();
    return l;
  }

  function consumeSkip() { var s = st.skip; st.skip = false; return s; }

  /* печать с эффектом телетайпа */
  function type(l, text, speed) {
    return new Promise(function (res) {
      if (typeof text !== 'string') text = String(text);
      var caret = document.createElement('span');
      caret.className = 'caret';
      l.root.appendChild(caret);
      l.txt.textContent = '';
      function finish() {
        l.txt.textContent = text;
        caret.remove();
        scroll();
        res();
      }
      if (consumeSkip()) { finish(); return; }
      var i = 0;
      var chunk = speed <= 8 ? 2 : 1;
      (function tick() {
        if (consumeSkip()) { finish(); return; }
        i += chunk;
        if (i >= text.length) { finish(); return; }
        l.txt.textContent = text.slice(0, i);
        scroll();
        setTimeout(tick, speed);
      })();
    });
  }

  function wait(ms) {
    return new Promise(function (res) {
      if (consumeSkip()) { res(); return; }
      var t0 = performance.now();
      (function chk() {
        if (st.skip || performance.now() - t0 >= ms) { consumeSkip(); res(); return; }
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

  /* ---------- Рамки с формулами ---------- */
  function frame(spec, cont) {
    var arr = Array.isArray(spec) ? spec : spec.l;
    var title = Array.isArray(spec) ? '' : (spec.t || '');
    var inner = [];
    if (title) inner.push(title);
    arr.forEach(function (s) { inner.push(s); });
    var w = 0;
    inner.forEach(function (s) { w = Math.max(w, U.visLen(s)); });
    w = Math.min(w, 70) + 2;
    var out = ['┌' + U.repeat('─', w) + '┐'];
    inner.forEach(function (s) { out.push('│ ' + U.pad(s, w - 2) + ' │'); });
    out.push('└' + U.repeat('─', w) + '┘');
    var pre = document.createElement('pre');
    pre.className = 'blk blk--frame';
    pre.innerHTML = U.mk(out.join('\n'));
    (cont || el.feed).appendChild(pre);
    scroll();
    return pre;
  }

  /* ---------- Оверлей эффектов ---------- */
  function crtClear() {
    return new Promise(function (res) {
      var fx = el.fx;
      fx.className = 'on';
      fx.innerHTML = '<div class="scan"></div>';
      var scan = fx.firstChild;
      var t0 = performance.now();
      (function mv() {
        var p = (performance.now() - t0) / 380;
        if (p >= 1) {
          fx.className = ''; fx.innerHTML = '';
          el.feed.innerHTML = '';
          scroll();
          res();
          return;
        }
        scan.style.top = (p * 100) + '%';
        requestAnimationFrame(mv);
      })();
    });
  }

  async function glitchFx() {
    var fx = el.fx;
    fx.className = 'on noise';
    var chars = '▓▒░█▄▀╬╪╫╗╔╠╣▚▞░▒▓';
    var s = '';
    for (var i = 0; i < 90; i++) s += chars[Math.floor(Math.random() * chars.length)];
    var l = instant('ln--err', '', s);
    await wait(340);
    l.root.remove();
    fx.className = '';
    scroll();
  }

  /* ---------- Выборы ---------- */
  function askRaw(spec) {
    return new Promise(function (res) {
      var prompt = el.prompt, box = el.choices;
      st.choiceOpen = true;
      prompt.hidden = !spec.prompt;
      prompt.textContent = spec.prompt || '';
      box.innerHTML = '';
      box.classList.toggle('c-row', !!spec.row);
      var btns = [];
      spec.opts.forEach(function (o, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'chc' + (o.dim ? ' chc--dim' : '');
        b.innerHTML = '<span class="key">[' + (i + 1) + ']</span>' + o.t;
        b.addEventListener('click', function () { pick(i); });
        box.appendChild(b);
        btns.push(b);
      });
      st.keyboardMap = btns;
      scroll();
      function pick(i) {
        if (!st.choiceOpen) return;
        st.choiceOpen = false;
        st.keyboardMap = [];
        prompt.hidden = true;
        box.innerHTML = '';
        res(i);
      }
    });
  }

  /* выбор с драматургией ошибок: wrong → реплика абонента → вопрос заново;
     flavor → реплика без счёта ошибок; после 3 промахов — fail-разбор и автоответ */
  async function choice(spec) {
    var attempts = 0;
    var prompt = spec.prompt;
    for (;;) {
      var idx = await askRaw({ prompt: prompt, opts: spec.opts, row: spec.row });
      var o = spec.opts[idx];
      if (spec.echo !== false) instant('ln--me', 'ВЫ', o.t);
      if (o.ok) return;
      if (o.flavor != null) {
        await wait(U.rnd(420, 900));
        await sayAb(o.flavor);
        if (o.formula) frame(o.formula);
        if (o.retryPrompt) prompt = o.retryPrompt;
        continue;
      }
      attempts++;
      await wait(U.rnd(420, 900));
      await sayAb(o.wrong || 'Не то. Попробуйте ещё раз — внимательно.');
      if (o.formula) frame(o.formula);
      if (attempts >= 3 && spec.fail) {
        var okOpt = spec.opts.find(function (x) { return x.ok; });
        await sayMach(spec.fail);
        if (spec.echo !== false && okOpt) instant('ln--me', 'ВЫ', okOpt.t);
        return;
      }
      if (o.retry) prompt = o.retry;
      await wait(420);
    }
  }

  function sayAb(text) {
    var l = line('ln--ab', 'АБОНЕНТ');
    return type(l, text, 15);
  }
  function sayMach(text) {
    var l = line('ln--mach', 'СИСТЕМА');
    return type(l, text, 9);
  }

  /* ---------- API для анимаций ---------- */
  var api = {
    feed: function () { return el.feed; },
    scroll: scroll,
    sayAb: sayAb,
    sayMach: sayMach,
    sys: function (t) { instant('ln--sys', '', t); },
    err: function (t) { instant('ln--err', '', t); },
    me: function (t) { instant('ln--me', 'ВЫ', t); },
    big: async function (t) { var l = line('ln--big', ''); await type(l, t, 22); },
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
    if (b.sys != null) { instant('ln--sys' + (b.center ? ' center' : ''), '', b.sys); return; }
    if (b.err != null) { instant('ln--err', '', b.err); return; }
    if (b.me != null) { instant('ln--me', 'ВЫ', b.me); return; }
    if (b.glitch) { await glitchFx(); return; }
    if (b.clear) { await crtClear(); return; }
    if (b.pause) { await wait(b.pause); return; }
    if (b.ab != null) {
      thinking();
      await wait(U.rnd(380, 950));
      if (tok !== st.token) return;
      stopThinking();
      var l1 = line('ln--ab', 'АБОНЕНТ');
      await type(l1, b.ab, 15);
      return;
    }
    if (b.say != null) { await sayMach(b.say); return; }
    if (b.big != null) { await api.big(b.big); return; }
    if (b.f != null) { frame(b.f); await wait(600); return; }
    if (b.anim) {
      var box = document.createElement('pre');
      box.className = 'blk blk--anim';
      el.feed.appendChild(box);
      scroll();
      await new Promise(function (res) { b.anim(box, api, res); });
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
    el.prompt.hidden = true;
    el.choices.innerHTML = '';
    st.choiceOpen = false;
    await crtClear();
    var ep = eps[i];
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
  async function bootSeq() {
    var pre = document.getElementById('bootLines');
    var rows = [
      'БЭСМ-6 · ДИСПЛЕЙНЫЙ КОМПЛЕКС «РУБИН»',
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
      await new Promise(function (r) { setTimeout(r, 130); });
    }
    await new Promise(function (r) { setTimeout(r, 550); });
    var boot = el.boot;
    boot.classList.add('boot--off');
    await new Promise(function (r) { setTimeout(r, 460); });
    boot.hidden = true;
  }

  TERM.boot = async function () {
    el = {
      boot: document.getElementById('boot'),
      feed: document.getElementById('feed'),
      deck: document.getElementById('deck'),
      prompt: document.getElementById('choicePrompt'),
      choices: document.getElementById('choices'),
      sess: document.getElementById('sessLabel'),
      progress: document.getElementById('sessProgress'),
      menu: document.getElementById('menuPop'),
      menuBtn: document.getElementById('btnMenu'),
      fx: document.getElementById('fx'),
      linkDot: document.getElementById('linkDot')
    };

    /* клавиатура: цифры — выбор, пробел/Enter — ускорить печать */
    document.addEventListener('keydown', function (e) {
      if (e.key === ' ') { e.preventDefault(); st.skip = true; return; }
      if (e.key === 'Enter') { st.skip = true; return; }
      var n = parseInt(e.key, 10);
      if (n >= 1 && n <= 9 && st.keyboardMap && st.keyboardMap[n - 1]) {
        st.keyboardMap[n - 1].click();
      }
    });
    el.feed.addEventListener('click', function () { st.skip = true; });

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

    renderMenu();
    await bootSeq();
    st.started = true;
    var saved = load();
    var start = (saved && saved.e >= 0 && saved.e < eps.length) ? saved.e : 0;
    runSession(start);
  };
})();
