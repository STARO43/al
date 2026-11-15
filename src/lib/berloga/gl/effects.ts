// Берлога — библиотека GLSL-эффектов для шейдерных переходов.
// Вдохновлено открытым проектом GL Transitions (gre, MIT) — dissolve, ripple,
// wind портированы и адаптированы; pixel, blinds, burn, honey, zoom, circle —
// авторские вариации в том же духе. Все сцены — процедурные цветовые поля,
// поэтому переходы не требуют текстур и летают на GPU.

import type { GLPalette } from "../themes";

export const PRELUDE = `
precision highp float;
uniform vec2 uRes;
uniform float uProgress;
uniform float uTime;
uniform vec3 uFromBg;
uniform vec3 uFromA1;
uniform vec3 uFromA2;
uniform vec3 uToBg;
uniform vec3 uToA1;
uniform vec3 uToA2;
varying vec2 vUv;

float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = rand(i);
  float b = rand(i + vec2(1.0, 0.0));
  float c = rand(i + vec2(0.0, 1.0));
  float d = rand(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// процедурная «сцена»: фон темы + два мягких световых пятна акцентов
vec3 sceneOf(vec3 bg, vec3 a1, vec3 a2, vec2 uv) {
  float ar = uRes.x / max(uRes.y, 1.0);
  vec3 c = mix(bg * 0.94, bg * 1.05, uv.y);
  vec2 p1 = vec2(0.24, 0.30);
  vec2 p2 = vec2(0.78, 0.72);
  float d1 = distance((uv - p1) * vec2(ar, 1.0), vec2(0.0));
  float d2 = distance((uv - p2) * vec2(ar, 1.0), vec2(0.0));
  c = mix(c, a1, exp(-d1 * d1 * 6.0) * 0.30);
  c = mix(c, a2, exp(-d2 * d2 * 8.0) * 0.20);
  c += (vnoise(uv * 7.0) - 0.5) * 0.018;
  return c;
}
`;

const BODY = `
vec3 A(vec2 uv) { return sceneOf(uFromBg, uFromA1, uFromA2, uv); }
vec3 B(vec2 uv) { return sceneOf(uToBg, uToA1, uToA2, uv); }
`;

export interface EffectDef {
  id: string;
  name: string;
  glsl: string; // тело: vec3 fx(vec2 uv, float p)
}

