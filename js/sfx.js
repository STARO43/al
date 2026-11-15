'use strict';
/* ============================================================
   ЛОГАРИФМ · АП-2 — звук (WebAudio, без файлов).
   Телетайп, модем, помехи, переходы. По умолчанию ВЫКЛЮЧЕН,
   включается кнопкой ЗВУК в шапке. Всё синтезируется на лету.
   ============================================================ */
window.TERM = window.TERM || {};
TERM.sfx = (function () {
  var ctx = null, master = null;
  var enabled = false;
  try { enabled = localStorage.getItem('ap2.sound') === '1'; } catch (e) {}

  function ensure() {
    if (ctx) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    return true;
  }

  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

  function env(gainNode, t0, peak, dur) {
    var g = gainNode.gain;
    g.setValueAtTime(0.0001, t0);
    g.exponentialRampToValueAtTime(peak, t0 + 0.008);
    g.exponentialRampToValueAtTime(0.0001, t0 + dur);
  }

  /* короткий щелчок клавиши телетайпа */
  function tick() {
    if (!enabled || !ensure()) return;
    resume();
    var t = ctx.currentTime;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square';
    o.frequency.value = 1400 + Math.random() * 700;
    env(g, t, 0.028, 0.045);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.05);
  }

  /* подтверждение выбора */
  function click() {
    if (!enabled || !ensure()) return;
    resume();
    var t = ctx.currentTime;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(880, t);
    o.frequency.exponentialRampToValueAtTime(240, t + 0.09);
    env(g, t, 0.09, 0.1);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.11);
  }

  /* шумовой всплеск (помехи) */
  function noiseBurst(dur, peak, freq) {
    if (!enabled || !ensure()) return;
    resume();
    var t = ctx.currentTime;
    dur = dur || 0.3; peak = peak || 0.08; freq = freq || 900;
    var n = Math.floor(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, n, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var src = ctx.createBufferSource(); src.buffer = buf;
    var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
    var g = ctx.createGain(); g.gain.value = peak;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
  }

  /* рукопожатие модема при загрузке */
  function modem() {
    if (!enabled || !ensure()) return;
    resume();
    var t = ctx.currentTime;
    var tones = [1270, 2070, 980, 1650];
    tones.forEach(function (fq, i) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = fq;
      var t0 = t + i * 0.16;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.05, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.15);
      o.connect(g); g.connect(master);
      o.start(t0); o.stop(t0 + 0.16);
    });
    noiseBurst(0.5, 0.05, 1800);
  }

  /* переход между сеансами */
  function whoosh() {
    if (!enabled || !ensure()) return;
    resume();
    var t = ctx.currentTime;
    var n = Math.floor(ctx.sampleRate * 0.9);
    var buf = ctx.createBuffer(1, n, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1);
    var src = ctx.createBufferSource(); src.buffer = buf;
    var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 6;
    f.frequency.setValueAtTime(220, t);
    f.frequency.exponentialRampToValueAtTime(2400, t + 0.45);
    f.frequency.exponentialRampToValueAtTime(140, t + 0.9);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.07, t + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
  }

  /* крупный типографический момент */
  function boom() {
    if (!enabled || !ensure()) return;
    resume();
    var t = ctx.currentTime;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.5);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.6);
    noiseBurst(0.12, 0.03, 3000);
  }

  function setEnabled(v) {
    enabled = v;
    try { localStorage.setItem('ap2.sound', v ? '1' : '0'); } catch (e) {}
    if (v) { ensure(); resume(); click(); }
  }

  return {
    tick: tick, click: click, noise: noiseBurst, modem: modem,
    whoosh: whoosh, boom: boom,
    get enabled() { return enabled; },
    setEnabled: setEnabled
  };
})();
