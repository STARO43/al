// Берлога — темы оформления.
// Каждая тема несёт CSS-переменные и GL-палитру для шейдерных переходов.

export type RGB = [number, number, number];

export interface GLPalette {
  bg: RGB;
  a1: RGB; // основной акцент
  a2: RGB; // вторичный акцент (теги, огонь в burn, блики)
}

export interface ThemeDef {
  id: string;
  name: string;
  mode: "light" | "dark";
  vars: Record<string, string>;
  gl: GLPalette;
}

function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

export const THEMES: ThemeDef[] = [
  {
    id: "graphite",
    name: "Графит",
    mode: "light",
    vars: {
      "--bl-bg": "#FBFAF8",
      "--bl-bg2": "#F1EEE9",
      "--bl-surface": "#FFFFFF",
      "--bl-text": "#23201C",
      "--bl-dim": "#6F6A62",
      "--bl-faint": "#A69F93",
      "--bl-accent": "#C0392F",
      "--bl-accent-ink": "#FFF6F3",
      "--bl-border": "#E6E1D8",
      "--bl-sel": "rgba(192, 57, 47, 0.16)",
      "--bl-code-bg": "#F2EFE9",
      "--bl-code-text": "#8C5A2B",
      "--bl-mark": "#C6BEB2",
      "--bl-tag": "#A8482B",
      "--bl-ok": "#3D8B57",
    },
    gl: { bg: hexToRgb("#FBFAF8"), a1: hexToRgb("#C0392F"), a2: hexToRgb("#A8482B") },
  },
  {
    id: "honey",
    name: "Мёд",
    mode: "light",
    vars: {
      "--bl-bg": "#FFF8E9",
      "--bl-bg2": "#F6EAD1",
      "--bl-surface": "#FFFDF6",
      "--bl-text": "#3B2E1C",
      "--bl-dim": "#8A7A5E",
      "--bl-faint": "#BCAB8B",
      "--bl-accent": "#C8781B",
      "--bl-accent-ink": "#FFF9EC",
      "--bl-border": "#EEDFC0",
      "--bl-sel": "rgba(200, 120, 27, 0.16)",
      "--bl-code-bg": "#F7ECD4",
      "--bl-code-text": "#8C5A2B",
      "--bl-mark": "#D6C3A0",
      "--bl-tag": "#A56D1B",
      "--bl-ok": "#5E8C3A",
    },
    gl: { bg: hexToRgb("#FFF8E9"), a1: hexToRgb("#C8781B"), a2: hexToRgb("#A56D1B") },
  },
  {
    id: "charcoal",
    name: "Уголь",
    mode: "dark",
    vars: {
      "--bl-bg": "#212121",
      "--bl-bg2": "#191919",
      "--bl-surface": "#2B2B2B",
      "--bl-text": "#EDEAE4",
      "--bl-dim": "#9C968C",
      "--bl-faint": "#6B655C",
      "--bl-accent": "#E8763A",
      "--bl-accent-ink": "#1C130B",
      "--bl-border": "#363636",
      "--bl-sel": "rgba(232, 118, 58, 0.20)",
      "--bl-code-bg": "#2D2D2D",
      "--bl-code-text": "#E9B183",
      "--bl-mark": "#565249",
      "--bl-tag": "#E9A23B",
      "--bl-ok": "#7BB86C",
    },
    gl: { bg: hexToRgb("#212121"), a1: hexToRgb("#E8763A"), a2: hexToRgb("#E9A23B") },
  },
  {
    id: "dracula",
    name: "Дракула",
    mode: "dark",
    vars: {
      "--bl-bg": "#282A36",
      "--bl-bg2": "#21222C",
      "--bl-surface": "#343746",
      "--bl-text": "#F8F8F2",
      "--bl-dim": "#B8BCD0",
      "--bl-faint": "#6272A4",
      "--bl-accent": "#FF79C6",
      "--bl-accent-ink": "#2A1B2B",
      "--bl-border": "#3E4152",
      "--bl-sel": "rgba(255, 121, 198, 0.18)",
      "--bl-code-bg": "#1E1F29",
      "--bl-code-text": "#8BE9FD",
      "--bl-mark": "#4B4E63",
      "--bl-tag": "#50FA7B",
      "--bl-ok": "#50FA7B",
    },
    gl: { bg: hexToRgb("#282A36"), a1: hexToRgb("#FF79C6"), a2: hexToRgb("#50FA7B") },
  },
  {
    id: "solar-dark",
    name: "Солярис ночь",
    mode: "dark",
    vars: {
      "--bl-bg": "#002B36",
      "--bl-bg2": "#00222B",
      "--bl-surface": "#073642",
      "--bl-text": "#EEE8D5",
      "--bl-dim": "#93A1A1",
      "--bl-faint": "#586E75",
      "--bl-accent": "#B58900",
      "--bl-accent-ink": "#002B36",
      "--bl-border": "#0B4653",
      "--bl-sel": "rgba(181, 137, 0, 0.22)",
      "--bl-code-bg": "#04313C",
      "--bl-code-text": "#2AA198",
      "--bl-mark": "#2E5059",
      "--bl-tag": "#2AA198",
      "--bl-ok": "#859900",
    },
    gl: { bg: hexToRgb("#002B36"), a1: hexToRgb("#B58900"), a2: hexToRgb("#2AA198") },
  },
  {
    id: "solar-light",
    name: "Солярис день",
    mode: "light",
    vars: {
      "--bl-bg": "#FDF6E3",
      "--bl-bg2": "#EEE8D5",
      "--bl-surface": "#FFFBF0",
      "--bl-text": "#3E4B52",
      "--bl-dim": "#657B83",
      "--bl-faint": "#93A1A1",
      "--bl-accent": "#CB4B16",
      "--bl-accent-ink": "#FDF6E3",
      "--bl-border": "#E7DFC6",
      "--bl-sel": "rgba(203, 75, 22, 0.15)",
      "--bl-code-bg": "#F3ECDA",
      "--bl-code-text": "#268BD2",
      "--bl-mark": "#D8CFB4",
      "--bl-tag": "#268BD2",
      "--bl-ok": "#859900",
    },
    gl: { bg: hexToRgb("#FDF6E3"), a1: hexToRgb("#CB4B16"), a2: hexToRgb("#268BD2") },
  },
  {
    id: "night-honey",
    name: "Ночная пасека",
    mode: "dark",
    vars: {
      "--bl-bg": "#100D09",
      "--bl-bg2": "#0A0806",
      "--bl-surface": "#1B150D",
      "--bl-text": "#F2E8D5",
      "--bl-dim": "#9C8B66",
      "--bl-faint": "#6B5E45",
      "--bl-accent": "#F0B429",
      "--bl-accent-ink": "#171207",
      "--bl-border": "#2C2416",
      "--bl-sel": "rgba(240, 180, 41, 0.16)",
      "--bl-code-bg": "#191409",
      "--bl-code-text": "#E8C56A",
      "--bl-mark": "#4A3D26",
      "--bl-tag": "#E0A32E",
      "--bl-ok": "#9DB85E",
    },
    gl: { bg: hexToRgb("#100D09"), a1: hexToRgb("#F0B429"), a2: hexToRgb("#E0A32E") },
  },
];

export const DEFAULT_THEME = "graphite";

export function getTheme(id: string): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function applyThemeVars(id: string) {
  const th = getTheme(id);
  const root = document.documentElement;
  for (const [k, v] of Object.entries(th.vars)) root.style.setProperty(k, v);
  root.dataset.theme = th.id;
  root.style.colorScheme = th.mode;
}

// Палитра темы в виде CSS-переменных (для чтения в GL до применения темы)
export function themeCSSVars(id: string): Record<string, string> {
  return getTheme(id).vars;
}
