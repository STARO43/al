'use strict';
/* ============================================================
   LOGARITHM — ядро: утилиты, формулы, фон, движок эпизодов.
   Глобальное пространство имён LOG (классические скрипты —
   работает и с file://, и с GitHub Pages).
   ============================================================ */
window.LOG = window.LOG || {};

(function () {
  var U = {
    el: function (tag, cls, html) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (html != null) e.innerHTML = html;
      return e;
    },
    $: function (id) { return document.getElementById(id); },
    NBSP: '\u00A0',
    /* 1000000 -> "1 000 000" */
    fmtInt: function (n) {
      var neg = n < 0; n = Math.abs(Math.round(n));
      var s = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, U.NBSP);
      return (neg ? '\u2212' : '') + s;
    },
    /* 19.9315686 -> "19,93" */
    fmtDec: function (x, d) {
      if (d == null) d = 2;
      var s = x.toFixed(d);
      if (d > 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
      return s.replace('.', ',');
    },
    fmtSigned: function (n) { return (n < 0 ? '\u2212' : '') + U.fmtInt(Math.abs(n)); },
    fmtMoney: function (n) { return U.fmtInt(Math.round(n)) + U.NBSP + '₽'; },
    /* "3", "-3", "0,5", "1/2" -> число или NaN */
    parseNum: function (s) {
      if (typeof s !== 'string') return NaN;
      s = s.trim().replace(/,/g, '.').replace(/\s+/g, '');
      var m = s.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
      if (m) { var a = +m[1], b = +m[2]; return b === 0 ? NaN : a / b; }
      if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
      return parseFloat(s);
    },
    clamp: function (v, a, b) { return Math.max(a, Math.min(b, v)); },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    esc: function (s) {
      return String(s).replace(/[&<>"]/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
      });
    },
    sup: function (t) { return '<sup>' + t + '</sup>'; },
    sub: function (t) { return '<sub>' + t + '</sub>'; }
  };
  LOG.U = U;

  /* Цветовая система формул: a — синий, b — оранжевый, x — фиолетовый, результат — салатовый */
  var F = {
    base: function (t) { return '<span class="c-base">' + t + '</span>'; },
    arg: function (t) { return '<span class="c-arg">' + t + '</span>'; },
    exp: function (t) { return '<span class="c-exp">' + t + '</span>'; },
    res: function (t) { return '<span class="c-res">' + t + '</span>'; },
    pow: function (a, x) { return F.base(a) + '<sup>' + F.exp(x) + '</sup>'; },
    log: function (a, b) { return 'log' + U.sub(F.base(a)) + F.arg(b); },
    eq: '\u00A0=\u00A0',
    fraq: function (num, den) { return '<span class="fraq"><b>' + num + '</b>' + den + '</span>'; }
  };
  LOG.F = F;

  /* ------- Движение: уважение к prefers-reduced-motion ------- */
  LOG.motion = {
    reduced: !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  };
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    var onMq = function () { LOG.motion.reduced = mq.matches; };
    if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
  }

  /* ------- Единый rAF-драйвер: пауза вне видимой вкладки ------- */
  LOG.loops = (function () {
    var items = new Set(), running = false, raf = 0, last = 0;
    function tick(t) {
      raf = requestAnimationFrame(tick);
      var dt = Math.min(50, t - last || 16); last = t;
      items.forEach(function (fn) {
        try { fn(dt, t); } catch (e) { console.error('[loop]', e); items.delete(fn); }
      });
      if (!items.size) { stop(); }
    }
    function start() {
      if (running || LOG.motion.reduced || document.hidden || !items.size) return;
      running = true; last = performance.now(); raf = requestAnimationFrame(tick);
    }
    function stop() { running = false; cancelAnimationFrame(raf); }
    function add(fn) { items.add(fn); start(); return fn; }
    function remove(fn) { items.delete(fn); if (!items.size) stop(); }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });
    return { add: add, remove: remove, start: start, get size() { return items.size; } };
  })();

  /* ------- Пересчет размеров канвасов ------- */
  LOG.resizers = new Set();
  window.addEventListener('resize', function () { LOG.resizers.forEach(function (f) { try { f(); } catch (e) {} }); });
  window.addEventListener('orientationchange', function () { setTimeout(function () { LOG.resizers.forEach(function (f) { try { f(); } catch (e) {} }); }, 150); });

  /* ------- Хелпер канваса сцены ------- */
  LOG.canvas = function (box, opts) {
    opts = opts || {};
    var cv = U.el('canvas', 'scene-canvas');
    cv.setAttribute('aria-hidden', 'true');
    cv.setAttribute('role', 'img');
    if (opts.alt) cv.setAttribute('aria-label', opts.alt);
    box.appendChild(cv);
    var ctx = cv.getContext('2d');
    var st = { cv: cv, ctx: ctx, w: 0, h: 0, dpr: 1, draw: null, height: opts.height || 300 };
    function resize() {
      var w = box.clientWidth || 600;
      var h = typeof st.height === 'function' ? st.height(w) : st.height;
      st.dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.style.width = w + 'px';
      cv.style.height = h + 'px';
      cv.width = Math.max(1, Math.round(w * st.dpr));
      cv.height = Math.max(1, Math.round(h * st.dpr));
      st.w = w; st.h = h;
      ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
      if (st.draw) st.draw();
    }
    st.resize = resize;
    st.off = function () { LOG.resizers.delete(resize); };
    resize();
    LOG.resizers.add(resize);
    return st;
  };

  /* ------- Мягкое зерно ------- */
  function addGrain() {
    if (LOG.motion.reduced) return;
    document.body.appendChild(U.el('div', 'grain'));
  }

  /* ------- Настройки ------- */
  LOG.settings = { voiceOn: true, subs: true, rate: 1, voiceURI: '' };
  function loadSettings() {
    try {
      var s = JSON.parse(localStorage.getItem('logarithm.settings.v1') || 'null');
      if (s) Object.assign(LOG.settings, s);
    } catch (e) {}
  }
  function saveSettings() {
    try { localStorage.setItem('logarithm.settings.v1', JSON.stringify(LOG.settings)); } catch (e) {}
  }
  LOG.saveSettings = saveSettings;

  /* ------- Субтитры ------- */
  LOG.subtitle = {
    el: null,
    init: function () { this.el = U.$('subtitle'); },
    show: function (t) {
      if (!this.el) return;
      if (!LOG.settings.subs) return;
      this.el.innerHTML = t;
      this.el.hidden = false;
    },
    hide: function () { if (this.el) this.el.hidden = true; }
  };

  /* ==================== ДВИЖОК ЭПИЗОДОВ ==================== */
  var engine = {
    eps: [], cur: -1, step: 0,
    unlocked: true,
    cleanups: [],
    els: {},
    started: false
  };

  engine.register = function (ep) {
    ep.label = ep.label || ('ЭПИЗОД ' + String(engine.eps.length + 1).padStart(2, '0'));
    engine.eps.push(ep);
  };

  function runCleanups() {
    engine.cleanups.forEach(function (f) { try { f(); } catch (e) {} });
    engine.cleanups = [];
  }

  function cleanupAll() {
    runCleanups();
    LOG.loops.start(); // пересмотреть драйвер после удаления колбэков
  }

  engine.currentStep = function () {
    var ep = engine.eps[engine.cur];
    return ep ? ep.steps[engine.step] : null;
  };
  engine.currentStepText = function () {
    var st = engine.currentStep();
    return st && st.text ? st.text : '';
  };

  engine.allowNext = function (v, hint) {
    engine.unlocked = !!v;
    var b = engine.els.btnNext;
    if (b) b.setAttribute('aria-disabled', String(!v));
    if (!v && hint) LOG.subtitle.show(hint);
  };
  engine.setNextLabel = function (t) {
    var b = engine.els.btnNext;
    if (!b) return;
    t = String(t).replace(/\s*→\s*$/, ''); // стрелка добавляется единым элементом
    b.innerHTML = U.esc(t) + '<span class="dock__lbl">→</span>';
  };

  /* ------------------ Рендер шага ------------------ */
  engine.render = function () {
    cleanupAll();
    var ep = engine.eps[engine.cur];
    var st = ep.steps[engine.step];
    var stage = engine.els.stage;

    var sec = U.el('section', 'episode');
    sec.setAttribute('aria-label', ep.label + ' — ' + ep.title);
    sec.appendChild(U.el('p', 'episode__kicker', ep.label));
    var h2 = U.el('h2', 'episode__title', ep.title);
    sec.appendChild(h2);

    var box = U.el('div', 'step');
    sec.appendChild(box);

    stage.innerHTML = '';
    stage.appendChild(sec);

    if (st.text) {
      var det = U.el('details', 'scene-text');
      det.appendChild(U.el('summary', null, 'Текст сцены (для чтения)'));
      det.appendChild(U.el('p', null, st.text));
      sec.appendChild(det);
    }

    engine.unlocked = !st.lock;
    engine.els.btnNext.setAttribute('aria-disabled', String(!engine.unlocked));
    engine.setNextLabel(st.nextLabel || 'Дальше');

    var api = {
      stage: box,
      done: function (hint) { engine.allowNext(true); if (hint) LOG.subtitle.show(hint); },
      lock: function (hint) { engine.allowNext(false, hint); },
      setNextLabel: function (t) { engine.setNextLabel(t); },
      cleanup: function (fn) { engine.cleanups.push(fn); },
      loop: function (fn) { var h = LOG.loops.add(fn); engine.cleanups.push(function () { LOG.loops.remove(h); }); return h; },
      speak: function (t) { LOG.voice.say(t); }
    };

    try { st.build(box, api); }
    catch (e) {
      console.error('[step build]', e);
      box.appendChild(U.el('p', 'feedback feedback--err', 'Ошибка загрузки сцены — подробности в консоли.'));
    }

    document.title = 'LOGARITHM — ' + ep.title;
    engine.els.epIndicator.textContent = ep.label + ' · ' + ep.title;
    renderProgress();
    renderMenuState();

    window.scrollTo(0, 0);
    engine.save();

    /* Озвучка шага: голосом (если включена) или субтитры целиком */
    LOG.voice.stop();
    LOG.subtitle.hide();
    if (st.text) {
      if (LOG.settings.voiceOn && LOG.voice.supported() && LOG.voice.canSpeak()) {
        LOG.voice.say(st.text);
      } else if (LOG.settings.subs) {
        LOG.subtitle.show(st.text);
      }
    }
  };

  function renderProgress() {
    var total = engine.eps.filter(function (e) { return !e.bonus; }).length;
    var wrap = engine.els.progress;
    wrap.innerHTML = '';
    var ep = engine.eps[engine.cur];
    for (var i = 0; i < total; i++) {
      var seg = U.el('i');
      var fill = 0;
      if (engine.started) {
        if (engine.cur > i) fill = 1;
        else if (engine.cur === i) fill = ep.bonus ? 0 : (engine.step + 1) / ep.steps.length;
      }
      seg.style.setProperty('--fill', fill.toFixed(3));
      wrap.appendChild(seg);
    }
    var pct = 0;
    if (engine.started && !ep.bonus) {
      pct = Math.round(((engine.cur + (engine.step + 1) / ep.steps.length) / total) * 100);
    }
    wrap.setAttribute('aria-valuenow', String(pct));
    var lab = engine.eps.find(function (e) { return e.bonus; });
    if (lab) {
      var lastSeg = U.el('i');
      lastSeg.style.setProperty('--fill', engine.started && ep.bonus ? '1' : '0');
      lastSeg.title = 'Тренажёр';
      wrap.appendChild(lastSeg);
    }
  }

  function renderMenuState() {
    var btns = engine.els.epMenuList.querySelectorAll('.pop__item');
    btns.forEach(function (b, i) {
      b.setAttribute('aria-current', String(i === engine.cur));
    });
  }

  /* ------------------ Навигация ------------------ */
  engine.goTo = function (i, s, useFx) {
    i = U.clamp(i, 0, engine.eps.length - 1);
    var ep = engine.eps[i];
    s = U.clamp(s == null ? 0 : s, 0, ep.steps.length - 1);
    var isEpisodeSwitch = i !== engine.cur;
    if (engine.cur === -1) engine.started = true;
    engine.cur = i; engine.step = s;
    if (isEpisodeSwitch && useFx !== false && !LOG.motion.reduced) {
      LOG.fx.play(function () { engine.render(); });
    } else {
      if (engine.started) engine.els.stage.classList.add('stage--swap');
      engine.render();
      setTimeout(function () { engine.els.stage.classList.remove('stage--swap'); }, 450);
    }
  };

  engine.next = function () {
    if (!engine.started || engine.cur < 0) return; // док неактивен до закрытия интро
    if (!engine.unlocked) {
      var b = engine.els.btnNext;
      b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
      return;
    }
    var ep = engine.eps[engine.cur];
    if (engine.step < ep.steps.length - 1) {
      engine.step++;
      engine.els.stage.classList.add('stage--swap');
      engine.render();
      setTimeout(function () { engine.els.stage.classList.remove('stage--swap'); }, 450);
    } else if (engine.cur < engine.eps.length - 1) {
      engine.goTo(engine.cur + 1, 0);
    }
  };

  engine.prev = function () {
    if (!engine.started || engine.cur < 0) return;
    if (engine.step > 0) {
      engine.step--;
      engine.els.stage.classList.add('stage--swap');
      engine.render();
      setTimeout(function () { engine.els.stage.classList.remove('stage--swap'); }, 450);
    } else if (engine.cur > 0) {
      engine.goTo(engine.cur - 1, engine.eps[engine.cur - 1].steps.length - 1);
    }
  };

  engine.restart = function () {
    if (!engine.started || engine.cur < 0) return;
    LOG.voice.stop();
    engine.goTo(engine.cur, 0, false);
    engine.els.stage.classList.add('stage--swap');
    setTimeout(function () { engine.els.stage.classList.remove('stage--swap'); }, 450);
  };

  /* ------------------ Сохранение ------------------ */
  engine.save = function () {
    try { localStorage.setItem('logarithm.progress.v1', JSON.stringify({ e: engine.cur, s: engine.step })); } catch (e) {}
  };
  engine.load = function () {
    try { return JSON.parse(localStorage.getItem('logarithm.progress.v1') || 'null'); } catch (e) { return null; }
  };

  /* ------------------ Меню эпизодов ------------------ */
  function buildMenu() {
    var list = engine.els.epMenuList;
    list.innerHTML = '';
    engine.eps.forEach(function (ep, i) {
      var b = U.el('button', 'pop__item');
      b.type = 'button';
      b.setAttribute('role', 'menuitem');
      b.innerHTML = '<span class="num">' + ep.label + '</span><span>' + ep.title + '</span>';
      b.addEventListener('click', function () { togglePop(null); engine.goTo(i, 0); });
      list.appendChild(b);
    });
  }
  function renderMenuStateSafe() {}

  function togglePop(which) {
    ['epMenu', 'settingsPop'].forEach(function (id) {
      var el = U.$(id);
      if (!el) return;
      var show = which === id && el.hidden;
      el.hidden = !show;
      var btn = U.$(id === 'epMenu' ? 'btnMenu' : 'btnSettings');
      if (btn) btn.setAttribute('aria-expanded', String(show));
    });
  }

  /* ------------------ Фоновые частицы ------------------ */
  function startBackground() {
    var cv = U.$('bgCanvas');
    var ctx = cv.getContext('2d');
    var W = 0, H = 0, parts = [];
    var COLORS = ['rgba(108,140,255,', 'rgba(170,120,255,', 'rgba(200,255,86,', 'rgba(243,243,237,'];
    function build() {
      W = cv.width = Math.round(innerWidth * Math.min(devicePixelRatio || 1, 1.5));
      H = cv.height = Math.round(innerHeight * Math.min(devicePixelRatio || 1, 1.5));
      ctx.setTransform(Math.min(devicePixelRatio || 1, 1.5), 0, 0, Math.min(devicePixelRatio || 1, 1.5), 0, 0);
      var n = Math.min(130, Math.round(innerWidth * innerHeight / 16000));
      parts = [];
      for (var i = 0; i < n; i++) {
        parts.push({
          x: Math.random() * innerWidth,
          y: Math.random() * innerHeight,
          r: Math.random() * 1.6 + 0.4,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          a: Math.random() * 0.35 + 0.08,
          c: COLORS[Math.floor(Math.random() * COLORS.length)]
        });
      }
    }
    build();
    LOG.resizers.add(build);
    if (!LOG.motion.reduced) {
      LOG.loops.add(function (dt) {
        var s = dt / 1000;
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i];
          p.x += p.vx * s; p.y += p.vy * s;
          if (p.x < -5) p.x = innerWidth + 5; if (p.x > innerWidth + 5) p.x = -5;
          if (p.y < -5) p.y = innerHeight + 5; if (p.y > innerHeight + 5) p.y = -5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, 6.2832);
          ctx.fillStyle = p.c + p.a + ')';
          ctx.fill();
        }
      });
    } else {
      // статичные точки без анимации
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      parts.forEach(function (p) {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832);
        ctx.fillStyle = p.c + p.a + ')'; ctx.fill();
      });
    }
  }

  /* ------------------ Запуск ------------------ */
  engine.boot = function () {
    loadSettings();
    var E = {
      stage: U.$('stage'), btnNext: U.$('btnNext'), btnPrev: U.$('btnPrev'),
      btnPlay: U.$('btnPlay'), btnReplay: U.$('btnReplay'), btnRestart: U.$('btnRestart'),
      btnMenu: U.$('btnMenu'), btnSettings: U.$('btnSettings'), btnPrevEp: U.$('btnPrevEp'), btnNextEp: U.$('btnNextEp'),
      epIndicator: U.$('epIndicator'), progress: U.$('progress'), epMenuList: U.$('epMenuList')
    };
    engine.els = E;
    LOG.subtitle.init();
    addGrain();
    startBackground();
    buildMenu();

    E.btnNext.addEventListener('click', function () { engine.next(); });
    E.btnPrev.addEventListener('click', function () { engine.prev(); });
    E.btnRestart.addEventListener('click', function () { engine.restart(); });
    E.btnPlay.addEventListener('click', function () { LOG.voice.toggle(); });
    E.btnReplay.addEventListener('click', function () { LOG.voice.repeat(); });
    E.btnMenu.addEventListener('click', function () { togglePop('epMenu'); });
    E.btnSettings.addEventListener('click', function () { togglePop('settingsPop'); });
    E.btnPrevEp.addEventListener('click', function () { engine.goTo(engine.cur - 1, 0); });
    E.btnNextEp.addEventListener('click', function () { engine.goTo(engine.cur + 1, 0); });
    document.addEventListener('click', function (ev) {
      if (!ev.target.closest('.pop') && !ev.target.closest('#btnMenu') && !ev.target.closest('#btnSettings')) togglePop(null);
    });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') togglePop(null); });

    /* Клавиатура */
    document.addEventListener('keydown', function (ev) {
      var t = ev.target;
      var typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (typing || !engine.started) return;
      if (ev.key === 'ArrowRight' && !ev.altKey) { engine.next(); }
      else if (ev.key === 'ArrowLeft') { engine.prev(); }
      else if (ev.key === 'r' || ev.key === 'R' || ev.key === 'к' || ev.key === 'К') { engine.restart(); }
      else if (ev.key === ' ') { ev.preventDefault(); LOG.voice.toggle(); }
    });

    /* Настройки UI */
    var chkVoice = U.$('chkVoice'), chkSubs = U.$('chkSubs'), rate = U.$('rateRange'), rateOut = U.$('rateOut'), voiceSel = U.$('voiceSel');
    chkVoice.checked = LOG.settings.voiceOn;
    chkSubs.checked = LOG.settings.subs;
    rate.value = String(LOG.settings.rate);
    rateOut.textContent = U.fmtDec(LOG.settings.rate, 2).replace(/,00$/, '') + '×';
    chkVoice.addEventListener('change', function () {
      LOG.settings.voiceOn = chkVoice.checked;
      if (!LOG.settings.voiceOn) { LOG.voice.stop(); if (LOG.settings.subs) { var t = engine.currentStepText(); if (t) LOG.subtitle.show(t); } else LOG.subtitle.hide(); }
      else { LOG.voice.repeat(); }
      saveSettings();
    });
    chkSubs.addEventListener('change', function () {
      LOG.settings.subs = chkSubs.checked;
      if (!LOG.settings.subs) LOG.subtitle.hide();
      else { var t = engine.currentStepText(); if (t && (!LOG.settings.voiceOn || !LOG.voice.speakingNow())) LOG.subtitle.show(t); }
      saveSettings();
    });
    rate.addEventListener('input', function () {
      LOG.settings.rate = parseFloat(rate.value);
      rateOut.textContent = U.fmtDec(LOG.settings.rate, 2).replace(/,00$/, '') + '×';
      saveSettings();
    });
    rate.addEventListener('change', function () { LOG.voice.repeat(); });
    voiceSel.addEventListener('change', function () {
      LOG.settings.voiceURI = voiceSel.value;
      LOG.voice.refreshVoices();
      saveSettings();
      LOG.voice.repeat();
    });

    /* Жест пользователя — разрешение на озвучку */
    LOG.voice.userActive = false;
    var activate = function () { LOG.voice.userActive = true; };
    document.addEventListener('pointerdown', activate, { once: true, capture: true });
    document.addEventListener('keydown', activate, { once: true, capture: true });

    /* Интро */
    var intro = U.$('intro');
    var saved = engine.load();
    var btnStart = U.$('introStart'), btnCont = U.$('introContinue'), btnLab = U.$('introLab');
    if (saved && saved.e >= 0 && engine.eps[saved.e] && !engine.eps[saved.e].bonus) {
      btnCont.hidden = false;
      btnCont.textContent = 'Продолжить с эпизода ' + String(saved.e + 1).padStart(2, '0');
      btnCont.addEventListener('click', function () { closeIntro(); engine.goTo(saved.e, saved.s || 0); });
    }
    btnStart.addEventListener('click', function () { closeIntro(); engine.goTo(saved && saved.e >= 0 ? saved.e : 0, saved && saved.e >= 0 ? (saved.s || 0) : 0); });
    btnLab.addEventListener('click', function () {
      closeIntro();
      var idx = engine.eps.findIndex(function (e) { return e.bonus; });
      engine.goTo(idx < 0 ? 0 : idx, 0);
    });
    function closeIntro() { intro.classList.add('intro--off'); setTimeout(function () { intro.hidden = true; }, 650); }

    LOG.voice.init();
    engine.started = false;
  };

  LOG.register = engine.register;
  LOG.boot = function () { engine.boot(); };
  LOG.engine = engine;
})();
