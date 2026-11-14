'use strict';
/* ЭПИЗОД 08 — ФИНАЛ. Масштабы 10⁶→10⁹, 2³³, финальный экран, кнопки и итоговый квиз. */
(function () {
  var U = LOG.U, F = LOG.F;
  var N = 1000000, DOTS = 20000, COLS = 200, ROWS = 100;

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
    var rnd = mulberry32(987654321);
    for (var j = DOTS - 1; j > 0; j--) {
      var k = Math.floor(rnd() * (j + 1));
      var t = arr[j]; arr[j] = arr[k]; arr[k] = t;
    }
    return arr;
  })();

  function miniField(box, api, height) {
    var st = LOG.canvas(box, { height: height || 240, alt: 'Поле чисел' });
    var off = document.createElement('canvas');
    var offCtx = off.getContext('2d');
    function paint() {
      off.width = Math.round(st.w * st.dpr);
      off.height = Math.round(st.h * st.dpr);
      offCtx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
      offCtx.clearRect(0, 0, st.w, st.h);
      var cw = st.w / COLS, ch = st.h / ROWS, r = Math.max(0.8, Math.min(cw, ch) * 0.27);
      for (var i = 0; i < DOTS; i++) {
        var idx = order[i];
        var c = idx % COLS, rr = Math.floor(idx / COLS);
        offCtx.beginPath();
        offCtx.arc((c + 0.5) * cw, (rr + 0.5) * ch, r, 0, 6.2832);
        offCtx.fillStyle = i < 200 ? 'rgba(200,255,86,.5)' : 'rgba(139,143,158,.2)';
        offCtx.fill();
      }
      st.ctx.clearRect(0, 0, st.w, st.h);
      st.ctx.drawImage(off, 0, 0, st.w, st.h);
    }
    paint();
    st.draw = paint;
    api.cleanup(function () { st.off(); });
    return st;
  }

  var QUIZ = [
    { q: 'log₄(16) = ?', opts: ['2', '4', '8', '1/2'], correct: 0,
      why: '4² = 16. Ответ 2 — потому что основание 4, а не 2: log₂(16) был бы равен 4.' },
    { q: 'Сколько вопросов нужно, чтобы гарантированно угадать число от 1 до 100?', opts: ['6', '7', '10', '100'], correct: 1,
      why: '⌈log₂(100)⌉ = ⌈6,64⌉ = 7. Шести не хватает: 2⁶ = 64 < 100, а 2⁷ = 128 ≥ 100.' },
    { q: 'log₂(0,5) = ?', opts: ['−1', '1', '2', '0,5'], correct: 0,
      why: '2⁻¹ = 1/2 = 0,5. Отрицательный показатель даёт дробь.' },
    { q: 'Какое выражение не существует?', opts: ['log₂(8)', 'log₅(1)', 'log₃(−9)', 'lg(100)'], correct: 2,
      why: 'Аргумент должен быть положительным (b > 0): ни −9, ни 0 нельзя получить степенью положительного основания.' },
    { q: 'Звук стал громче на +20 дБ. Интенсивность выросла…', opts: ['в 20 раз', 'в 100 раз', 'в 200 раз', 'в 10 000 раз'], correct: 1,
      why: '+10 дБ = ×10, значит +20 дБ = ×10² = 100. Шкала логарифмическая, а не линейная.' }
  ];

  LOG.register({
    id: 'e08',
    title: 'Финал — сила логарифма',
    steps: [
      {
        text: 'Вернёмся к первой игре. Миллион вариантов — двадцать вопросов. Уже знакомая картинка, но теперь вы знаете, почему это работает.',
        nextLabel: 'Увеличить поле →',
        build: function (box, api) {
          miniField(box, api, 240);
          var c = U.el('div', 'counters');
          c.innerHTML = '<span class="chip">Вариантов <b>1\u00A0000\u00A0000</b></span><span class="chip chip--lime">Вопросов <b>20</b></span>';
          box.appendChild(c);
          api.done();
        }
      },
      {
        text: 'Увеличим поле. Сто миллионов вариантов — двадцать семь вопросов. Миллиард — тридцать. Восемь миллиардов — население Земли — тридцать три вопроса. Два в тридцать третьей степени — восемь миллиардов пятьсот восемьдесят девять миллионов девятьсот тридцать четыре тысячи пятьсот девяносто два. Поле выросло в восемь тысяч раз, а вопросов прибавилось всего тринадцать.',
        nextLabel: 'Финальный экран →',
        build: function (box, api) {
          var wrap = U.el('div', 'col');
          var cards = U.el('div', 'scale-cards');
          cards.innerHTML =
            '<div class="card"><div class="n">1\u00A0000\u00A0000</div><div class="q">20 вопросов</div></div>' +
            '<div class="card"><div class="n">100\u00A0000\u00A0000</div><div class="q">27 вопросов</div></div>' +
            '<div class="card"><div class="n">1\u00A0000\u00A0000\u00A0000</div><div class="q">30 вопросов</div></div>' +
            '<div class="card"><div class="n">8\u00A0000\u00A0000\u00A0000</div><div class="q">33 вопроса</div></div>';
          wrap.appendChild(cards);
          var big = U.el('div', 'card card--glow center');
          big.innerHTML =
            '<div class="fm fm--mid">2<sup>33</sup> = ' + F.res('8\u00A0589\u00A0934\u00A0592') + '</div>' +
            '<p class="muted" style="margin:8px 0 0;font-size:14px">Более 8,5 млрд вариантов различаются 33 вопросами ДА/НЕТ. Каждое +10 млрд — всего +3–4 вопроса.</p>';
          wrap.appendChild(big);
          box.appendChild(wrap);
          if (!LOG.motion.reduced) {
            cards.querySelectorAll('.card').forEach(function (el, i) {
              el.style.opacity = '0'; el.style.transform = 'translateY(18px)';
              el.style.transition = 'opacity .5s, transform .5s';
              setTimeout(function () { el.style.opacity = '1'; el.style.transform = 'none'; }, 300 + i * 700);
            });
            var t = setTimeout(function () { api.done(); }, 300 + 4 * 700 + 300);
            api.cleanup(function () { clearTimeout(t); });
            api.lock('Масштабы растут…');
          } else api.done();
        }
      },
      {
        text: 'Логарифм — это не страшная математическая операция. Это просто ответ на вопрос: в какую степень? Теперь вы знаете, что такое логарифм. И самое главное — понимаете, зачем он существует.',
        nextLabel: 'Самопроверка →',
        build: function (box, api) {
          var wrap = U.el('div', 'finale-lines center');
          wrap.innerHTML =
            '<div class="l big-line" style="font-size:clamp(22px,4vw,46px)">ЛОГАРИФМ — ЭТО НЕ СТРАШНАЯ<br>МАТЕМАТИЧЕСКАЯ ОПЕРАЦИЯ</div>' +
            '<div class="l big-line accent" style="font-size:clamp(26px,5vw,60px)">ЭТО ОТВЕТ НА ВОПРОС:<br>В КАКУЮ СТЕПЕНЬ?</div>' +
            '<div class="l fm fm--big">' + F.pow('a', 'x') + ' = ' + F.arg('b') + ' <span class="muted">⇔</span> ' + F.log('a', 'b') + ' = ' + F.exp('x') + '</div>' +
            '<div class="l muted" style="font-size:clamp(15px,2.4vw,19px)">Теперь ты знаешь, что такое логарифм.<br>И самое главное — понимаешь, зачем он существует.</div>' +
            '<div class="l row row--center">' +
            '<button class="btn btn--accent" type="button" id="againBtn">Пройти ещё раз</button>' +
            '<button class="btn btn--ghost" type="button" id="hardBtn">Повторить сложные примеры</button>' +
            '<button class="btn btn--ghost" type="button" id="labBtn">Перейти к тренажёру</button>' +
            '</div>';
          box.appendChild(wrap);
          var lines = wrap.querySelectorAll('.l');
          lines.forEach(function (l, i) {
            setTimeout(function () { l.classList.add('show'); }, 350 + i * 850);
          });
          var eng = LOG.engine;
          wrap.querySelector('#againBtn').addEventListener('click', function () { eng.goTo(0, 0); });
          wrap.querySelector('#hardBtn').addEventListener('click', function () {
            var i = eng.eps.findIndex(function (e) { return e.id === 'e04'; });
            eng.goTo(i, 1); // сразу задачи
          });
          wrap.querySelector('#labBtn').addEventListener('click', function () {
            var i = eng.eps.findIndex(function (e) { return e.bonus; });
            eng.goTo(i, 0);
          });
          var t = setTimeout(function () { api.done(); }, 350 + lines.length * 850);
          api.cleanup(function () { clearTimeout(t); });
          api.lock('Финал собирается…');
        }
      },
      {
        text: 'Последняя самопроверка — пять вопросов по всему маршруту. После каждого ответа объяснение подскажет, где обычно путаются.',
        nextLabel: 'К тренажёру →',
        build: function (box, api) {
          var wrap = U.el('div', 'quiz');
          var scoreEl = U.el('p', 'muted center');
          box.appendChild(U.el('h3', 'big-line', 'Ты понял логарифмы?'));
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
                if (oi === qz.correct) { b.classList.add('ok'); correct++; }
                else { b.classList.add('err'); opts.children[qz.correct].classList.add('ok'); }
                why.innerHTML = qz.why;
                why.classList.add('show');
                scoreEl.innerHTML = 'Пройдено ' + answered + '/' + total + ' · верно ' + correct;
                if (answered >= total) {
                  api.done();
                  api.speak('Готово! Верно ' + correct + ' из ' + total + '. Загляните в тренажёр — там калькулятор, графики и логарифмическая шкала.');
                }
              });
              opts.appendChild(b);
            });
            wrap.appendChild(q);
          });
          scoreEl.textContent = 'Пройдено 0/' + total;
          api.lock('Ответьте на все пять вопросов');
        }
      }
    ]
  });
})();
