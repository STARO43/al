'use strict';
/* ЭПИЗОД 06 — ЛОГАРИФМ СЧИТАЕТ ЦИФРЫ. Правило floor(lg N)+1, точный BigInt-подсчёт цифр 2^n. */
(function () {
  var U = LOG.U, F = LOG.F;

  /* Точное число цифр 2^n через BigInt (n ≤ 500 — запас по точности и памяти) */
  function digitsOfTwoPow(n) {
    return (2n ** BigInt(n)).toString().length;
  }
  function twoPowStr(n) {
    return (2n ** BigInt(n)).toString();
  }

  LOG.register({
    id: 'e06',
    title: 'Логарифм считает цифры',
    steps: [
      /* ---------- Шаг 1: цифры растут ---------- */
      {
        text: 'Сколько цифр в числе два в сотой? Это сто двоек, перемноженных между собой. Число растёт на глазах — и заполняет экран. Перемножать вручную не будем: у математики есть путь короче.',
        nextLabel: 'Найти правило →',
        build: function (box, api) {
          var card = U.el('div', 'card');
          var stream = U.el('div', 'digits-stream');
          stream.setAttribute('aria-label', 'Число 2 в степени 100: 1267650600228229401496703205376');
          var cnt = U.el('div', 'muted center', 'цифр: <b style="color:var(--lime)">0</b>');
          card.appendChild(stream);
          card.appendChild(cnt);
          var full = U.el('p', 'muted center', '2<sup>100</sup> = ' + U.fmtInt(Number(2n ** 100n)) + ' <span class="chip" style="font-size:12px">спойлер: ' + digitsOfTwoPow(100) + ' цифр</span>');
          card.appendChild(full);
          box.appendChild(card);

          var s = twoPowStr(100);
          var i = 0;
          if (!LOG.motion.reduced) {
            var iv = setInterval(function () {
              var batch = s.slice(i, i + 4);
              for (var k = 0; k < batch.length; k++) {
                var d = U.el('span', 'd', batch[k]);
                stream.appendChild(d);
              }
              i += 4;
              cnt.innerHTML = 'цифр: <b style="color:var(--lime)">' + i + '</b>';
              if (i >= s.length) {
                clearInterval(iv);
                api.done();
              }
            }, 55);
            api.cleanup(function () { clearInterval(iv); });
            api.lock('Число растёт…');
          } else {
            stream.textContent = s;
            cnt.innerHTML = 'цифр: <b style="color:var(--lime)">' + s.length + '</b>';
            api.done();
          }
        }
      },
      /* ---------- Шаг 2: правило ---------- */
      {
        text: 'Смотрите на закономерность. Логарифм ста по основанию десять равен двум — у ста три цифры. Логарифм тысячи равен трём — у тысячи четыре цифры. Число пятьсот сорок семь лежит между сотней и тысячей, и его логарифм лежит между двумя и тремя. Правило: количество цифр числа N — это целая часть его десятичного логарифма плюс один.',
        nextLabel: 'Посчитать 2¹⁰⁰ →',
        build: function (box, api) {
          var wrap = U.el('div', 'col');
          wrap.innerHTML =
            '<div class="num-cards">' +
            '<div class="card"><div class="t">lg(100) = 2</div><div class="v">3 цифры</div></div>' +
            '<div class="card"><div class="t">lg(1000) = 3</div><div class="v">4 цифры</div></div>' +
            '<div class="card card--glow"><div class="t">547: между 100 и 1000</div><div class="v">lg(547) ≈ 2,74 → 3 цифры</div></div>' +
            '</div>' +
            '<div class="card card--glow center">' +
            '<p style="margin:0;font-size:clamp(16px,2.5vw,22px)">Количество цифр целого числа N:</p>' +
            '<div class="fm fm--big" style="margin:12px 0">⌊' + F.log('10', 'N') + '⌋ + 1</div>' +
            '<p class="muted" style="margin:0;font-size:14px">⌊ ⌋ — целая часть (округление вниз), не округление.</p>' +
            '</div>';
          box.appendChild(wrap);
          api.done();
        }
      },
      /* ---------- Шаг 3: 2^100 ---------- */
      {
        text: 'Логарифм двойки по основанию десять — примерно ноль целых тридцать одна тысячная. Значит, два в сотой — это десять в степени тридцать целых сто три тысячных. Это число больше десяти в тридцатой, но меньше десяти в тридцать первой. Ровно тридцать одна цифра.',
        nextLabel: 'Проверить точно →',
        build: function (box, api) {
          var wrap = U.el('div', 'col center');
          wrap.innerHTML =
            '<div class="fm fm--mid">lg(2) ≈ 0,30103</div>' +
            '<div class="fm fm--mid" style="margin:8px 0">2<sup>100</sup> = 10<sup>100 · 0,30103</sup> = 10<sup>' + F.res('30,103') + '</sup></div>' +
            '<p class="muted" style="margin:0">10<sup>30</sup> &lt; 2<sup>100</sup> &lt; 10<sup>31</sup> — значит, 31 цифра</p>' +
            '<div class="card card--glow" style="max-width:100%;margin-top:14px">' +
            '<p class="mono-digits muted center" style="margin:0 0 6px;font-family:var(--font-mono);word-break:break-all">1267650600228229401496703205376</p>' +
            '<div class="fm fm--big" style="color:var(--lime)">31</div>' +
            '<p class="muted" style="margin:6px 0 0;font-size:14px">Посчитано точно — длинной арифметикой (BigInt), без округлений.</p>' +
            '</div>';
          box.appendChild(wrap);
          api.done();
        }
      },
      /* ---------- Шаг 4: интерактив 1..500 ---------- */
      {
        text: 'Проверьте сами: двигайте показатель степени от одного до пятисот. Каждое число двойки считается точно, перемножением в длинной арифметике, а логарифм предсказывает количество цифр без единого умножения. Сравните колонки — они совпадают всегда.',
        nextLabel: 'Логарифм вокруг нас →',
        build: function (box, api) {
          var card = U.el('div', 'card');
          card.innerHTML =
            '<div class="field"><label for="powR">Показатель n: <b id="powV" style="color:var(--violet);font-family:var(--font-mono)">100</b></label>' +
            '<input id="powR" type="range" min="1" max="500" step="1" value="100"></div>' +
            '<div class="num-cards" style="margin-top:14px">' +
            '<div class="card" style="padding:14px 16px"><div class="t">2<sup id="pv1">100</sup> (точно)</div><div class="v" id="digitsV" style="color:var(--lime)"></div></div>' +
            '<div class="card" style="padding:14px 16px"><div class="t">по формуле ⌊n·lg 2⌋+1</div><div class="v" id="formulaV" style="color:var(--blue)"></div></div>' +
            '</div>' +
            '<p class="muted" id="numPreview" style="margin:12px 0 0;font-family:var(--font-mono);word-break:break-all;font-size:13px"></p>';
          box.appendChild(card);
          var rng = card.querySelector('#powR');
          function upd() {
            var n = parseInt(rng.value, 10);
            card.querySelector('#powV').textContent = String(n);
            card.querySelector('#pv1').textContent = String(n);
            var exact = digitsOfTwoPow(n);
            var byFormula = Math.floor(n * Math.log10(2)) + 1;
            card.querySelector('#digitsV').textContent = U.fmtInt(exact);
            card.querySelector('#formulaV').textContent = byFormula + (byFormula === exact ? ' ✓' : ' ⚠');
            var s = twoPowStr(n);
            if (s.length > 64) s = s.slice(0, 40) + ' … ' + s.slice(-20) + ' (' + exact + ' цифр)';
            card.querySelector('#numPreview').textContent = s;
          }
          rng.addEventListener('input', upd);
          upd();
          api.done();
        }
      }
    ]
  });
})();
