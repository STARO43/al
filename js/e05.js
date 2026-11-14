'use strict';
/* ЭПИЗОД 05 — ГДЕ ЛОГАРИФМ НЕ СУЩЕСТВУЕТ. Три интерактивных эксперимента и итоговые условия. */
(function () {
  var U = LOG.U, F = LOG.F;

  /* Эксперимент 1: основание 1 */
  function expOne(box, api) {
    var card = U.el('div', 'card');
    card.innerHTML =
      '<div class="center" style="margin-bottom:10px"><span class="fm fm--mid">' + F.log('1', '5') + ' = ' + F.exp('?') + '</span></div>' +
      '<p class="muted center" style="margin:0 0 14px">Проверьте степени единицы — выберите показатель:</p>' +
      '<div class="row row--center" id="powBtns"></div>' +
      '<div class="center" style="margin-top:14px"><span class="fm fm--mid" id="oneRes">1<sup>1</sup> = 1</span></div>';
    box.appendChild(card);
    var res = card.querySelector('#oneRes');
    var btns = card.querySelector('#powBtns');
    [1, 2, 10, 100].forEach(function (n) {
      var b = U.el('button', 'btn btn--ghost', String(n));
      b.type = 'button';
      b.addEventListener('click', function () {
        res.innerHTML = '1<sup>' + n + '</sup> = ' + F.res('1') + ' <span class="muted">(единица в любой степени — единица)</span>';
        api.speak('Единица в степени ' + n + ' равна единице.');
      });
      btns.appendChild(b);
    });

    var card2 = U.el('div', 'card');
    card2.innerHTML =
      '<div class="exp-grid">' +
      '<div class="card" style="padding:14px 16px"><h3 class="muted" style="margin:0 0 6px;font-family:var(--font-mono);font-size:14px">log₁(5)</h3>' +
      '<p style="margin:0">1 = 1 = 1 = … Пять <b class="badres">недостижима</b> ни при какой степени.</p></div>' +
      '<div class="card" style="padding:14px 16px"><h3 class="muted" style="margin:0 0 6px;font-family:var(--font-mono);font-size:14px">log₁(1)</h3>' +
      '<p style="margin:0">Подходит <b class="badres">любая</b> степень: 0, 7, 100. Ответа нет — однозначность потеряна.</p></div>' +
      '</div>' +
      '<p class="center" style="margin:14px 0 0;font-size:clamp(16px,2.6vw,22px)"><b style="color:var(--blue)">Вывод: основание не должно равняться 1.</b></p>';
    box.appendChild(card2);
    api.done();
  }

  /* Эксперимент 2: отрицательное основание и ноль */
  function expTwo(box, api) {
    var card = U.el('div', 'card');
    card.innerHTML =
      '<div class="row row--center" style="margin-bottom:12px">' +
      '<span class="muted">Основание:</span>' +
      '<div class="seg" role="group" aria-label="Выбор основания">' +
      '<button type="button" data-b="-2" aria-pressed="true">−2</button>' +
      '<button type="button" data-b="0" aria-pressed="false">0</button>' +
      '</div></div>' +
      '<div class="field"><label for="expRange">Показатель x: <b id="expVal" style="font-family:var(--font-mono);color:var(--violet)">2</b></label>' +
      '<input id="expRange" type="range" min="-3" max="3" step="0.5" value="2"></div>' +
      '<div class="center" style="margin-top:12px"><span class="fm fm--mid" id="negRes"></span></div>' +
      '<p class="muted center" style="font-size:13px;margin:6px 0 0" id="negNote"></p>';
    box.appendChild(card);
    var rng = card.querySelector('#expRange');
    var val = card.querySelector('#expVal');
    var out = card.querySelector('#negRes');
    var note = card.querySelector('#negNote');
    var base = -2;

    function fmtPow(b, x, v) {
      var xs = U.fmtDec(x, 1).replace(',0', '');
      return '(' + F.base(String(b)) + ')<sup>' + F.exp(xs) + '</sup> = ';
    }
    function upd() {
      var x = parseFloat(rng.value);
      val.textContent = U.fmtDec(x, 1).replace(',0', '');
      var isInt = Math.abs(x - Math.round(x)) < 1e-9;
      if (base === -2) {
        if (isInt) {
          var r = Math.pow(-2, Math.round(x));
          if (r >= 1 || r <= -1) out.innerHTML = fmtPow(base, x) + F.res(String(U.fmtSigned(r)));
          else {
            var fr = r > 0 ? '1/' + U.fmtDec(1 / r, 8).replace(/,?0+$/, '') : '−1/' + U.fmtDec(1 / -r, 8).replace(/,?0+$/, '');
            out.innerHTML = fmtPow(base, x) + F.res(fr);
          }
          note.textContent = 'При целом показателе отрицательное основание ещё «работает»…';
        } else {
          out.innerHTML = fmtPow(base, x) + '<span class="badres">не существует в действительных числах</span>';
          note.textContent = 'Корень чётной степени из отрицательного числа среди обычных чисел не определён.';
        }
      } else {
        if (x < 0) {
          out.innerHTML = fmtPow(base, x) + '<span class="badres">деление на ноль — не существует</span>';
          note.textContent = '0⁻¹ — это 1/0, а на ноль делить нельзя.';
        } else if (x === 0) {
          out.innerHTML = fmtPow(base, x) + '<span class="badres">не определено</span>';
          note.textContent = '0⁰ — неопределённость.';
        } else {
          out.innerHTML = fmtPow(base, x) + F.res('0') + ' <span class="muted">(и только 0 — никогда, например, 5)</span>';
          note.textContent = 'Ноль в положительной степени всегда ноль.';
        }
      }
    }
    card.querySelectorAll('.seg button').forEach(function (b) {
      b.addEventListener('click', function () {
        card.querySelectorAll('.seg button').forEach(function (o) { o.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        base = parseInt(b.dataset.b, 10);
        upd();
      });
    });
    rng.addEventListener('input', upd);
    upd();

    var card2 = U.el('div', 'card center');
    card2.innerHTML =
      '<p style="margin:0;font-size:clamp(16px,2.6vw,22px)">Отрицательное основание не задаёт корректную степенную функцию на всех действительных показателях, а ноль вообще не порождает осмысленных степеней.</p>' +
      '<p style="margin:10px 0 0;font-size:clamp(18px,3vw,26px)"><b style="color:var(--blue)">Вывод: a &gt; 0.</b></p>';
    box.appendChild(card2);
    api.done();
  }

  /* Эксперимент 3: аргумент — степень двойки всегда положительна */
  function expThree(box, api) {
    var card = U.el('div', 'card');
    card.innerHTML =
      '<div class="center" style="margin-bottom:8px"><span class="fm fm--mid">' + F.log('2', '−8') + ' = ' + F.exp('?') + '</span></div>' +
      '<p class="muted center" style="margin:0 0 10px">Пробегаем степени двойки и ищем −8 или 0:</p>' +
      '<div class="field"><label for="powRange">Показатель: <b id="pwVal" style="font-family:var(--font-mono);color:var(--violet)">0</b></label>' +
      '<input id="powRange" type="range" min="-3" max="3" step="1" value="0"></div>' +
      '<div class="center" style="margin-top:10px"><span class="fm fm--mid" id="pwRes"></span></div>' +
      '<div class="row row--center" style="margin-top:8px">' +
      '<span class="chip chip--orange">цель: −8 — <b>недостижима</b></span>' +
      '<span class="chip chip--orange">цель: 0 — <b>недостижима</b></span>' +
      '</div>';
    box.appendChild(card);
    var rng = card.querySelector('#powRange');
    var val = card.querySelector('#pwVal');
    var out = card.querySelector('#pwRes');
    function upd() {
      var n = parseInt(rng.value, 10);
      val.textContent = String(n);
      var v = Math.pow(2, n);
      var text;
      if (n < 0) {
        var fr = '1/' + Math.pow(2, -n);
        text = '2<sup>' + n + '</sup> = ' + F.res(fr) + ' <span class="chip chip--lime" style="font-size:12px">положительно</span>';
      } else {
        text = '2<sup>' + n + '</sup> = ' + F.res(U.fmtInt(v)) + ' <span class="chip chip--lime" style="font-size:12px">положительно</span>';
      }
      out.innerHTML = text;
    }
    rng.addEventListener('input', upd);
    upd();

    var card2 = U.el('div', 'card center');
    card2.innerHTML =
      '<p style="margin:0;font-size:clamp(16px,2.6vw,22px)">Ни одна действительная степень положительного основания не даст ни отрицательного числа, ни нуля.</p>' +
      '<p style="margin:10px 0 0;font-size:clamp(18px,3vw,26px)"><b style="color:var(--blue)">Вывод: аргумент тоже должен быть положительным — b &gt; 0.</b></p>';
    box.appendChild(card2);
    api.done();
  }

  LOG.register({
    id: 'e05',
    title: 'Где логарифм не существует',
    steps: [
      {
        text: 'Попробуем сломать логарифм — это лучший способ понять, зачем ему условия. Три эксперимента: основание один, отрицательное основание и ноль, отрицательный аргумент.',
        nextLabel: 'Эксперимент 1 →',
        build: function (box, api) {
          var wrap = U.el('div', 'row row--center');
          wrap.innerHTML =
            '<span class="chip chip--blue">эксперимент 1 · основание = 1</span>' +
            '<span class="chip chip--orange">эксперимент 2 · a = −2 и a = 0</span>' +
            '<span class="chip chip--violet">эксперимент 3 · аргумент = −8</span>';
          box.appendChild(wrap);
          api.done();
        }
      },
      { text: 'Эксперимент первый: основание равно единице. Логарифм пяти по основанию один: единица в любой степени — единица, пять недостижимо. А логарифм единицы по основанию один? Подходит любая степень, однозначного ответа нет. Основание не должно равняться единице.', build: expOne, nextLabel: 'Эксперимент 2 →' },
      { text: 'Эксперимент второй: отрицательное основание. Минус два в квадрате — четыре, всё честно. Но минус два в степени одна вторая — корень из минус двух — действительного значения не имеет. Отрицательное основание не задаёт корректную степенную функцию на всех показателях. Ноль тоже не годится: ноль в минус первой — деление на ноль. Значит, основание должно быть положительным.', build: expTwo, nextLabel: 'Эксперимент 3 →' },
      { text: 'Эксперимент третий: отрицательный аргумент. Логарифм минус восьми по основанию два. Пробегаем степени двойки от минус третьей до третьей: одна восьмая, одна четвёртая, одна вторая, один, два, четыре, восемь. Все результаты положительные. Ни одна степень двойки не даст ни минус восьми, ни нуля. Аргумент должен быть положительным.', build: expThree, nextLabel: 'Итог →' },
      {
        text: 'Итак, три условия существования действительного логарифма: основание больше нуля, основание не равно единице, аргумент больше нуля. При них логарифм всегда существует и ровно один.',
        nextLabel: 'Логарифм считает цифры →',
        build: function (box, api) {
          var wrap = U.el('div', 'col center');
          var conds = U.el('div', 'conditions');
          conds.innerHTML =
            '<div class="cond cond--a">a &gt; 0</div>' +
            '<div class="cond cond--a1">a ≠ 1</div>' +
            '<div class="cond cond--b">b &gt; 0</div>';
          wrap.appendChild(conds);
          var sum = U.el('p', 'muted', 'Каждое условие появилось после своего эксперимента — не заучивайте, а вспоминайте сломанный эксперимент.');
          wrap.appendChild(sum);
          box.appendChild(wrap);
          if (LOG.motion.reduced) {
            conds.querySelectorAll('.cond').forEach(function (c) { c.classList.add('show'); });
            api.done(); return;
          }
          var cs = conds.querySelectorAll('.cond');
          var t = [];
          cs.forEach(function (c, i) {
            t.push(setTimeout(function () {
              c.classList.add('show');
              api.speak(['Основание больше нуля.', 'Основание не равно единице.', 'Аргумент больше нуля.'][i]);
            }, 700 + i * 900));
          });
          t.push(setTimeout(function () { api.done(); }, 700 + cs.length * 900 + 200));
          api.cleanup(function () { t.forEach(clearTimeout); });
          api.lock('Условия собираются…');
        }
      }
    ]
  });
})();
