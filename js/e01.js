'use strict';
/* ЭПИЗОД 01 — УГАДАЮ ВАШЕ ЧИСЛО. Настоящий бинарный поиск по диапазону 1..1 000 000. */
(function () {
  var U = LOG.U, F = LOG.F;

  /* Поле из чисел: канвас с дрейфующими цифрами */
  function numberField(host, api, opts) {
    opts = opts || {};
    var st = LOG.canvas(host, { height: opts.height || 380, alt: 'Поле дрейфующих чисел' });
    var ctx = st.ctx;
    var items = [];
    function build() {
      items = [];
      var n = Math.min(170, Math.round(st.w / 7));
      for (var i = 0; i < n; i++) {
        items.push({
          x: Math.random() * st.w,
          y: Math.random() * st.h,
          v: String(Math.floor(Math.random() * 999999) + 1),
          s: Math.random() * 20 + 11,
          vy: -(Math.random() * 14 + 6),
          a: Math.random() * 0.28 + 0.07,
          c: Math.random() < 0.14 ? (Math.random() < 0.5 ? '108,140,255' : '170,120,255') : '139,143,158'
        });
      }
    }
    build();
    var oldResize = st.resize;
    st.resize = function () { oldResize(); build(); };
    if (!LOG.motion.reduced) {
      api.loop(function (dt) {
        var s = dt / 1000;
        ctx.clearRect(0, 0, st.w, st.h);
        for (var i = 0; i < items.length; i++) {
          var p = items[i];
          p.y += p.vy * s;
          if (p.y < -30) { p.y = st.h + 20; p.x = Math.random() * st.w; }
          ctx.font = '700 ' + p.s.toFixed(0) + 'px ui-monospace, Consolas, monospace';
          ctx.fillStyle = 'rgba(' + p.c + ',' + p.a + ')';
          ctx.fillText(p.v, p.x, p.y);
        }
      });
    } else {
      st.draw = function () {
        ctx.clearRect(0, 0, st.w, st.h);
        items.forEach(function (p) {
          ctx.font = '700 ' + p.s.toFixed(0) + 'px ui-monospace, Consolas, monospace';
          ctx.fillStyle = 'rgba(' + p.c + ',' + p.a + ')';
          ctx.fillText(p.v, p.x, p.y);
        });
      };
      st.draw();
    }
    return st;
  }

  /* Шкала 1..1 000 000 (лог) с интервалом [lo, hi] */
  function drawScale(ctx, w, h, lo, hi, ghostLo, ghostHi, ghostA, midV) {
    var padL = 18, padR = 18, y = h - 34;
    var lg = function (v) { return Math.log10(Math.max(1, v)); };
    var X = function (v) { return padL + (lg(v) / 6) * (w - padL - padR); };
    ctx.clearRect(0, 0, w, h);
    /* десятичные тики */
    ctx.font = '11px ui-monospace, Consolas, monospace';
    for (var d = 0; d <= 6; d++) {
      var v = Math.pow(10, d);
      var x = X(v);
      ctx.strokeStyle = 'rgba(139,143,158,.35)';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 8); ctx.stroke();
      ctx.fillStyle = 'rgba(139,143,158,.75)';
      var lbl = d === 6 ? '1\u00A0млн' : U.fmtInt(v);
      var tx = Math.min(Math.max(x - 14, 2), w - 40);
      ctx.fillText(lbl, tx, y + 22);
    }
    ctx.strokeStyle = 'rgba(139,143,158,.5)';
    ctx.beginPath(); ctx.moveTo(padL - 8, y); ctx.lineTo(w - padR + 8, y); ctx.stroke();

    /* призрак удалённой половины */
    if (ghostA > 0.01) {
      ctx.fillStyle = 'rgba(255,148,94,' + (0.16 * ghostA) + ')';
      ctx.fillRect(X(ghostLo), y - 26, X(ghostHi) - X(ghostLo), 26);
    }
    /* текущий интервал */
    var x1 = X(lo), x2 = X(hi);
    var grad = ctx.createLinearGradient(x1, 0, x2, 0);
    grad.addColorStop(0, 'rgba(108,140,255,.85)');
    grad.addColorStop(1, 'rgba(170,120,255,.85)');
    ctx.fillStyle = grad;
    ctx.fillRect(x1, y - 26, Math.max(3, x2 - x1), 26);
    ctx.strokeStyle = 'rgba(243,243,237,.9)';
    ctx.beginPath(); ctx.moveTo(x1, y - 30); ctx.lineTo(x1, y - 18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y - 30); ctx.lineTo(x2, y - 18); ctx.stroke();

    /* середина — будущий вопрос */
    if (midV != null && hi > lo) {
      var xm = X(midV);
      ctx.strokeStyle = 'rgba(200,255,86,.95)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(xm, y - 44); ctx.lineTo(xm, y + 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(200,255,86,.95)';
      ctx.font = '700 12px ui-monospace, Consolas, monospace';
      ctx.fillText('вопрос: > ' + U.fmtInt(midV) + '?', Math.min(Math.max(xm - 40, 2), w - 130), y - 50);
    }
  }

  LOG.register({
    id: 'e01',
    title: 'Угадаю ваше число',
    steps: [
      /* ---------- Шаг 1 ---------- */
      {
        text: 'Перед вами миллион возможностей. Загадайте любое целое число от одного до миллиона. Не говорите его вслух — просто удержите в уме. Я найду его, задавая вопросы, на которые есть только два ответа: да или нет.',
        nextLabel: 'Что дальше? →',
        build: function (box, api) {
          var hero = U.el('div', 'numfield-hero card--glow card');
          box.appendChild(hero);
          var field = numberField(hero, api, { height: 420 });
          var ov = U.el('div', 'overlay');
          ov.innerHTML =
            '<div>' +
            '<h3 class="kinetic" style="font-size:clamp(28px,6vw,64px);font-weight:900;margin:0;text-transform:uppercase" aria-label="Загадайте любое число">' +
            'ЗАГАДАЙТЕ <span style="color:var(--lime)">ЛЮБОЕ</span> ЧИСЛО</h3>' +
            '<p class="muted" style="margin:10px 0 0">от ' + F.res('1') + ' до ' + F.res('1\u00A0000\u00A0000') + '</p>' +
            '</div>';
          hero.appendChild(ov);
          api.done();
        }
      },
      /* ---------- Шаг 2 ---------- */
      {
        text: 'Я найду ваше число максимум за двадцать вопросов. Каждый вопрос допускает только два ответа: да или нет. Двадцать вопросов — и миллион вариантов сжимается до одного. Это обещание математики, а не фокуса.',
        nextLabel: 'Доказать →',
        build: function (box, api) {
          var wrap = U.el('div', 'center col');
          wrap.innerHTML =
            '<div class="big-line shout" id="bigTwenty">20</div>' +
            '<p class="muted" style="font-size:clamp(16px,2.6vw,22px)">вопросов. Каждый — только <b style="color:var(--lime)">ДА</b> или <b style="color:var(--orange)">НЕТ</b></p>';
          box.appendChild(wrap);
          var el = wrap.querySelector('#bigTwenty');
          if (!LOG.motion.reduced) {
            var n = 0;
            el.textContent = '0';
            var timer = setInterval(function () {
              n++;
              el.textContent = String(n);
              if (n >= 20) { clearInterval(timer); api.done(); }
            }, 90);
            api.cleanup(function () { clearInterval(timer); });
          } else { api.done(); }
        }
      },
      /* ---------- Шаг 3: игра ---------- */
      {
        text: 'Введите число — отрегулируйте ползунок или выберите наугад. Когда будете готовы, нажмите «Загадать». Затем отвечайте на вопросы: да или нет. Алгоритм делит оставшийся диапазон ровно пополам, поэтому ваше число будет найдено не более чем за двадцать шагов.',
        lock: true,
        build: function (box, api) {
          var st = {
            lo: 1, hi: 1000000, q: 0, phase: 'pick',
            num: null, ghostLo: null, ghostHi: null, ghostA: 0
          };
          var card = U.el('div', 'card q-card');
          box.appendChild(card);
          var scaleSt = LOG.canvas(box, { height: 170, alt: 'Числовая шкала от 1 до миллиона с выделенным диапазоном' });
          var counters = U.el('div', 'counters');
          box.appendChild(counters);
          var live = U.el('p', 'feedback center');
          live.setAttribute('aria-live', 'polite');
          box.appendChild(live);

          var M = 1000000;
          function mid() { return st.lo + Math.floor((st.hi - st.lo) / 2); }
          function size() { return st.hi - st.lo + 1; }

          function renderPick() {
            card.innerHTML =
              '<h3 class="big-line" style="font-size:clamp(24px,4vw,44px)">Выберите число</h3>' +
              '<div class="pick-form">' +
              '<div class="field"><label for="numInp">Ваше число (1–1 000 000)</label>' +
              '<input id="numInp" type="number" inputmode="numeric" min="1" max="1000000" step="1" placeholder="например, 547 231"></div>' +
              '<div class="field"><label for="numRange">Ползунок</label>' +
              '<input id="numRange" type="range" min="1" max="1000000" step="1" value="500000">' +
              '<div class="rangeval" id="rangeVal">500\u00A0000</div></div>' +
              '<div class="row row--center"><button id="btnRandom" class="btn btn--ghost" type="button">🎲 Случайное</button>' +
              '<button id="btnPick" class="btn btn--accent" type="button">Загадать</button></div>' +
              '<p class="feedback" id="pickMsg" aria-live="polite"></p></div>';
            var inp = card.querySelector('#numInp'), rng = card.querySelector('#numRange'), rv = card.querySelector('#rangeVal');
            rng.addEventListener('input', function () {
              rv.innerHTML = U.fmtInt(parseInt(rng.value, 10) || 1);
              inp.value = rng.value;
            });
            inp.addEventListener('input', function () {
              var v = parseInt(inp.value, 10);
              if (!isNaN(v)) rv.innerHTML = U.fmtInt(v);
            });
            card.querySelector('#btnRandom').addEventListener('click', function () {
              var v = 1 + Math.floor(Math.random() * M);
              inp.value = String(v); rng.value = String(v);
              rv.innerHTML = U.fmtInt(v);
            });
            card.querySelector('#btnPick').addEventListener('click', function () {
              var v = parseInt(inp.value, 10);
              if (isNaN(v) || v < 1 || v > M) {
                card.querySelector('#pickMsg').textContent = 'Введите целое число от 1 до 1 000 000.';
                return;
              }
              st.num = v;
              st.phase = 'ask';
              api.speak('Число скрыто. Начинаем. Отвечайте да или нет.');
              renderAsk();
            });
          }

          function renderAsk() {
            card.innerHTML =
              '<h3 class="big-line" style="font-size:clamp(24px,4vw,44px)">Вопрос <span class="mono" style="font-family:var(--font-mono);color:var(--blue)" id="qNum">' + (st.q + 1) + '</span></h3>' +
              '<p class="question" id="qText" aria-live="polite"></p>' +
              '<div class="yesno">' +
              '<button id="btnYes" class="btn btn--yes" type="button">ДА</button>' +
              '<button id="btnNo" class="btn btn--no" type="button">НЕТ</button>' +
              '</div>' +
              '<p class="muted" style="margin-bottom:0;font-size:14px">Мой алгоритм каждый раз делит оставшийся диапазон пополам.</p>';
            var m = mid();
            card.querySelector('#qText').innerHTML = 'Ваше число больше ' + F.arg(U.fmtInt(m)) + '?';
            card.querySelector('#btnYes').addEventListener('click', function () { answer(true); });
            card.querySelector('#btnNo').addEventListener('click', function () { answer(false); });
            update();
          }

          function answer(yes) {
            var m = mid();
            st.ghostLo = yes ? st.lo : m + 1;
            st.ghostHi = yes ? m : st.hi;
            st.ghostA = 1;
            if (yes) st.lo = m + 1; else st.hi = m;
            st.q++;
            if (size() === 1) finish();
            else { renderAsk(); api.speak('Осталось вариантов: ' + U.fmtInt(size()) + '.'); }
          }

          function update() {
            counters.innerHTML =
              '<span class="chip">Вопрос <b>' + st.q + '</b> из максимум 20</span>' +
              '<span class="chip">Осталось вариантов <b>' + U.fmtInt(size()) + '</b></span>' +
              '<span class="chip chip--lime">Диапазон ' + U.fmtInt(st.lo) + ' … ' + U.fmtInt(st.hi) + '</span>';
          }

          function finish() {
            st.phase = 'done';
            var found = st.lo;
            card.innerHTML =
              '<p class="muted" style="margin-bottom:6px">Ваше число</p>' +
              '<div class="result-num">' + U.fmtInt(found) + '</div>' +
              '<p style="font-size:clamp(18px,3vw,26px);margin:10px 0 0">Найдено за <b style="color:var(--lime)">' + st.q + '</b> ' + plural(st.q) + '. Ни одного лишнего вопроса.</p>';
            counters.innerHTML = '<span class="chip chip--lime">Вопросов: <b>' + st.q + '</b> ≤ 20 — гарантия бинарного поиска</span>';
            live.textContent = 'Ваше число — ' + U.fmtInt(found) + '. Найдено за ' + st.q + ' ' + plural(st.q) + '.';
            drawScale(scaleSt.ctx, scaleSt.w, scaleSt.h, st.lo, st.hi, null, null, 0, null);
            api.speak('Ваше число — ' + U.fmtInt(found) + '. Всего вопросов: ' + st.q + '. Ни одного лишнего.');
            api.setNextLabel('Почему это работает? →');
            api.done();
          }

          function plural(n) {
            var m10 = n % 10, m100 = n % 100;
            if (m10 === 1 && m100 !== 11) return 'вопрос';
            if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 > 20)) return 'вопроса';
            return 'вопросов';
          }

          /* Анимация шкалы: затухание призрака + перерисовка */
          drawScale(scaleSt.ctx, scaleSt.w, scaleSt.h, 1, M, null, null, 0, null);
          if (!LOG.motion.reduced) {
            api.loop(function (dt) {
              if (st.ghostA > 0) {
                st.ghostA = Math.max(0, st.ghostA - dt / 1200);
                drawScale(scaleSt.ctx, scaleSt.w, scaleSt.h, st.lo, st.hi, st.ghostLo, st.ghostHi, st.ghostA, st.phase === 'ask' ? mid() : null);
              }
            });
          }
          var resz = function () { drawScale(scaleSt.ctx, scaleSt.w, scaleSt.h, st.lo, st.hi, null, null, 0, st.phase === 'ask' ? mid() : null); };
          scaleSt.draw = resz; resz();
          api.cleanup(function () { scaleSt.off(); });

          update();
          renderPick();
        }
      },
      /* ---------- Шаг 4: итог ---------- */
      {
        text: 'Двадцать вопросов — один миллион вариантов. Это не совпадение, а свойство чисел. И у этого свойства есть имя, которое вы откроете через минуту.',
        nextLabel: 'Но почему именно 20? →',
        build: function (box, api) {
          var wrap = U.el('div', 'center col');
          wrap.innerHTML =
            '<div class="big-line shout">20 <span class="accent2">ВОПРОСОВ</span></div>' +
            '<div class="big-line" style="font-size:clamp(22px,4.6vw,52px)">ОДИН МИЛЛИОН ВАРИАНТОВ</div>' +
            '<div class="morph center" id="morphBox" style="margin-top:26px">' +
            '<div class="fm fm--big" id="morphA">' + F.exp('20') + '</div>' +
            '<div class="fm fm--mid morph--out" id="morphB">⌈' + F.log('2', '1\u00A0000\u00A0000') + '⌉ = ' + F.res('20') + '</div>' +
            '</div>' +
            '<p class="muted" style="margin-top:8px">ceil — округление вверх: ровно 20 не гарантируется, но 20 вопросов хватает всегда</p>';
          box.appendChild(wrap);
          var a = wrap.querySelector('#morphA'), b = wrap.querySelector('#morphB');
          var t = setTimeout(function () {
            a.classList.add('morph--out');
            setTimeout(function () { a.style.display = 'none'; b.classList.remove('morph--out'); b.classList.add('morph--in'); requestAnimationFrame(function () { b.classList.remove('morph--in'); }); }, 480);
          }, 1600);
          api.cleanup(function () { clearTimeout(t); });
          api.done();
        }
      },
      /* ---------- Шаг 5: мостик ---------- */
      {
        text: 'Но почему именно двадцать? Что особенного в этой цифре? Чтобы ответить, нужно увидеть, как вопрос «да или нет» сжимает миллион возможностей.',
        nextLabel: 'Смотреть на миллион →',
        build: function (box, api) {
          var wrap = U.el('div', 'center col');
          wrap.innerHTML =
            '<div class="big-line" style="font-size:clamp(28px,5.4vw,64px)">Но почему <span class="accent3">именно 20</span>?</div>' +
            '<p class="muted" style="max-width:560px;margin:0 auto">Дело не в удаче и не в фокусе. Каждый вопрос с ответом «да или нет» — это одна двоичная частица информации. Сейчас вы увидите миллион вариантов на экране и то, как они исчезают.</p>';
          box.appendChild(wrap);
          api.done();
        }
      }
    ]
  });
})();
