// Берлога — кинетическая WebGL-заставка.
// Огромное слово рисуется в offscreen-canvas (Unbounded 900), загружается
// текстурой в шейдер. Каждый символ получает свой «гауссов» вес по горизонтали
// и независимо дышит/плывёт — типографика, которую можно потрогать мышью:
// от курсора расходится медовая рябь. Смена слов идёт через шейдерные
// переходы в духе GL Transitions (растворение / рябь / зум).

import { PRELUDE } from "./effects";

export interface IntroCallbacks {
  onAdvance?: (index: number) => void;
}

const INTRO_FRAGMENT = `
${PRELUDE}
uniform sampler2D uTexA;
uniform sampler2D uTexB;
uniform vec4 uRect;      // прямоугольник слова в uv-координатах
uniform float uSwap;     // прогресс смены слова
uniform int uFx;         // тип перехода между словами
uniform int uCount;      // число букв
uniform vec2 uLetters[14];
uniform vec2 uMouse;     // uv-координаты курсора
uniform float uMouseE;   // энергия курсора 0..1
uniform vec3 uWordCol;
uniform vec3 uBgCol;

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * vnoise(p);
    p = p * 2.03 + 11.7;
    a *= 0.5;
  }
  return v;
}

vec2 toWord(vec2 uv) { return (uv - uRect.xy) / max(uRect.zw, vec2(0.0001)); }

vec4 wordSample(vec2 tuv) {
  if (tuv.x < 0.0 || tuv.x > 1.0 || tuv.y < 0.0 || tuv.y > 1.0) return vec4(0.0);
  return texture2D(uTexA, tuv);
}

void main() {
  float ar = uRes.x / max(uRes.y, 1.0);
  vec2 uv = vUv;

  // --- фон: медовый fbm-поток ---
  vec3 bg = mix(uBgCol * 0.72, uBgCol * 1.15, uv.y);
  float n = fbm(uv * 2.6 + vec2(uTime * 0.05, -uTime * 0.035));
  bg += uFromA1 * pow(n, 3.2) * 0.42;
  bg += uFromA2 * exp(-distance(uv, vec2(0.82, 0.24)) * 3.4) * 0.14;
  bg += uFromA2 * exp(-distance(uv, vec2(0.14, 0.82)) * 3.8) * 0.10;

  // --- рябь от курсора ---
  vec2 dm = (uv - uMouse) * vec2(ar, 1.0);
  float dist = length(dm);
  float ripple = sin(dist * 26.0 - uTime * 6.5) * exp(-dist * 4.2) * uMouseE;
  uv += normalize(dm + vec2(0.0001)) * ripple * 0.035;

  // --- кинетика по буквам ---
  vec2 tuv0 = toWord(uv);
  float dispX = 0.0;
  float dispY = 0.0;
  for (int k = 0; k < 14; k++) {
    if (k >= uCount) break;
    vec2 lr = uLetters[k];
    float c = (lr.x + lr.y) * 0.5;
    float hw = max((lr.y - lr.x) * 0.5, 0.0015);
    float w = exp(-pow((tuv0.x - c) / hw, 2.0));
    dispX += w * sin(uTime * 2.1 + float(k) * 1.7) * 0.0065 * (0.55 + 0.45 * sin(uTime * 0.6 + float(k) * 0.9));
    dispY += w * cos(uTime * 1.6 + float(k) * 1.3) * 0.0045;
  }
  uv += vec2(dispX, dispY);

  // --- дыхание слова целиком ---
  vec2 tuv = toWord(uv);
  float breathe = 1.0 + 0.008 * sin(uTime * 0.9);
  tuv = (tuv - 0.5) / breathe + 0.5;

  vec4 wa = wordSample(tuv);
  vec4 wb = vec4(0.0);
  if (uSwap > 0.0) {
    if (tuv.x >= 0.0 && tuv.x <= 1.0 && tuv.y >= 0.0 && tuv.y <= 1.0) wb = texture2D(uTexB, tuv);
  }

  // --- переход между словами ---
  vec4 glyph = wa;
  if (uSwap > 0.0 && uSwap < 1.0) {
    if (uFx == 0) {
      float r = rand(floor(tuv * 36.0) + 7.0);
      glyph = r < uSwap ? wb : wa;
    } else if (uFx == 1) {
      float m = smoothstep(0.42, 0.58, tuv.x + sin(tuv.y * 11.0 + uSwap * 9.0) * 0.07 - uSwap);
      glyph = mix(wa, wb, m);
    } else {
      vec2 zuv = (tuv - 0.5) / (1.0 - 0.25 * uSwap) + 0.5;
      vec4 zb = vec4(0.0);
      if (zuv.x >= 0.0 && zuv.x <= 1.0 && zuv.y >= 0.0 && zuv.y <= 1.0) zb = texture2D(uTexB, zuv);
      glyph = mix(wa, zb, smoothstep(0.25, 0.75, uSwap));
    }
  } else if (uSwap >= 1.0) {
    glyph = wb;
  }

  // медовый градиент по букве
  vec3 col = mix(uWordCol, uFromA1, clamp(uv.y * 0.55, 0.0, 0.45));
  vec3 outc = mix(bg, col, glyph.a * 0.96);
  // тёплое свечение под словом
  outc += uFromA1 * glyph.a * 0.12;

  // виньетка и зерно
  float vig = 1.0 - smoothstep(0.42, 1.28, distance((uv - 0.5) * vec2(ar, 1.0), vec2(0.0)));
  outc *= mix(0.82, 1.0, vig);
  outc += (rand(vUv * uRes + fract(uTime)) - 0.5) * 0.028;

  gl_FragColor = vec4(outc, 1.0);
}`;