export const EFFECTS: EffectDef[] = [
  {
    id: "dissolve",
    name: "Растворение",
    glsl: `
vec3 fx(vec2 uv, float p) {
  return mix(A(uv), B(uv), step(rand(uv * uRes * 0.5), p));
}`,
  },
  {
    id: "pixel",
    name: "Пиксели",
    glsl: `
vec3 fx(vec2 uv, float p) {
  vec2 grid = vec2(44.0, 25.0);
  vec2 cell = floor(uv * grid);
  float r = rand(cell + 3.7);
  float lp = clamp((p * 1.35 - r * 0.35), 0.0, 1.0);
  vec3 c = mix(A(uv), B(uv), step(0.5, lp));
  float g = 1.0 - abs(lp - 0.5) * 2.0;
  c += uToA1 * pow(max(g, 0.0), 5.0) * 0.7;
  return c;
}`,
  },
  {
    id: "ripple",
    name: "Рябь",
    glsl: `
vec3 fx(vec2 uv, float p) {
  float w = sin((uv.x * 9.0 + p * 8.0)) * 0.10 * abs(uv.y - 0.5) * 2.0;
  float w2 = cos((uv.y * 7.0 - p * 6.0)) * 0.05;
  float pp = smoothstep(0.18, 0.82, clamp(p + w + w2, 0.0, 1.0));
  vec3 c = mix(A(uv), B(uv), pp);
  float front = 1.0 - abs(pp - 0.5) * 2.0;
  c += mix(uFromA1, uToA1, p) * pow(max(front, 0.0), 8.0) * 0.5;
  return c;
}`,
  },
  {
    id: "wind",
    name: "Ветер",
    glsl: `
vec3 fx(vec2 uv, float p) {
  float row = rand(vec2(0.0, floor(uv.y * 60.0) / 60.0));
  float lag = row * 0.4;
  float pp = clamp((p * 1.25 - lag) / 0.85, 0.0, 1.0);
  vec3 acc = vec3(0.0);
  for (int k = 0; k < 8; k++) {
    float o = float(k) / 7.0;
    float x = uv.x + (o - 0.5) * 0.3 * (1.0 - pp);
    float t = clamp((pp - o * 0.12) * 1.3, 0.0, 1.0);
    acc += mix(A(vec2(x, uv.y)), B(vec2(x, uv.y)), smoothstep(0.0, 1.0, t));
  }
  return acc / 8.0;
}`,
  },
  {
    id: "zoom",
    name: "Зум",
    glsl: `
vec3 fx(vec2 uv, float p) {
  vec2 c = vec2(0.5);
  vec3 acc = vec3(0.0);
  float total = 0.0;
  float ar = uRes.x / max(uRes.y, 1.0);
  for (int k = 0; k < 10; k++) {
    float t = float(k) / 9.0;
    if (p < 0.5) {
      float q = p / 0.5;
      float sc = mix(1.0, 1.8, min(q * (1.0 + t * 0.18), 1.0));
      vec2 suv = (uv - c) / sc + c;
      float alpha = 1.0 - q;
      acc += A(suv) * alpha;
      total += alpha;
    } else {
      float q = (p - 0.5) / 0.5;
      float sc = mix(1.8, 1.0, q);
      vec2 suv = (uv - c) / sc + c;
      suv = mix(suv, c, t * 0.08 * (1.0 - q));
      float alpha = q;
      acc += B(suv) * alpha;
      total += alpha;
    }
  }
  return acc / max(total, 0.001);
}`,
  },
  {
    id: "circle",
    name: "Круг",
    glsl: `
vec3 fx(vec2 uv, float p) {
  float ar = uRes.x / max(uRes.y, 1.0);
  float r = distance((uv - vec2(0.5)) * vec2(ar, 1.0), vec2(0.0));
  float maxr = distance(vec2(ar, 1.0) * 0.5, vec2(0.0)) * 1.05;
  float pp = smoothstep(0.0, 1.0, p);
  float d = pp * maxr;
  float edge = 0.05 + 0.02 * (1.0 - pp);
  float m = 1.0 - smoothstep(d - edge, d + edge, r);
  vec3 c = mix(A(uv), B(uv), m);
  float ring = exp(-pow((r - d) / (edge * 1.6), 2.0));
  c += uToA1 * ring * 0.85 * (1.0 - step(0.999, pp));
  return c;
}`,
  },
  {
    id: "blinds",
    name: "Жалюзи",
    glsl: `
vec3 fx(vec2 uv, float p) {
  float bands = 9.0;
  float bi = floor(uv.y * bands);
  float lag = rand(vec2(bi, 3.7)) * 0.45;
  float pp = clamp((p * 1.4 - lag) / 0.95, 0.0, 1.0);
  float dir = mod(bi, 2.0) * 2.0 - 1.0;
  float x = dir > 0.0 ? uv.x : 1.0 - uv.x;
  float m = step(x, pp);
  vec3 c = mix(A(uv), B(uv), m);
  float edge = exp(-pow((x - pp) / 0.02, 2.0));
  c += mix(uFromA1, uToA1, p) * edge * 0.6;
  return c;
}`,
  },
  {
    id: "burn",
    name: "Выжигание",
    glsl: `
vec3 fx(vec2 uv, float p) {
  float n = vnoise(uv * 6.0) * 0.65 + vnoise(uv * 18.0 + 4.2) * 0.35;
  float pp = p * 1.35 - 0.18;
  float m = smoothstep(pp - 0.07, pp + 0.02, n);
  vec3 c = mix(A(uv), B(uv), 1.0 - m);
  float edge = exp(-pow((n - pp) / 0.05, 2.0));
  vec3 fire = mix(uFromA1, uToA1, smoothstep(0.0, 1.0, p));
  c += fire * edge * 1.1 * (1.0 - smoothstep(0.9, 1.0, p));
  c += uToA2 * edge * edge * 0.5;
  return c;
}`,
  },
  {
    id: "honey",
    name: "Медовый поток",
    glsl: `
vec2 flow(vec2 uv, float t) {
  float n1 = vnoise(uv * 3.5 + t * 0.18);
  float n2 = vnoise(uv * 3.5 + 7.3 - t * 0.14);
  return uv + (vec2(n1, n2) - 0.5) * 0.055;
}
vec3 fx(vec2 uv, float p) {
  float wob = (vnoise(vec2(uv.y * 3.0 + 1.7, p * 2.0)) - 0.5) * 0.4;
  float d = p * 1.4 - 0.2;
  float m = 1.0 - smoothstep(0.0, 0.32, uv.x - d + wob);
  vec3 c = mix(A(flow(uv, uTime)), B(flow(uv, uTime + 3.0)), m);
  float front = exp(-pow((uv.x - d + wob) / 0.12, 2.0));
  c += mix(uFromA1, uToA1, p) * front * 0.5;
  return c;
}`,
  },
];

export const EFFECT_IDS = EFFECTS.map((e) => e.id);
export type EffectId = (typeof EFFECT_IDS)[number];

export function effectById(id: string): EffectDef {
  return EFFECTS.find((e) => e.id === id) ?? EFFECTS[0];
}

export function randomEffect(): EffectId {
  return EFFECT_IDS[Math.floor(Math.random() * EFFECT_IDS.length)] as EffectId;
}

export function buildFragment(effect: EffectDef): string {
  return `${PRELUDE}
${BODY}
${effect.glsl}
void main() {
  vec2 uv = vUv;
  vec3 c = fx(uv, uProgress);
  gl_FragColor = vec4(c, 1.0);
}`;
}

export const VERTEX = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = (aPos + 1.0) * 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

// палитра в GLSL uniform-виде
export interface PaletteUniforms {
  fromBg: GLPalette["bg"]; toBg: GLPalette["bg"];
  fromA1: GLPalette["a1"]; toA1: GLPalette["a1"];
  fromA2: GLPalette["a2"]; toA2: GLPalette["a2"];
}
