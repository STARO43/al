// Берлога — движок полноэкранных GL-переходов (GPU-ускоренный оверлей).

import { EFFECT_IDS, buildFragment, VERTEX, effectById, type EffectId } from "./effects";
import type { GLPalette } from "../themes";

export interface TransitionOptions {
  effect?: EffectId;
  from: GLPalette;
  to: GLPalette;
  duration?: number; // мс
  onMid?: () => void; // в середине — например, подмена темы
  onDone?: () => void;
}

interface ProgramInfo {
  prog: WebGLProgram;
  u: Record<string, WebGLUniformLocation | null>;
}

function compile(gl: WebGLRenderingContext, src: string, type: number): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn("GL transition shader error:", gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export class GLTransitionEngine {
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGLRenderingContext | null = null;
  private buffer: WebGLBuffer | null = null;
  private programs = new Map<string, ProgramInfo>();
  private raf = 0;
  private playing = false;
  private midFired = false;
  private active: ProgramInfo | null = null;
  private t0 = 0;
  private dur = 600;
  private doneCb: (() => void) | null = null;
  private resizeHandler = () => this.resize();

  attach(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = (canvas.getContext("webgl", { antialias: false, alpha: false, preserveDrawingBuffer: false }) ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    this.gl = gl;
    if (!gl) return;
    // геометрия — полноэкранный квад (два треугольника)
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    this.resize();
    window.addEventListener("resize", this.resizeHandler);
  }

  detach() {
    window.removeEventListener("resize", this.resizeHandler);
    cancelAnimationFrame(this.raf);
    this.playing = false;
  }

  private resize() {
    if (!this.canvas || !this.gl) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(window.innerWidth * dpr);
    const h = Math.floor(window.innerHeight * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.gl.viewport(0, 0, w, h);
  }

  private getProgram(effectId: string): ProgramInfo | null {
    const gl = this.gl;
    if (!gl) return null;
    let info = this.programs.get(effectId);
    if (info) return info;
    const vs = compile(gl, VERTEX, gl.VERTEX_SHADER);
    const fs = compile(gl, buildFragment(effectById(effectId)), gl.FRAGMENT_SHADER);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    if (!prog) return null;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn("GL transition link error:", gl.getProgramInfoLog(prog));
      return null;
    }
    info = {
      prog,
      u: {
        uRes: gl.getUniformLocation(prog, "uRes"),
        uProgress: gl.getUniformLocation(prog, "uProgress"),
        uTime: gl.getUniformLocation(prog, "uTime"),
        uFromBg: gl.getUniformLocation(prog, "uFromBg"),
        uFromA1: gl.getUniformLocation(prog, "uFromA1"),
        uFromA2: gl.getUniformLocation(prog, "uFromA2"),
        uToBg: gl.getUniformLocation(prog, "uToBg"),
        uToA1: gl.getUniformLocation(prog, "uToA1"),
        uToA2: gl.getUniformLocation(prog, "uToA2"),
      },
    };
    this.programs.set(effectId, info);
    return info;
  }

  play(opts: TransitionOptions): Promise<void> {
    const effect = opts.effect ?? EFFECT_IDS[Math.floor(Math.random() * EFFECT_IDS.length)] as EffectId;
    this.dur = opts.duration ?? 900;
    const gl = this.gl;
    const canvas = this.canvas;
    if (!gl || !canvas) {
      // WebGL недоступен — честный CSS-фолбэк
      return cssFallback(opts);
    }
    const info = this.getProgram(effect);
    if (!info) return cssFallback(opts);

    return new Promise((resolve) => {
      gl.useProgram(info.prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      const locA = gl.getAttribLocation(info.prog, "aPos");
      gl.enableVertexAttribArray(locA);
      gl.vertexAttribPointer(locA, 2, gl.FLOAT, false, 0, 0);

      const p = opts;
      gl.uniform2f(info.u.uRes!, canvas.width, canvas.height);
      gl.uniform3fv(info.u.uFromBg!, p.from.bg);
      gl.uniform3fv(info.u.uFromA1!, p.from.a1);
      gl.uniform3fv(info.u.uFromA2!, p.from.a2);
      gl.uniform3fv(info.u.uToBg!, p.to.bg);
      gl.uniform3fv(info.u.uToA1!, p.to.a1);
      gl.uniform3fv(info.u.uToA2!, p.to.a2);

      this.active = info;
      this.midFired = false;
      this.playing = true;
      this.t0 = performance.now();
      this.doneCb = () => {
        this.playing = false;
        canvas.style.display = "none";
        opts.onDone?.();
        resolve();
      };
      canvas.style.display = "block";
      cancelAnimationFrame(this.raf);
      const loop = (now: number) => {
        if (!this.playing) return;
        const raw = Math.min(1, (now - this.t0) / this.dur);
        // мягкое eased-продвижение
        const prog = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2;
        if (!this.midFired && raw >= 0.5) {
          this.midFired = true;
          opts.onMid?.();
        }
        gl!.useProgram(this.active!.prog);
        gl!.uniform1f(this.active!.u.uProgress!, prog);
        gl!.uniform1f(this.active!.u.uTime!, now / 1000);
        gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
        if (raw >= 1) {
          this.doneCb?.();
          return;
        }
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    });
  }

  get isPlaying() {
    return this.playing;
  }
}

function cssFallback(opts: TransitionOptions): Promise<void> {
  return new Promise((resolve) => {
    const div = document.createElement("div");
    div.style.cssText = `position:fixed;inset:0;z-index:70;pointer-events:none;background:${rgbCss(opts.to.bg)};opacity:0;transition:opacity ${opts.duration ?? 600}ms ease-in-out`;
    document.body.appendChild(div);
    requestAnimationFrame(() => {
      div.style.opacity = "1";
    });
    setTimeout(() => {
      opts.onMid?.();
      div.style.opacity = "0";
      setTimeout(() => {
        div.remove();
        opts.onDone?.();
        resolve();
      }, (opts.duration ?? 600) / 2 + 60);
    }, (opts.duration ?? 600) / 2);
  });
}

function rgbCss(c: [number, number, number]): string {
  return `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;
}

export const glTransition = new GLTransitionEngine();