const INTRO_VERTEX = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = (aPos + 1.0) * 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

interface WordTex {
  tex: WebGLTexture;
  letters: [number, number][];
  rect: [number, number, number, number];
}

export class IntroScene {
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGLRenderingContext | null = null;
  private prog: WebGLProgram | null = null;
  private u: Record<string, WebGLUniformLocation | null> = {};
  private buf: WebGLBuffer | null = null;
  private words: string[] = [];
  private textures = new Map<string, WordTex>();
  private index = 0;
  private prevIndex = 0;
  private swap = 0; // 0..1 анимация смены
  private swapT0 = 0;
  private swapping = false;
  private swapFx = 0;
  private raf = 0;
  private running = false;
  private mouse: [number, number] = [0.5, 0.5];
  private mouseE = 0;
  private mouseT: [number, number] = [0.5, 0.5];
  private lastMove = 0;
  private cb: IntroCallbacks = {};
  private dpr = 1;
  private onResize = () => {
    this.resize();
    this.textures.clear();
  };

  attach(canvas: HTMLCanvasElement, words: string[], cb: IntroCallbacks) {
    this.canvas = canvas;
    this.words = words;
    this.cb = cb;
    const gl = (canvas.getContext("webgl", { antialias: true, alpha: false }) ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    this.gl = gl;
    if (!gl) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.75);

    const vs = this.compile(VERTEX_SRC, gl.VERTEX_SHADER);
    const fs = this.compile(INTRO_FRAGMENT, gl.FRAGMENT_SHADER);
    if (!vs || !fs) return;
    const prog = gl.createProgram();
    gl.attachShader(prog!, vs!);
    gl.attachShader(prog!, fs!);
    gl.linkProgram(prog!);
    if (!gl.getProgramParameter(prog!, gl.LINK_STATUS)) {
      console.warn("intro link:", gl.getProgramInfoLog(prog!));
      return;
    }
    this.prog = prog!;
    for (const name of [
      "uRes", "uTime", "uTexA", "uTexB", "uRect", "uSwap", "uFx", "uCount",
      "uLetters", "uMouse", "uMouseE", "uWordCol", "uBgCol", "uFromA1", "uFromA2",
    ]) {
      this.u[name] = gl.getUniformLocation(this.prog, name);
    }
    this.buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(this.prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    this.resize();
    window.addEventListener("resize", this.onResize);
  }

  dispose() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
    const gl = this.gl;
    if (gl) {
      this.textures.forEach((t) => gl.deleteTexture(t.tex));
      this.textures.clear();
    }
  }

