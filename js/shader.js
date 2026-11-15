'use strict';
/* ============================================================
   ЛОГАРИФМ · АП-2 — WebGL-слой.
   1) #bggl — живой фон: плёночное зерно, дым (fbm), виньетка,
      слабое дыхание рубина, параллакс от прокрутки.
   2) #gltrans — переходы между сеансами в духе GL Transitions:
      noise / pixel / wave / ripple / zoom. GPU-ускоренные,
      с рубиновой кромкой на границе маски.
   Без WebGL сайт работает: CSS-фолбэк на фоне и переходах.
   ============================================================ */
window.TERM = window.TERM || {};

(function () {
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function makeGL(canvas, frag, vert) {
    var gl = null;
    try {
      gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true })
        || canvas.getContext('experimental-webgl', { antialias: false, alpha: true, premultipliedAlpha: true });
    } catch (e) { gl = null; }
    if (!gl) return null;
    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); return null; }
      return s;
    }
    var vs = sh(gl.VERTEX_SHADER, vert), fs = sh(gl.FRAGMENT_SHADER, frag);
    if (!vs || !fs) return null;
    var p = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(p)); return null; }
    gl.useProgram(p);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(p, 'a_p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    return { gl: gl, p: p };
  }

  var VERT = 'attribute vec2 a_p; void main(){ gl_Position = vec4(a_p, 0.0, 1.0); }';

  var COMMON = [
    'precision mediump float;',
    'uniform vec2 u_res; uniform float u_time;',
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }',
    'float noise(vec2 p){',
    '  vec2 i = floor(p); vec2 f = fract(p);',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),',
    '             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);',
    '}',
    'float fbm(vec2 p){',
    '  float v = 0.0; float a = 0.5;',
    '  for (int i = 0; i < 4; i++){ v += a * noise(p); p = p * 2.03 + vec2(11.3, 7.9); a *= 0.5; }',
    '  return v;',
    '}'
  ].join('\n');

  /* ---------- ФОН: зерно + дым + виньетка + дыхание рубина ---------- */
  var BG_FRAG = COMMON + [
    'uniform float u_scroll; uniform float u_pulse; uniform vec2 u_mouse;',
    'void main(){',
    '  vec2 uv = gl_FragCoord.xy / u_res;',
    '  vec2 p = uv * vec2(u_res.x / u_res.y, 1.0);',
    '  float t = u_time * 0.05;',
    '  float f1 = fbm(p * 2.1 + vec2(t * 0.7, -t * 0.35 + u_scroll * 0.15));',
    '  float f2 = fbm(p * 4.3 - vec2(t * 0.4, t * 0.22));',
    '  float smoke = smoothstep(0.28, 0.85, f1 * 0.72 + f2 * 0.38);',
    '  vec3 base = vec3(0.039, 0.039, 0.043);',           /* #0a0a0b */
    '  vec3 lift = vec3(0.082, 0.078, 0.084);',            /* чуть светлее и теплее */
    '  vec3 col = mix(base, lift, smoke * (0.5 + u_pulse * 0.5));',
    '  col += vec3(0.20, 0.145, 0.10) * smoke * 0.16;',    /* тёплая ламповая дымка */
    /* дыхание рубина у краёв */
    '  float ring = smoothstep(0.52, 1.05, length(uv - vec2(0.5, 0.52)));',
    '  col += vec3(0.55, 0.10, 0.08) * ring * (0.030 + 0.018 * sin(u_time * 0.6) + u_pulse * 0.05);',
    /* слабый след от курсора */
    '  float m = 0.0;',
    '  if (u_mouse.x > -0.5){',
    '    vec2 mu = u_mouse / u_res;',
    '    m = exp(-3.5 * length((uv - mu) * vec2(u_res.x / u_res.y, 1.0)));',
    '  }',
    '  col += vec3(0.45, 0.16, 0.10) * m * 0.05;',
    /* виньетка */
    '  float vig = smoothstep(1.18, 0.32, length(uv - vec2(0.5)));',
    '  col *= mix(0.66, 1.0, vig);',
    /* зерно плёнки */
    '  float g = hash(gl_FragCoord.xy + fract(u_time) * 1731.0);',
    '  col += (g - 0.5) * 0.036;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  /* ---------- ПЕРЕХОДЫ (GL Transitions) ---------- */
  var TRANS_FRAG = COMMON + [
    'uniform float u_p; uniform float u_type; uniform float u_seed;',
    'void main(){',
    '  vec2 uv = gl_FragCoord.xy / u_res;',
    '  float m = 0.0; float detail = 0.0;',
    '  if (u_type < 0.5) {',
    /* NOISE DISSOLVE */
    '    float n = fbm(uv * 3.4 + u_seed * 41.0);',
    '    m = smoothstep(n - 0.12, n + 0.12, u_p * 1.24);',
    '    detail = n;',
    '  } else if (u_type < 1.5) {',
    /* PIXEL DISSOLVE */
    '    float cell = 26.0;',
    '    vec2 c = floor(uv * u_res / cell);',
    '    float h = hash(c + u_seed * 97.0);',
    '    m = step(h, u_p * 1.06);',
    '    detail = h;',
    '  } else if (u_type < 2.5) {',
    /* WAVE WIPE */
    '    float x = uv.x + 0.10 * sin(uv.y * 8.0 + u_time * 1.4 + u_seed * 6.0);',
    '    m = smoothstep(x - 0.06, x + 0.06, u_p * 1.12);',
    '    detail = fract(x * 6.0);',
    '  } else if (u_type < 3.5) {',
    /* RIPPLE */
    '    float r = length((uv - vec2(0.5, 0.45)) * vec2(u_res.x / u_res.y, 1.0));',
    '    float rings = fract(r * 7.0 - u_time * 0.8 + u_seed);',
    '    float wave = u_p * 1.25 + rings * 0.06 * u_p;',
    '    m = 1.0 - smoothstep(wave - 0.07, wave, r);',
    '    detail = rings;',
    '  } else {',
    /* ZOOM */
    '    float r = length((uv - vec2(0.5)) * 1.5);',
    '    m = 1.0 - smoothstep(u_p * 1.3 - 0.18, u_p * 1.3, r);',
    '    float ang = atan(uv.y - 0.5, uv.x - 0.5);',
    '    detail = 0.5 + 0.5 * sin(ang * 24.0 + r * 30.0);',
    '  }',
    '  vec3 col = vec3(0.024, 0.024, 0.028);',
    /* рубиновая кромка на границе маски */
    '  float inner = smoothstep(0.0, 1.0, m);',
    '  float edge = m * (1.0 - m) * 4.0;',
    '  col += vec3(0.89, 0.28, 0.23) * edge * (0.28 + detail * 0.22);',
    '  col += vec3(0.91, 0.89, 0.86) * detail * m * 0.016;',
    '  float g = hash(gl_FragCoord.xy + fract(u_time) * 917.0);',
    '  col += (g - 0.5) * 0.03;',
    '  gl_FragColor = vec4(col * inner, inner);',
    '}'
  ].join('\n');

  /* ---------- Фон ---------- */
  var bg = null;
  function initBg() {
    var canvas = document.getElementById('bggl');
    if (!canvas) return;
    bg = makeGL(canvas, BG_FRAG, VERT);
    if (!bg) { document.body.classList.add('nogl'); canvas.style.display = 'none'; return; }
    bg.canvas = canvas;
    bg.uni = {
      res: bg.gl.getUniformLocation(bg.p, 'u_res'),
      time: bg.gl.getUniformLocation(bg.p, 'u_time'),
      scroll: bg.gl.getUniformLocation(bg.p, 'u_scroll'),
      pulse: bg.gl.getUniformLocation(bg.p, 'u_pulse'),
      mouse: bg.gl.getUniformLocation(bg.p, 'u_mouse')
    };
    bg.mouse = [-1, -1];
    bg.pulse = 0;
    bg.scroll = 0;
    bg.resize = function () {
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      bg.gl.viewport(0, 0, canvas.width, canvas.height);
    };
    window.addEventListener('resize', bg.resize);
    bg.resize();
    window.addEventListener('mousemove', function (e) {
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      bg.mouse = [e.clientX * dpr, (window.innerHeight - e.clientY) * dpr];
    }, { passive: true });
    document.addEventListener('mouseleave', function () { bg.mouse = [-1, -1]; });
    var t0 = performance.now();
    (function frame() {
      if (bg.stopped) return;
      var t = (performance.now() - t0) / 1000;
      var g = bg.gl;
      g.uniform2f(bg.uni.res, bg.canvas.width, bg.canvas.height);
      g.uniform1f(bg.uni.time, t);
      g.uniform1f(bg.uni.scroll, bg.scroll);
      g.uniform1f(bg.uni.pulse, bg.pulse);
      g.uniform2f(bg.uni.mouse, bg.mouse[0], bg.mouse[1]);
      bg.pulse *= 0.92;
      g.drawArrays(g.TRIANGLES, 0, 3);
      if (REDUCED) return;            /* один кадр при reduced motion */
      requestAnimationFrame(frame);
    })();
  }

  /* ---------- Переходы ---------- */
  var trans = null;
  var TYPES = [0, 1, 2, 3, 4];   // noise, pixel, wave, ripple, zoom
  var typeIdx = 0;
  function initTrans() {
    var canvas = document.getElementById('gltrans');
    if (!canvas) return;
    trans = makeGL(canvas, TRANS_FRAG, VERT);
    if (!trans) { canvas.style.display = 'none'; return; }
    trans.canvas = canvas;
    trans.uni = {
      res: trans.gl.getUniformLocation(trans.p, 'u_res'),
      time: trans.gl.getUniformLocation(trans.p, 'u_time'),
      p: trans.gl.getUniformLocation(trans.p, 'u_p'),
      type: trans.gl.getUniformLocation(trans.p, 'u_type'),
      seed: trans.gl.getUniformLocation(trans.p, 'u_seed')
    };
    trans.resize = function () {
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      trans.gl.viewport(0, 0, canvas.width, canvas.height);
    };
    window.addEventListener('resize', trans.resize);
    trans.resize();
  }

  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function run(kind, midFn) {
    if (!trans || REDUCED) return Promise.resolve('css');
    return new Promise(function (res) {
      typeIdx = (typeIdx + 1) % TYPES.length;
      var type = kind != null ? kind : TYPES[typeIdx];
      var t0 = performance.now();
      var IN = 500, HOLD = 90, OUT = 560;
      trans.canvas.classList.add('on');
      TERM.sfx.whoosh();
      var seed = Math.random() * 100;
      function draw(p, t) {
        var g = trans.gl;
        g.uniform2f(trans.uni.res, trans.canvas.width, trans.canvas.height);
        g.uniform1f(trans.uni.time, t);
        g.uniform1f(trans.uni.p, p);
        g.uniform1f(trans.uni.type, type);
        g.uniform1f(trans.uni.seed, seed);
        g.drawArrays(g.TRIANGLES, 0, 3);
      }
      function phase(now) {
        var t = (now - t0) / 1000;
        var el = now - t0;
        if (el < IN) { draw(ease(el / IN), t); requestAnimationFrame(phase); return; }
        if (!phase.mid) {
          phase.mid = true;
          draw(1, t);
          if (midFn) midFn();
          setTimeout(function () { requestAnimationFrame(phase2); }, HOLD);
          return;
        }
        requestAnimationFrame(phase);
      }
      function phase2(now) {
        var t = (now - t0) / 1000;
        var el = now - t0 - IN - HOLD;
        if (el < OUT) { draw(1 - ease(el / OUT), t); requestAnimationFrame(phase2); return; }
        trans.canvas.classList.remove('on');
        res('gl');
      }
      requestAnimationFrame(phase);
    });
  }

  TERM.bg = {
    init: initBg,
    pulse: function (v) { if (bg) bg.pulse = Math.min(1.6, (bg.pulse || 0) + (v == null ? 1 : v)); },
    setScroll: function (y) { if (bg) bg.scroll = y; }
  };
  TERM.trans = {
    init: initTrans,
    run: run,
    available: function () { return !!trans && !REDUCED; }
  };
})();
