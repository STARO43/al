'use strict';
/* ============================================================
   LOGARITHM — озвучка (Web Speech API) и синхронизация субтитров.
   Озвучка запускается только после действия пользователя.
   ============================================================ */
(function () {
  var U = LOG.U;
  var synth = ('speechSynthesis' in window) ? window.speechSynthesis : null;

  var state = {
    voices: [], ru: [], selected: null,
    speaking: false, paused: false,
    chain: [],
    userActive: false,
    stepText: ''      // текст текущего шага — для «повторить»
  };

  function supported() { return !!synth; }
  function canSpeak() { return state.userActive && !!synth; }
  function speakingNow() { return state.speaking && !state.paused; }

  function refreshVoices() {
    if (!synth) {
      var note = U.$('voiceNote');
      if (note) note.textContent = 'В этом браузере нет синтеза речи (speechSynthesis). Весь материал доступен текстом и субтитрами.';
      var row = U.$('voiceRow');
      if (row) row.style.display = 'none';
      return;
    }
    state.voices = synth.getVoices() || [];
    state.ru = state.voices.filter(function (v) { return (v.lang || '').toLowerCase().indexOf('ru') === 0; });
    var sel = U.$('voiceSel');
    if (!sel) return;
    var list = state.ru.length ? state.ru : state.voices;
    sel.innerHTML = '';
    list.forEach(function (v) {
      var o = U.el('option', null, v.name + (v.lang ? ' (' + v.lang + ')' : ''));
      o.value = v.voiceURI || v.name;
      sel.appendChild(o);
    });
    if (LOG.settings.voiceURI) {
      var found = list.find(function (v) { return (v.voiceURI || v.name) === LOG.settings.voiceURI; });
      if (found) sel.value = LOG.settings.voiceURI;
    }
    state.selected = list.find(function (v) { return (v.voiceURI || v.name) === sel.value; }) || list[0] || null;
    var note = U.$('voiceNote');
    if (note) {
      if (!state.voices.length) note.textContent = 'Список голосов пока не загрузился — откройте настройки ещё раз через секунду.';
      else if (!state.ru.length) note.textContent = 'Русский голос в системе не найден — будет использован голос по умолчанию, произношение может быть неточным. Весь материал остаётся доступным в текстовом виде.';
      else note.textContent = '';
    }
  }
  if (synth) {
    if (typeof synth.onvoiceschanged !== 'undefined') synth.onvoiceschanged = refreshVoices;
    refreshVoices();
    setTimeout(refreshVoices, 400);
    setTimeout(refreshVoices, 1500);
  }

  /* Разбивка на короткие фразы — субтитры и надёжность TTS */
  function chunks(text) {
    var parts = (text.match(/[^.!?…]+[.!?…]*/g) || [text]).map(function (s) { return s.trim(); }).filter(Boolean);
    var out = [], buf = '';
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (buf && (buf + ' ' + p).length < 90) { buf += ' ' + p; }
      else { if (buf) out.push(buf); buf = p; }
      if (buf.length >= 170) { out.push(buf); buf = ''; }
    }
    if (buf) out.push(buf);
    return out;
  }

  function stop() {
    state.chain = [];
    state.speaking = false;
    state.paused = false;
    if (synth) { try { synth.cancel(); } catch (e) {} }
    updatePlayBtn();
  }

  function say(text) {
    stop();
    if (!text) { LOG.subtitle.hide(); return; }
    state.stepText = text;
    if (!LOG.settings.voiceOn || !synth || !canSpeak()) {
      if (LOG.settings.subs) LOG.subtitle.show(text); else LOG.subtitle.hide();
      return;
    }
    var list = chunks(text);
    state.speaking = true; state.paused = false;
    updatePlayBtn();
    var i = 0;
    (function next() {
      if (!state.speaking) return;
      if (i >= list.length) { finish(); return; }
      var t = list[i++];
      var u = new SpeechSynthesisUtterance(t);
      if (state.selected) u.voice = state.selected;
      u.lang = (state.selected && state.selected.lang) || 'ru-RU';
      u.rate = LOG.settings.rate;
      u.pitch = 1;
      u.onstart = function () { if (LOG.settings.subs) LOG.subtitle.show(t); };
      u.onend = function () {
        var idx = state.chain.indexOf(u);
        if (idx >= 0) state.chain.splice(idx, 1);
        if (state.speaking) next();
      };
      u.onerror = function () { finish(); };
      state.chain.push(u);
      try { synth.speak(u); } catch (e) { finish(); }
    })();
  }

  function finish() {
    state.speaking = false; state.paused = false;
    updatePlayBtn();
  }

  function pause() {
    if (synth && state.speaking && !state.paused) {
      try { synth.pause(); } catch (e) {}
      state.paused = true;
      updatePlayBtn();
    }
  }
  function resume() {
    if (synth && state.paused) {
      try { synth.resume(); } catch (e) {}
      state.paused = false;
      updatePlayBtn();
    }
  }
  function toggle() {
    state.userActive = true;
    if (state.paused) { resume(); return; }
    if (state.speaking) { pause(); return; }
    var t = LOG.engine.currentStepText() || state.stepText;
    if (t) say(t);
  }
  function repeat() {
    state.userActive = true;
    var t = LOG.engine.currentStepText() || state.stepText;
    if (t) say(t);
  }

  function updatePlayBtn() {
    var b = U.$('btnPlay');
    if (!b) return;
    if (state.speaking && !state.paused) {
      b.innerHTML = '⏸<span class="dock__lbl">Пауза</span>';
    } else if (state.paused) {
      b.innerHTML = '▶<span class="dock__lbl">Продолжить</span>';
    } else {
      b.innerHTML = '▶<span class="dock__lbl">Слушать</span>';
    }
  }

  /* Пауза при уходе со вкладки; отмена при закрытии */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pause();
  });
  window.addEventListener('beforeunload', function () { stop(); });

  LOG.voice = {
    say: say, stop: stop, pause: pause, resume: resume,
    toggle: toggle, repeat: repeat,
    supported: supported, canSpeak: canSpeak,
    speakingNow: speakingNow,
    refreshVoices: refreshVoices,
    updatePlayBtn: updatePlayBtn,
    init: function () { updatePlayBtn(); refreshVoices(); }
  };
})();