  start() {
    if (!this.gl) return;
    this.running = true;
    cancelAnimationFrame(this.raf);
    const loop = (t: number) => {
      if (!this.running) return;
      this.render(t);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  resize() {
    if (!this.canvas || !this.gl) return;
    const w = Math.floor(window.innerWidth * this.dpr);
    const h = Math.floor(window.innerHeight * this.dpr);
    this.canvas.width = w;
    this.canvas.height = h;
    this.canvas.style.width = window.innerWidth + "px";
    this.canvas.style.height = window.innerHeight + "px";
    this.gl.viewport(0, 0, w, h);
  }

  goTo(i: number, instant = false) {
    const n = this.words.length;
    const next = ((i % n) + n) % n;
    if (next === this.index) return;
    this.prevIndex = this.index;
    this.index = next;
    if (instant) {
      this.swap = 1;
      this.swapping = false;
    } else {
      this.swap = 0.001;
      this.swapT0 = performance.now();
      this.swapping = true;
      this.swapFx = Math.floor(Math.random() * 3);
    }
    this.cb.onAdvance?.(this.index);
  }

  next() {
    this.goTo(this.index + 1);
  }

  prev() {
    this.goTo(this.index - 1);
  }

  setMouse(cx: number, cy: number) {
    this.mouseT = [cx / window.innerWidth, 1 - cy / window.innerHeight];
    this.lastMove = performance.now();
  }

  private ensureTexture(word: string): WordTex | null {
    const gl = this.gl;
    if (!gl || !this.canvas) return null;
    let t = this.textures.get(word);
    if (t) return t;

    const W = this.canvas.width;
    const H = this.canvas.height;
    const off = document.createElement("canvas");
    off.width = Math.min(W, 2048);
    off.height = Math.min(Math.floor(H * 0.5), 700);
    const ctx = off.getContext("2d");
    if (!ctx) return null;

    const scale = off.width / W;
    // подгоняем размер шрифта: слово занимает до 84% ширины
    let fs = Math.floor(off.height * 0.62);
    const fam = '"Unbounded", "Arial Black", sans-serif';
    ctx.font = `900 ${fs}px ${fam}`;
    const measure = () => {
      let total = 0;
      for (const ch of word) total += ctx!.measureText(ch).width;
      return total;
    };
    let wTotal = measure();
    const maxW = off.width * 0.84;
    if (wTotal > maxW) {
      fs = Math.floor(fs * (maxW / wTotal));
      ctx.font = `900 ${fs}px ${fam}`;
      wTotal = measure();
    }
    const hTotal = fs * 1.08;

    // координаты букв
    const letters: [number, number][] = [];
    let x = (off.width - wTotal) / 2;
    const y = off.height / 2;
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    for (const ch of word) {
      const cw = ctx.measureText(ch).width;
      ctx.fillText(ch, x, y);
      letters.push([x / off.width, (x + cw) / off.width]);
      x += cw;
    }

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, off);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // прямоугольник слова на экране (uv)
    const rectW = off.width / W;
    const rectH = off.height / H;
    t = { tex, letters, rect: [(1 - rectW) / 2, (1 - rectH) / 2, rectW, rectH] };
    this.textures.set(word, t);
    return t;
  }

  private render(now: number) {
    const gl = this.gl;
    const canvas = this.canvas;
    if (!gl || !canvas || !this.prog) return;

    // плавное затухание энергии мыши + подтормаживание к цели
    const dt = Math.min(32, now - (this.lastFrame || now));
    this.lastFrame = now;
    const k = 1 - Math.pow(0.0015, dt / 1000);
    this.mouse[0] += (this.mouseT[0] - this.mouse[0]) * k * 1.6;
    this.mouse[1] += (this.mouseT[1] - this.mouse[1]) * k * 1.6;
    const idle = now - this.lastMove;
    const target = idle < 180 ? 1 : Math.max(0, 1 - (idle - 180) / 900);
    this.mouseE += (target - this.mouseE) * k * 1.2;

    if (this.swapping) {
      const p = Math.min(1, (now - this.swapT0) / 950);
      this.swap = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      if (p >= 1) {
        this.swapping = false;
        this.swap = 1;
      }
    }

    const cur = this.ensureTexture(this.words[this.index]);
    const prevWord = this.words[this.prevIndex];
    const prevTex = this.swap > 0 && this.swap < 1 ? this.ensureTexture(prevWord) : cur;
    if (!cur) return;

    gl.useProgram(this.prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    const loc = gl.getAttribLocation(this.prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(this.u.uRes!, canvas.width, canvas.height);
    gl.uniform1f(this.u.uTime!, now / 1000);
    gl.uniform4f(this.u.uRect!, ...cur.rect);
    gl.uniform1f(this.u.uSwap!, this.swap);
    gl.uniform1i(this.u.uFx!, this.swapFx);
    gl.uniform1i(this.u.uCount!, Math.min(cur.letters.length, 14));
    const arr = new Float32Array(28);
    cur.letters.slice(0, 14).forEach((lr, i) => {
      arr[i * 2] = lr[0];
      arr[i * 2 + 1] = lr[1];
    });
    gl.uniform2fv(this.u.uLetters!, arr);
    gl.uniform2f(this.u.uMouse!, this.mouse[0], this.mouse[1]);
    gl.uniform1f(this.u.uMouseE!, this.mouseE);

    // цвета из CSS-переменных активной темы
    const cs = getComputedStyle(document.documentElement);
    const read = (v: string) => {
      const hex = cs.getPropertyValue(v).trim();
      if (!hex.startsWith("#")) return [0.4, 0.3, 0.15];
      return [
        parseInt(hex.slice(1, 3), 16) / 255,
        parseInt(hex.slice(3, 5), 16) / 255,
        parseInt(hex.slice(5, 7), 16) / 255,
      ];
    };
    gl.uniform3fv(this.u.uFromA1!, new Float32Array(read("--bl-accent")));
    gl.uniform3fv(this.u.uFromA2!, new Float32Array(read("--bl-tag")));
    gl.uniform3fv(this.u.uWordCol!, new Float32Array(read("--bl-text")));
    gl.uniform3fv(this.u.uBgCol!, new Float32Array(read("--bl-bg")));

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, cur.tex);
    gl.uniform1i(this.u.uTexA!, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, prevTex?.tex ?? cur.tex);
    gl.uniform1i(this.u.uTexB!, 1);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private lastFrame = 0;

  private compile(src: string, type: number): WebGLShader | null {
    const gl = this.gl;
    if (!gl) return null;
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn("intro shader:", gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  }
}

const VERTEX_SRC = INTRO_VERTEX;

export const introScene = new IntroScene();
