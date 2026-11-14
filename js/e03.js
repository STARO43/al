'use strict';
/* ЭПИЗОД 03 — ЧТО ТАКОЕ ЛОГАРИФМ. Степени двойки, формула aˣ=b, определение, история. */
(function () {
  var U = LOG.U, F = LOG.F;

  LOG.register({
    id: 'e03',
    title: 'Что такое логарифм',
    steps: [
      /* ---------- Шаг 1: удвоение ---------- */
      {
        text: 'Смотрите: один, два, четыре, восемь, шестнадцать, тридцать два… Каждое число вдвое больше предыдущего. Так растут степени двойки — самый честный способ удваивать. Запомните этот ритм: он сейчас всё объяснит.',
        nextLabel: 'Задать вопрос →',
        build: function (box, api) {
          var wrap = U.el('div', 'col');
          var seqEl = U.el('div', 'powseq card', '');
          wrap.appendChild(seqEl);
          var btn = U.el('button', 'btn btn--ghost', '⟲ Повторить');
          btn.type = 'button';
          wrap.appendChild(btn);
          box.appendChild(wrap);

          var seq = [1, 2, 4, 8, 16, 32, 64, 128, 256];
          var timers = [];
          function run() {
            timers.forEach(clearTimeout); timers = [];
            seqEl.innerHTML = '';
            seq.forEach(function (v, i) {
              timers.push(setTimeout(function () {
                var n = U.el('span', 'n', String(v));
                n.style.fontSize = (18 + Math.sqrt(v) * 5.5) + 'px';
                n.style.color = v === 256 ? 'var(--lime)' : (i % 2 ? 'var(--blue)' : 'var(--ink)');
                n.style.opacity = '0';
                n.style.transform = 'scale(.6)';
                n.style.transition = 'opacity .35s, transform .35s';
                seqEl.appendChild(n);
                requestAnimationFrame(function () { n.style.opacity = '1'; n.style.transform = 'scale(1)'; });
              }, i * (LOG.motion.reduced ? 0 : 420)));
            });
          }
          btn.addEventListener('click', run);
          run();
          api.cleanup(function () { timers.forEach(clearTimeout); });
          api.done();
        }
      },
      /* ---------- Шаг 2: миллион между степенями ---------- */
      {
        text: 'Сколько раз нужно умножить двойку на саму себя, чтобы получить миллион? Два в девятнадцатой — пятьсот двадцать четыре тысячи двести восемьдесят восемь. Два в двадцатой — миллион сорок восемь тысяч пятьсот семьдесят шесть. Миллион прячется между этими степенями — значит, ответ около двадцати.',
        nextLabel: 'Собрать формулу →',
        build: function (box, api) {
          var wrap = U.el('div', 'col');
          wrap.innerHTML =
            '<div class="num-cards">' +
            '<div class="card"><div class="t">2<sup>19</sup></div><div class="v">' + U.fmtInt(524288) + '</div><p class="muted" style="font-size:13px;margin:6px 0 0">миллиона ещё нет</p></div>' +
            '<div class="card card--glow"><div class="t">2<sup>20</sup></div><div class="v" style="color:var(--lime)">' + U.fmtInt(1048576) + '</div><p class="muted" style="font-size:13px;margin:6px 0 0">миллион уже пройден</p></div>' +
            '</div>' +
            '<div class="card">' +
            '<p class="muted" style="margin:0 0 8px">Линейка от 2<sup>19</sup> до 2<sup>20</sup> — миллион почти у её правого края:</p>' +
            '<svg id="stripSvg" viewBox="0 0 640 84" role="img" aria-label="Миллион лежит между степенями 2^19 и 2^20, ближе к верхней границе"></svg>' +
            '</div>';
          box.appendChild(wrap);
          var svg = wrap.querySelector('#stripSvg');
          var lo = 524288, hi = 1048576, mid = 1000000;
          var X = function (v) { return 24 + ((v - lo) / (hi - lo)) * 592; };
          var y = 46;
          var ns = 'http://www.w3.org/2000/svg';
          function addEl(t, attrs, text) {
            var e = document.createElementNS(ns, t);
            for (var k in attrs) e.setAttribute(k, attrs[k]);
            if (text != null) e.textContent = text;
            svg.appendChild(e);
            return e;
          }
          addEl('line', { x1: 24, y1: y, x2: 616, y2: y, stroke: 'rgba(139,143,158,.5)', 'stroke-width': 2 });
          addEl('rect', { x: 24, y: y - 12, width: 592, height: 12, fill: 'url(#g1)' });
          var defs = addEl('defs', {});
          defs.innerHTML = '<linearGradient id="g1"><stop offset="0" stop-color="#6C8CFF"/><stop offset="1" stop-color="#AA78FF"/></linearGradient>';
          addEl('circle', { cx: X(lo), cy: y, r: 6, fill: '#6C8CFF' });
          addEl('circle', { cx: X(hi), cy: y, r: 6, fill: '#AA78FF' });
          addEl('text', { x: 24, y: y + 30, fill: '#898F9E', 'font-size': 13, 'font-family': 'monospace' }, U.fmtInt(lo));
          addEl('text', { x: 616 - 60, y: y + 30, fill: '#898F9E', 'font-size': 13, 'font-family': 'monospace', 'text-anchor': 'end' }, U.fmtInt(hi));
          addEl('line', { x1: X(mid), y1: y - 34, x2: X(mid), y2: y + 8, stroke: '#C8FF56', 'stroke-width': 2.5, 'stroke-dasharray': '5 4' });
          addEl('text', { x: Math.min(X(mid) - 30, 500), y: y - 40, fill: '#C8FF56', 'font-size': 14, 'font-weight': 700, 'font-family': 'monospace' }, '1 000 000');
          api.done();
        }
      },
      /* ---------- Шаг 3: формула aˣ = b ---------- */
      {
        text: 'Любую связь трёх чисел можно записать одной формулой: a в степени x равно b. Основание, показатель, результат. Если неизвестен результат — просто возводим в степень. Если неизвестно основание — можно извлечь корень. Но если неизвестен показатель? Для этого вопроса у математики есть специальный инструмент.',
        nextLabel: 'Встречайте: логарифм →',
        build: function (box, api) {
          var wrap = U.el('div', 'col center');
          wrap.innerHTML =
            '<div class="fm fm--big formula-parts" style="margin:10px 0">' +
            '<span class="part" id="pa">' + F.base('a') + '</span><sup class="part" id="px">' + F.exp('x') + '</sup>' +
            '<span class="part"> = </span><span class="part" id="pb">' + F.arg('b') + '</span>' +
            '</div>' +
            '<div class="row row--center" id="hints">' +
            '<span class="chip" id="h1">Неизвестно <b>b</b> — возводим в степень</span>' +
            '<span class="chip" id="h2">Неизвестно <b>a</b> — извлекаем корень</span>' +
            '<span class="chip chip--violet" id="h3">Неизвестно <b>x</b> — ?</span>' +
            '</div>';
          box.appendChild(wrap);
          var t = [];
          var pa = wrap.querySelector('#pa'), px = wrap.querySelector('#px'), pb = wrap.querySelector('#pb');
          var h1 = wrap.querySelector('#h1'), h2 = wrap.querySelector('#h2'), h3 = wrap.querySelector('#h3');
          [pa, px, pb, h1, h2, h3].forEach(function (e) { e.style.opacity = '0'; e.style.transition = 'opacity .5s, transform .5s'; });
          function step(i, fn) { t.push(setTimeout(fn, i * 1100)); }
          step(1, function () { pa.style.opacity = '1'; pa.style.transform = 'scale(1.15)'; });
          step(1.35, function () { pa.style.transform = 'none'; px.style.opacity = '1'; });
          step(1.7, function () { pb.style.opacity = '1'; });
          step(2.4, function () { h1.style.opacity = '1'; pb.style.transform = 'scale(1.2)'; pb.style.filter = 'drop-shadow(0 0 14px rgba(255,148,94,.8))'; });
          step(3.4, function () { pb.style.transform = 'none'; pb.style.filter = 'none'; h2.style.opacity = '1'; pa.style.transform = 'scale(1.2)'; pa.style.filter = 'drop-shadow(0 0 14px rgba(108,140,255,.8))'; });
          step(4.4, function () { pa.style.transform = 'none'; pa.style.filter = 'none'; h3.style.opacity = '1'; px.style.transform = 'scale(1.25)'; px.style.filter = 'drop-shadow(0 0 16px rgba(170,120,255,.9))'; });
          step(5.2, function () { api.done(); });
          api.cleanup(function () { t.forEach(clearTimeout); });
          api.lock('Смотрите, как собирается формула…');
        }
      },
      /* ---------- Шаг 4: ЛОГАРИФМ + определение ---------- */
      {
        text: 'Для вопроса «в какую степень?» у математики есть специальное слово — логарифм. Логарифм числа b по основанию a — это показатель степени x, в которую нужно возвести a, чтобы получить b. Записи a в степени x равно b и логарифм b по основанию a равен x — это одна и та же связь, просто прочитанная с разных сторон.',
        nextLabel: 'Посчитать с игрой →',
        build: function (box, api) {
          var wrap = U.el('div', 'col center');
          var w = U.el('div', 'word-reveal kinetic', 'ЛОГАРИФМ');
          wrap.appendChild(w);
          var def = U.el('div', 'card card--glow');
          def.innerHTML =
            '<p style="font-size:clamp(16px,2.6vw,20px);margin:0"><b>Определение.</b> Логарифм числа ' + F.arg('b') + ' по основанию ' + F.base('a') +
            ' — это показатель степени ' + F.exp('x') + ', в которую необходимо возвести ' + F.base('a') + ', чтобы получить ' + F.arg('b') + '.</p>' +
            '<div class="fm fm--mid" style="margin-top:16px">' + F.pow('a', 'x') + ' = ' + F.arg('b') +
            ' <span class="muted">⇔</span> ' + F.log('a', 'b') + ' = ' + F.exp('x') + '</div>' +
            '<p class="muted" style="margin:10px 0 0;font-size:14px">Одна и та же зависимость — двумя записями. Читается: «логарифм b по основанию a».</p>';
          wrap.appendChild(def);
          box.appendChild(wrap);
          if (LOG.motion.reduced) { api.done(); return; }
          w.querySelectorAll('.ch').forEach(function (ch, i) { ch.style.setProperty('--i', i); });
          var t = setTimeout(function () { api.done(); }, 1400);
          api.cleanup(function () { clearTimeout(t); });
        }
      },
      /* ---------- Шаг 5: считаем с игрой ---------- */
      {
        text: 'Возвращаемся к игре. Логарифм миллиона по основанию два равен примерно девятнадцати целым девяносто трём сотым. Округляем вверх — получаем двадцать вопросов. Правило: чтобы гарантированно различить N вариантов вопросами «да или нет», достаточно округлённого вверх логарифма от N.',
        nextLabel: 'Заглянуть в историю →',
        build: function (box, api) {
          var wrap = U.el('div', 'col center');
          wrap.innerHTML =
            '<div class="fm fm--mid" style="margin:6px 0">' + F.log('2', '1\u00A0000\u00A0000') + ' ≈ ' + F.res('19,93') + ' <span class="muted">→</span> <span class="chip chip--lime" style="font-size:16px"><b>20 вопросов</b></span></div>' +
            '<div class="card card--glow" style="max-width:640px">' +
            '<p style="margin:0;font-size:clamp(16px,2.5vw,20px)"><b>Правило минимума вопросов.</b> Чтобы различить ' + F.arg('N') + ' вариантов вопросами ДА/НЕТ, достаточно</p>' +
            '<div class="fm fm--mid" style="margin:10px 0">⌈' + F.log('2', 'N') + '⌉</div>' +
            '<p class="muted" style="margin:0;font-size:14px">вопросов — логарифм с округлением вверх. Для миллиона: 19,93 → 20.</p>' +
            '</div>';
          box.appendChild(wrap);
          api.done();
        }
      },
      /* ---------- Шаг 6: история ---------- */
      {
        text: 'Слово «логарифм» придумал шотландский математик Джон Непер. В тысяча шестьсот четырнадцатом году он опубликовал труд, который превратил многодневные вычисления в минуты — астрономы и мореплаватели вздохнули свободно. Logos и arithmos — «отношение» и «число».',
        nextLabel: 'Считать самому →',
        build: function (box, api) {
          var wrap = U.el('div', 'card center col');
          wrap.innerHTML =
            '<div class="hist" style="justify-content:center">' +
            '<div class="year">1614</div>' +
            '<div style="text-align:left;max-width:420px">' +
            '<p style="margin:0 0 8px"><b>Джон Непер</b>, шотландский математик, публикует первый труд о логарифмах.</p>' +
            '<p class="muted" style="margin:0 0 10px">Таблицы Непера позволяли заменить умножение — сложением. Астрономы назвали это «сокращением труда вдвое».</p>' +
            '<div class="row" style="justify-content:flex-start">' +
            '<span class="chip chip--blue">греч. <b>logos</b> — «отношение»</span>' +
            '<span class="chip chip--orange">греч. <b>arithmos</b> — «число»</span>' +
            '</div></div></div>';
          box.appendChild(wrap);
          api.done();
        }
      }
    ]
  });
})();
