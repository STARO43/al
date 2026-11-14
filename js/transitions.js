'use strict';
/* ============================================================
   LOGARITHM — кинематографические переходы между эпизодами.
   WebGL (GLSL): pixel dissolve, noise dissolve, ripple,
   wave wipe, zoom rays. Без WebGL или при reduced motion —
   CSS-фолбэк. WebGL не обязателен для работы сайта.
   ============================================================ */
(function () {
  var U = LOG.U;
  var canvas = null, gl = null, prog = null, uni = {};
  var DURATION = 1050;

  var FRAG = [
    'precision mediump float;',
    'uniform vec2 u_res;',
    'uniform float u_p;',
    'uniform float u_t;',
    'uniform float u_fx;',
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }',
    'float noise(vec2 p){',
    '  vec2 i = floor(p); vec2 f = fract(p);',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    '  float a = hash(i);',
    '  float b = hash(i + vec2(1.0, 0.0));',
    '  float c = hash(i + vec2(0.0, 1.0));',
    '  float d = hash(i + vec2(1.0, 1.0));',
    '  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);',
    '}',
    'float fbm(vec2 p){ return 0.62 * noise(p) + 0.38 * noise(p * 2.37 + 7.7); }',
    'void main(){',
    '  vec2 uv = gl_FragCoord.xy / u_res;',
    '  float c = u_p < 0.5 ? (u_p * 2.0) : ((1.0 - u_p) * 2.0);', // покрытие экрана
    '  vec3 dark = vec3(0.018, 0.024, 0.045);',
    '  vec3 acc1 = vec3(0.424, 0.549, 1.0);',   // #6C8CFF
    '  vec3 acc2 = vec3(0.667, 0.471, 1.0);',   // #AA78FF
    '  vec3 acc3 = vec3(0.784, 1.0, 0.337);',   // #C8FF56
    '  vec3 col = dark;',
    '  float alpha = 0.0;',
    '  if (u_fx < 0.5) {',
    '    // Pixel dissolve',
    '    vec2 g = uv * 34.0;',
    '    vec2 id = floor(g); vec2 cuv = fract(g);',
    '    float h = hash(id);',
    '    float sz = clamp((c - h) * 5.0, 0.0, 1.0);',
    '    vec2 q = abs(cuv - 0.5);',
    '    float sq = 1.0 - smoothstep(0.5 - sz * 0.55, 0.5 - sz * 0.55 + 0.035, max(q.x, q.y));',
    '    alpha = sq * 0.95;',
    '    col = h < c - 0.08 ? dark : mix(acc1, acc2, hash(id + 1.7));',
    '  } else if (u_fx < 1.5) {',
    '    // Noise dissolve со светящейся кромкой',
    '    float n = fbm(uv * vec2(3.2, 5.4) + u_t * 0.07);',
    '    float d = c * 1.12 - n;',
    '    if (d > 0.05) { alpha = 0.95; col = dark; }',
    '    else if (d > 0.0) { alpha = 0.92; col = mix(acc1, acc2, uv.y); }',
    '  } else if (u_fx < 2.5) {',
    '    // Ripple',
    '    vec2 p = (uv - 0.5) * vec2(u_res.x / u_res.y, 1.0);',
    '    float r = length(p) / 0.85;',
    '    float rr = c * 1.4;',
    '    float ring = smoothstep(0.06, 0.0, abs(r - rr));',
    '    alpha = max(r < rr ? 0.94 : 0.0, ring * 0.85);',
    '    col = mix(dark, mix(acc1, acc3, r), ring);',
    '  } else if (u_fx < 3.5) {',
    '    // Wave wipe',
    '    float shift = sin(uv.y * 9.0 + u_t * 1.5) * 0.07 + sin(uv.y * 23.0 - u_t * 1.1) * 0.025;',
    '    float x = uv.x + shift;',
    '    float d = c * 1.3 - x;',
    '    if (d > 0.03) { alpha = 0.95; col = dark; }',
    '    else if (d > 0.0) { alpha = 0.92; col = mix(acc2, acc1, uv.x); }',
    '  } else {',
    '    // Zoom rays',
    '    vec2 p = (uv - 0.5) * vec2(u_res.x / u_res.y, 1.0);',
    '    float ang = atan(p.y, p.x);',
    '    float rays = fbm(vec2(ang * 9.0, u_t * 0.55)) + 0.35 * noise(vec2(ang * 30.0, u_t));',
    '    float r = length(p);',
    '    float m = smoothstep(0.85, 0.0, r) * rays;',
    '    float flash = sin(c * 3.14159) ;',
    '    alpha = clamp(m * flash * 0.85, 0.0, 0.85);',
    '    col = mix(acc1, acc2, uv.y + 0.3 * sin(ang * 3.0));',
    '  }',
    '  gl_FragColor = vec4(col, alpha);',
    '}'
  ].join('\n');

  var VERT = [
    'attribute vec2 a_pos;',
    'void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }'
  ].join('\n');

  function initGL() {
    if (gl !== null) return gl; // null = уже пробовали, false = нет поддержки
    canvas = U.$('fxCanvas');
    if (!canvas) { gl = false; return gl; }
    try {
      gl = canvas.getContext('webgl', { alpha: true, antialias: false }) ||
           canvas.getContext('experimental-webgl', { alpha: true, antialias: false }) || false;
    } catch (e) { gl = false; }
    if (!gl) return gl;
    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { throw new Error(gl.getShaderInfoLog(s) || 'shader'); }
      return s;
    }
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link');
      gl.useProgram(prog);
      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(prog, 'a_pos');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      uni.res = gl.getUniformLocation(prog, 'u_res');
      uni.p = gl.getUniformLocation(prog, 'u_p');
      uni.t = gl.getUniformLocation(prog, 'u_t');
      uni.fx = gl.getUniformLocation(prog, 'u_fx');
    } catch (e) {
      console.warn('[fx] WebGL недоступен:', e.message);
      gl = false;
    }
    return gl;
  }

  var rafId = 0, playing = false;

  function fallbackPlay(onMid, onDone) {
    var fb = U.$('fxFallback');
    var swapped = false;
    var t0 = performance.now();
    var dur = LOG.motion.reduced ? 260 : 620;
    fb.style.animation = 'none';
    void fb.offsetWidth;
    fb.style.animation = 'fxFall ' + (dur * 2) + 'ms ease both';
    if (!document.getElementById('fxFallStyle')) {
      var s = document.createElement('style');
      s.id = 'fxFallStyle';
      s.textContent = '@keyframes fxFall{0%{opacity:0}35%{opacity:1}65%{opacity:1}100%{opacity:0}}';
      document.head.appendChild(s);
    }
    var tick = function (t) {
      var p = (t - t0) / (dur * 2);
      if (!swapped && p >= 0.5) { swapped = true; onMid(); }
      if (p >= 1) { fb.style.animation = ''; onDone(); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* play(onMid): onMid вызывается в середине, когда экран закрыт эффектом */
  function play(onMid, effectId) {
    if (playing) return;
    effectId = effectId == null ? Math.floor(Math.random() * 5) : effectId;
    var g = initGL();
    if (!g || LOG.motion.reduced) { fallbackPlay(onMid, function () {}); return; }
    playing = true;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.style.display = 'block';
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform2f(uni.res, canvas.width, canvas.height);
    gl.uniform1f(uni.fx, effectId);
    var swapped = false;
    var t0 = performance.now();
    cancelAnimationFrame(rafId);
    var done = function () {
      playing = false;
      canvas.style.display = 'none';
    };
    (function tick(t) {
      var p = Math.min(1, (t - t0) / DURATION);
      gl.uniform1f(uni.p, p);
      gl.uniform1f(uni.t, t / 1000);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!swapped && p >= 0.48) { swapped = true; onMid(); }
      if (p >= 1) { done(); return; }
      rafId = requestAnimationFrame(tick);
    })(t0);
  }

  LOG.fx = { play: play, supported: function () { return !!initGL(); } };
})();
