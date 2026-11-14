'use strict';
/* ЭПИЗОД 02 — ИГРА ВСЛЕПУЮ. Миллион вариантов, деление пополам, N/2ⁿ, разряды информации. */
(function () {
  var U = LOG.U, F = LOG.F;
  var N = 1000000;
  var DOTS = 20000;        // точек на канвасе: каждая = 50 чисел
  var COLS = 200, ROWS = 100;
  var PER_DOT = N / DOTS;

  /* Детерминированное перемешивание индексов точек */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  var order = (function () {
    var arr = new Array(DOTS);
    for (var i = 0; i < DOTS; i++) arr[i] = i;
    var rnd = mulberry32(20250101);
    for (var j = DOTS - 1; j > 0; j--) {
      var k = Math.floor(rnd() * (j + 1));
      var t = arr[j]; arr[j] = arr[k]; arr[k] = t;
    }
    return arr;
  })();

  /* Поле точек: тусклый слой + яркие «выжившие» */
  function dotField(host, api, opts) {
    opts = opts || {};
    var st = LOG.canvas(host, { height: opts.height || 320, alt: 'Миллион чисел как поле светящихся точек' });
    var ctx = st.ctx;
    var off = document.createElement('canvas');
    var offCtx = off.getContext('2d');
    var baseDrawn = false;
    function metrics() {
      var cw = st.w / COLS, ch = st.h / ROWS;
      return {
        cw: cw, ch: ch,
        r: Math.max(0.8, Math.min(cw, ch) * 0.27)
      };
    }
    function drawBase() {
      var m = metrics();
      off.width = Math.round(st.w * st.dpr);
      off.height = Math.round(st.h * st.dpr);
      offCtx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
      offCtx.clearRect(0, 0, st.w, st.h);
      for (var c = 0; c < COLS; c++) {
        for (var r = 0; r < ROWS; r++) {
          var x = (c + 0.5) * m.cw, y = (r + 0.5) * m.ch;
          offCtx.beginPath();
          offCtx.arc(x, y, m.r, 0, 6.2832);
          offCtx.fillStyle = 'rgba(139,143,158,.22)';
          offCtx.fill();
        }
      }
      baseDrawn = true;
    }
    st.draw = function () {
      drawBase();
      paintKeep(keepRef);
    };
    var keepRef = DOTS;
    function paintKeep(k) {
      ctx.clearRect(0, 0, st.w, st.h);
      ctx.drawImage(off, 0, 0, st.w, st.h);
      var m = metrics();
      ctx.fillStyle = 'rgba(200,255,86,.95)';
      var kk = Math.min(DOTS, Math.max(0, Math.round(k)));
      for (var i = 0; i < kk; i++) {
        var idx = order[i];
        var c = idx % COLS, r = Math.floor(idx / COLS);
        ctx.beginPath();
        ctx.arc((c + 0.5) * m.cw, (r + 0.5) * m.ch, m.r, 0, 6.2832);
        ctx.fill();
      }
    }
    st.setKeep = function (k) { keepRef = k; paintKeep(k); };
    api.cleanup(function () { st.off(); });
    return st;
  }

  /* remaining = «не более чем» ceil(N / 2^k) */
  function remain(k) { return Math.ceil(N / Math.pow(2, k)); }

  LOG.register({
    id: 'e02',
    title: 'Игра вслепую',
    steps: [
      /* ---------- Шаг 1: миллион ---------- */
      {
        text: 'Вот миллион чисел — каждое светящаяся точка, точек на экране двадцать тысяч, но вместе они — весь диапазон от одного до миллиона. Один вопрос с ответом «да или нет» делит их ровно пополам: да — остаётся одна половина, нет — другая.',
        nextLabel: 'Делить пополам →',
        build: function (box, api) {
          var st = dotField(box, api, { height: 340 });
          st.setKeep(DOTS);
          var caps = U.el('div', 'counters');
          caps.innerHTML =
            '<span class="chip">Вариантов <b>1\u00A0000\u00A0000</b></span>' +
            '<span class="chip chip--lime">Каждая точка — 50 чисел</span>';
          box.appendChild(caps);
          api.done();
        }
      },
      /* ---------- Шаг 2: каскад делений ---------- */
      {
        text: 'Миллион. Пятьсот тысяч. Двести пятьдесят тысяч. Двенадцать с половиной тысяч — после всего четырёх вопросов. Каждый вопрос отсеивает половину оставшихся вариантов, поэтому количество падает лавиной: сначала медленно на глаз, потом стремительно.',
        nextLabel: 'Управлять вопросами →',
        build: function (box, api) {
          var st = dotField(box, api, { height: 300 });
          var cas = U.el('div', 'cascade center');
          box.appendChild(cas);
          var seq = [0, 1, 2, 3, 4, 6, 8, 10];
          var vals = U.el('div', null, '');
          cas.appendChild(vals);
          var btn = U.el('button', 'btn btn--ghost', '⟲ Повторить каскад');
          btn.type = 'button';
          box.appendChild(btn);

          var timers = [];
          function run() {
            timers.forEach(clearTimeout); timers = [];
            vals.innerHTML = '';
            st.setKeep(DOTS);
            seq.forEach(function (k, i) {
              timers.push(setTimeout(function () {
                var v = U.el('div', 'cascade__val', U.fmtInt(remain(k)) + (k > 0 ? ' <span class="muted" style="font-size:.55em">· ' + k + ' ' + (k === 1 ? 'вопрос' : 'вопросов') + '</span>' : ''));
                vals.appendChild(v);
                st.setKeep(DOTS / Math.pow(2, k));
                var prev = vals.children[vals.children.length - 2];
                if (prev) prev.classList.add('cascade__val--dim');
                if (k === 10) {
                  v.innerHTML = U.fmtInt(remain(k)) + ' <span class="muted" style="font-size:.55em">· после 10 вопросов меньше тысячи</span>';
                }
              }, i * 900));
            });
            timers.push(setTimeout(function () { api.done(); }, seq.length * 900 + 100));
          }
          btn.addEventListener('click', run);
          run();
          api.cleanup(function () { timers.forEach(clearTimeout); });
          api.lock('Смотрите каскад…');
        }
      },
      /* ---------- Шаг 3: ползунок 0..20 ---------- */
      {
        text: 'Подвигайте ползунок. После десяти вопросов остаётся не более девятисот семидесяти семи вариантов — уже меньше тысячи. После двадцати остаётся не более одного. Формула проста: миллион, делённый на два в степени вопроса.',
        nextLabel: 'Что означает один вопрос? →',
        build: function (box, api) {
          var st = dotField(box, api, { height: 280 });
          var ctr = U.el('div', 'card');
          ctr.innerHTML =
            '<div class="field"><label for="kRange">Вопросов задано: <b id="kVal" style="color:var(--lime);font-family:var(--font-mono)">0</b></label>' +
            '<input id="kRange" type="range" min="0" max="20" step="1" value="0"></div>' +
            '<div class="duo" style="margin-top:14px">' +
            '<div class="card" style="padding:14px 16px"><h3>Осталось вариантов</h3><div class="val" id="remVal" style="color:var(--blue)"></div>' +
            '<div class="muted" style="font-size:13px" id="remFormula"></div></div>' +
            '<div class="card" style="padding:14px 16px"><h3>Возможных ответов ДА/НЕТ</h3><div class="val" id="seqVal" style="color:var(--violet)"></div>' +
            '<div class="muted" style="font-size:13px" id="seqFormula">2<sup>0</sup> = 1</div></div>' +
            '</div>';
          box.appendChild(ctr);
          var rng = ctr.querySelector('#kRange');
          function upd() {
            var k = parseInt(rng.value, 10);
            ctr.querySelector('#kVal').textContent = String(k);
            var rem = remain(k);
            ctr.querySelector('#remVal').textContent = '≤ ' + U.fmtInt(rem);
            ctr.querySelector('#remFormula').innerHTML = '1\u00A0000\u00A0000 / 2<sup>' + k + '</sup>' + (Number.isInteger(N / Math.pow(2, k)) ? ' = ' + U.fmtInt(N / Math.pow(2, k)) : ' → ' + U.fmtInt(rem));
            ctr.querySelector('#seqVal').textContent = U.fmtInt(Math.pow(2, k));
            ctr.querySelector('#seqFormula').innerHTML = '2<sup>' + k + '</sup> — столько разных последовательностей ДА/НЕТ';
            st.setKeep(DOTS / Math.pow(2, k));
          }
          rng.addEventListener('input', upd);
          upd();
          api.done();
        }
      },
      /* ---------- Шаг 4: разряды ---------- */
      {
        text: 'Смотрите на два числа: оставшиеся варианты и возможные последовательности ответов. Два вопроса — четыре последовательности, десять — тысяча двадцать четыре, двадцать — более миллиона. Каждый вопрос с двумя исходами даёт один дополнительный двоичный разряд информации. Чтобы указать одно число среди миллиона, нужно больше двадцати таких разрядов — отсюда и двадцать вопросов.',
        nextLabel: 'Итак, что такое логарифм? →',
        build: function (box, api) {
          var wrap = U.el('div', 'col');
          wrap.innerHTML =
            '<div class="duo">' +
            '<div class="card"><h3>Осталось чисел</h3><div class="val" style="color:var(--blue)">1\u00A0000\u00A0000 / 2<sup>n</sup></div><p class="muted" style="font-size:14px;margin:6px 0 0">после n вопросов</p></div>' +
            '<div class="card"><h3>Последовательностей ДА/НЕТ</h3><div class="val" style="color:var(--violet)">2<sup>n</sup></div><p class="muted" style="font-size:14px;margin:6px 0 0">длина n даёт 2 в степени n разных «слов»</p></div>' +
            '</div>' +
            '<div class="card card--glow center">' +
            '<p style="font-size:clamp(18px,3vw,26px);margin:0">2<sup>20</sup> = ' + U.fmtInt(1048576) + ' &gt; 1\u00A0000\u00A0000</p>' +
            '<p class="muted" style="margin:8px 0 0">Двадцати двоичных разрядов хватает, чтобы «прокодировать» любое число от 1 до миллиона. <b style="color:var(--lime)">Каждый вопрос — один разряд.</b></p>' +
            '</div>';
          box.appendChild(wrap);
          api.done();
        }
      }
    ]
  });
})();
