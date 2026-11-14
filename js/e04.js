'use strict';
/* ЭПИЗОД 04 — СЧИТАЕМ ВМЕСТЕ. Шесть задач с самопроверкой и живой визуализацией степеней + квиз. */
(function () {
  var U = LOG.U, F = LOG.F;

  /* Данные задач */
  var TASKS = [
    {
      a: 2, b: 8, ans: 3,
      hint: 'Считайте по шагам: 2 · 2 = 4, 4 · 2 = 8.',
      eq: '2<sup>3</sup> = 8',
      chain: { vals: [2, 4, 8], op: '× 2' },
      note: 'Три умножения двойки на себя — ответ 3.'
    },
    {
      a: 3, b: 81, ans: 4,
      hint: 'Умножайте на 3: 3 → 9 → 27 → …',
      eq: '3<sup>4</sup> = 81',
      chain: { vals: [3, 9, 27, 81], op: '× 3' },
      note: 'Четыре шага — ответ 4.'
    },
    {
      a: 10, b: 1000, ans: 3,
      hint: 'Сколько нулей у тысячи? Проверьте через умножение на 10.',
      eq: '10<sup>3</sup> = 1000',
      chain: { vals: [10, 100, 1000], op: '× 10' },
      note: 'Такой логарифм называют десятичным и записывают коротко: lg(1000) = 3.'
    },
    {
      a: 5, b: 1, ans: 0,
      hint: 'Какая степень даёт единицу? Вспомните: 5 · 5 = 25, а что даёт «ничего не умножать»?',
      eq: '5<sup>0</sup> = 1',
      chain: { vals: [125, 25, 5, 1], op: '÷ 5', labels: ['5³', '5²', '5¹', '5⁰'] },
      note: 'Правило нулевой степени: любое число (кроме 0) в степени 0 равно 1.'
    },
    {
      a: 2, b: '1/8', ans: -3,
      hint: 'Степень может быть отрицательной: 2⁻¹ = 1/2. Продолжайте делить на 2.',
      eq: '2<sup>−3</sup> = 1/8',
      chain: { vals: [0.5, 0.25, 0.125], op: '÷ 2', labels: ['2⁻¹ = 1/2', '2⁻² = 1/4', '2⁻³ = 1/8'], neg: true },
      note: 'Логарифм бывает отрицательным: чтобы получить дробь, показатель должен быть меньше нуля.'
    },
    {
      a: 9, b: 3, ans: '1/2',
      hint: 'Здесь степень дробная: попробуйте √9.',
      eq: '9<sup>1/2</sup> = √9 = 3',
      chain: { vals: [3], op: '√', labels: ['9^(1/2) = √9 = 3'] },
      note: 'Дробная степень — извлечение корня: a^(1/2) — это квадратный корень из a.'
    }
  ];

  var QUIZ = [
    {
      q: 'log₂(32) = ?',
      opts: ['4', '5', '6', '16'], correct: 1,
      why: '2⁵ = 32 (2 · 2 · 2 · 2 · 2). Вариант 16 — это значение 2⁴, вы перепутали аргумент с результатом.'
    },
    {
      q: 'log₃(1) = ?',
      opts: ['0', '1', '3', 'нет ответа'], correct: 0,
      why: 'Любое число в нулевой степени равно 1, значит 3⁰ = 1 и логарифм равен 0.'
    },
    {
      q: 'log₂(1/4) = ?',
      opts: ['2', '−2', '1/2', '−4'], correct: 1,
      why: 'Идём вниз по степеням: 2⁻¹ = 1/2, 2⁻² = 1/4. Ответ −2.'
    },
    {
      q: 'log₄(2) = ?',
      opts: ['2', '1/2', '4', '−2'], correct: 1,
      why: '4^(1/2) = √4 = 2. Основание больше аргумента — ответ дробный: одна вторая.'
    }
  ];

  function bigFormula(t) {
    return F.log(String(t.a), t.b === '1/8' ? F.fraq('1', '8') : String(t.b));
  }

  /* Одная задача */
  function taskCard(box, api, t, idx, solvedState) {
    var card = U.el('div', 'card task');
    card.innerHTML =
      '<p class="muted" style="margin:0 0 4px">Задача ' + (idx + 1) + ' из 6</p>' +
      '<div class="task__formula"><span class="fm fm--big">' + bigFormula(t) + ' = ?</span></div>' +
      '<p class="muted center" style="margin:0 0 14px">В какую степень нужно возвести ' + F.base(String(t.a)) + '?</p>' +
      '<div class="task__answer">' +
      '<input id="ans' + idx + '" type="text" inputmode="text" placeholder="ответ" aria-label="Ваш ответ (можно дробь 1/2)">' +
      '<button id="chk' + idx + '" class="btn btn--accent" type="button">Ответить</button>' +
      '<button id="sol' + idx + '" class="btn btn--ghost" type="button" hidden>Показать решение</button>' +
      '</div>' +
      '<p class="feedback center" id="fb' + idx + '" aria-live="polite"></p>' +
      '<div class="chain" id="ch' + idx + '"></div>' +
      '<p class="center" id="eq' + idx + '" style="margin:0"><span class="fm fm--mid" style="display:none">' + t.eq + '</span></p>';
    box.appendChild(card);
    return card;
  }

  function animateChain(container, t) {
    container.innerHTML = '';
    var max = Math.max.apply(null, t.chain.vals);
    t.chain.vals.forEach(function (v, i) {
      var cb = U.el('div', 'cb');
      var hgt = Math.round(20 + 110 * Math.sqrt(v / max));
      cb.innerHTML =
        '<div class="bar' + (t.chain.neg ? ' neg' : '') + '" style="height:' + hgt + 'px"></div>' +
        '<div class="v">' + (t.chain.labels ? t.chain.labels[i] : (i === 0 ? String(v) : String(t.chain.vals.slice(0, i + 1).join(' · ')))) + '</div>';
      if (!LOG.motion.reduced) {
        cb.style.animationDelay = (i * 0.5) + 's';
        if (i > 0) {
          var arrow = U.el('div', 'muted', t.chain.op + ' →');
          arrow.style.cssText = 'align-self:center;opacity:0;animation:rise .4s ' + (i * 0.5 - 0.25) + 's forwards';
          container.appendChild(arrow);
        }
      }
      container.appendChild(cb);
    });
    if (LOG.motion.reduced) {
      container.querySelectorAll('.cb').forEach(function (cb) { cb.style.opacity = 1; });
    }
  }

  function checkValue(t, val) {
    var expect = typeof t.ans === 'number' ? t.ans : 0.5;
    return Math.abs(val - expect) < 1e-9;
  }

  function buildTask(box, api, t, idx) {
    var card = taskCard(box, api, t, idx);
    var inp = card.querySelector('#ans' + idx);
    var fb = card.querySelector('#fb' + idx);
    var btn = card.querySelector('#chk' + idx);
    var solBtn = card.querySelector('#sol' + idx);
    var ch = card.querySelector('#ch' + idx);
    var eq = card.querySelector('#eq' + idx).firstElementChild;
    var tried = false;

    function submit() {
      var v = U.parseNum(inp.value);
      if (isNaN(v)) { fb.className = 'feedback center feedback--err'; fb.textContent = 'Введите число: например 3 или дробь 1/2.'; return; }
      if (checkValue(t, v)) {
        fb.className = 'feedback center feedback--ok';
        fb.textContent = 'Верно!';
        eq.style.display = 'inline-block';
        animateChain(ch, t);
        var note = U.el('p', 'muted center', t.note);
        note.style.marginTop = '8px';
        card.appendChild(note);
        api.speak('Верно. ' + t.note);
        api.done();
      } else {
        fb.className = 'feedback center feedback--err';
        fb.textContent = 'Пока не то. ' + t.hint;
        if (!tried) { solBtn.hidden = false; tried = true; }
        api.lock('Ответьте или посмотрите решение');
      }
    }
    btn.addEventListener('click', submit);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    solBtn.addEventListener('click', function () {
      eq.style.display = 'inline-block';
      animateChain(ch, t);
      var note = U.el('p', 'muted center', t.note);
      note.style.marginTop = '8px';
      card.appendChild(note);
      fb.className = 'feedback center';
      fb.innerHTML = 'Разбор выше. Ответ: <b style="color:var(--lime)">' + (typeof t.ans === 'number' ? t.ans : '1/2') + '</b>.';
      api.speak('Разбор. ' + t.note);
      api.done();
    });
    api.lock('Ответьте на задачу ' + (idx + 1));
  }

  /* Квиз из четырёх вопросов */
  function buildQuiz(box, api) {
    var wrap = U.el('div', 'quiz');
    var scoreEl = U.el('p', 'muted center');
    box.appendChild(U.el('h3', 'big-line', 'Проверочный квиз'));
    box.appendChild(wrap);
    box.appendChild(scoreEl);
    var answered = 0, correct = 0, total = QUIZ.length;
    QUIZ.forEach(function (qz, qi) {
      var q = U.el('div', 'q');
      q.innerHTML = '<h3>' + (qi + 1) + '. ' + qz.q + '</h3><div class="opts"></div><p class="why" aria-live="polite"></p>';
      var opts = q.querySelector('.opts');
      var why = q.querySelector('.why');
      var done = false;
      qz.opts.forEach(function (o, oi) {
        var b = U.el('button', null, o);
        b.type = 'button';
        b.addEventListener('click', function () {
          if (done) return;
          done = true;
          q.dataset.done = '1';
          answered++;
          if (oi === qz.correct) {
            b.classList.add('ok');
            correct++;
          } else {
            b.classList.add('err');
            opts.children[qz.correct].classList.add('ok');
          }
          why.innerHTML = qz.why;
          why.classList.add('show');
          scoreEl.innerHTML = 'Пройдено ' + answered + '/' + total + ' · верно ' + correct;
          if (answered >= total) {
            api.done();
            api.speak('Квиз пройден. Верно ' + correct + ' из ' + total + '. ' + (correct === total ? 'Отлично!' : 'Перечитайте объяснения — они показывают, где именно путаются.'));
          }
        });
        opts.appendChild(b);
      });
      wrap.appendChild(q);
    });
    scoreEl.textContent = 'Пройдено 0/' + total;
    api.lock('Ответьте на все вопросы квиза');
  }

  LOG.register({
    id: 'e04',
    title: 'Считаем вместе',
    steps: [
      {
        text: 'Добро пожаловать в лабораторию. Правило одно: логарифм отвечает на вопрос «в какую степень нужно возвести основание, чтобы получить аргумент?». Шесть задач — сначала отвечайте сами, потом смотрите решение с анимацией.',
        nextLabel: 'Задача 1 →',
        build: function (box, api) {
          var wrap = U.el('div', 'card card--glow center');
          wrap.innerHTML =
            '<div class="fm fm--mid">' + F.log('a', 'b') + ' = ' + F.exp('?') + '</div>' +
            '<p class="muted" style="margin:10px 0 0">«В какую степень?» — единственный вопрос, на который отвечает логарифм. Основание синее, аргумент оранжевый, ответ фиолетовый.</p>';
          box.appendChild(wrap);
          api.done();
        }
      },
      { text: 'Начнём с классики: логарифм восьми по основанию два. В какую степень нужно возвести двойку, чтобы получить восемь? Считайте: два, четыре, восемь. Три умножения — ответ три.', build: function (b, a) { buildTask(b, a, TASKS[0], 0); }, nextLabel: 'Задача 2 →' },
      { text: 'Логарифм восьмидесяти одного по основанию три. Три, девять, двадцать семь, восемьдесят один. Четыре шага — ответ четыре.', build: function (b, a) { buildTask(b, a, TASKS[1], 1); }, nextLabel: 'Задача 3 →' },
      {
        text: 'Логарифм тысячи по основанию десять. Сто, тысяча. Ответ три. Такой логарифм называют десятичным и записывают сокращённо: lg. Именно он живёт в шкале децибел и в подсчёте цифр.',
        build: function (b, a) { buildTask(b, a, TASKS[2], 2); }, nextLabel: 'Задача 4 →'
      },
      {
        text: 'Логарифм единицы по основанию пять. В какую степень возвести пять, чтобы получить один? Двигаемся вниз: пять в кубе — сто двадцать пять, в квадрате — двадцать пять, в первой — пять, а в нулевой — один. Ответ ноль. Любое число в нулевой степени равно единице.',
        build: function (b, a) { buildTask(b, a, TASKS[3], 3); }, nextLabel: 'Задача 5 →'
      },
      {
        text: 'Логарифм одной восьмой по основанию два. Теперь степени идут вниз: две в минус первой — одна вторая, в минус второй — одна четвёртая, в минус третьей — одна восьмая. Ответ минус три. Да, логарифмы бывают отрицательными.',
        build: function (b, a) { buildTask(b, a, TASKS[4], 4); }, nextLabel: 'Задача 6 →'
      },
      {
        text: 'Логарифм трёх по основанию девять. Здесь степень дробная: девять в одной второй — это квадратный корень из девяти, то есть три. Ответ — одна вторая. Дробная степень всегда означает извлечение корня.',
        build: function (b, a) { buildTask(b, a, TASKS[5], 5); }, nextLabel: 'Итог →'
      },
      {
        text: 'Подведём итог. Логарифм может быть положительным, нулевым, отрицательным и даже дробным. Но вопрос всегда один: в какую степень? Теперь короткий квиз из четырёх вопросов.',
        nextLabel: 'Квиз →',
        build: function (box, api) {
          var wrap = U.el('div', 'col');
          wrap.innerHTML =
            '<div class="conditions">' +
            '<span class="chip chip--blue">положительный</span>' +
            '<span class="chip">нулевой</span>' +
            '<span class="chip chip--orange">отрицательный</span>' +
            '<span class="chip chip--violet">дробный</span>' +
            '</div>' +
            '<div class="card card--glow center"><p style="margin:0;font-size:clamp(18px,3vw,26px)">Но вопрос всегда один: <b style="color:var(--violet)">в какую степень?</b></p></div>';
          box.appendChild(wrap);
          api.done();
        }
      },
      {
        text: 'Проверьте себя: четыре коротких вопроса. После каждого ответа — объяснение, которое покажет, где обычно путаются.',
        nextLabel: 'К условиям существования →',
        build: function (box, api) { buildQuiz(box, api); }
      }
    ]
  });
})();
