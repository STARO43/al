// Берлога — стор данных. Всё живёт в localStorage, никаких серверов.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { DEFAULT_THEME } from "./themes";

export interface Note {
  id: string;
  text: string;
  created: number;
  modified: number;
  pinned: boolean;
  archived: boolean;
  trashed: boolean;
}

export type SortMode = "modified" | "created" | "title";
export type ViewMode = "notes" | "shortcuts" | "archive" | "trash" | "tag";

export interface Settings {
  theme: string;
  introSeen: boolean;
  fontSize: number;
  sortMode: SortMode;
  infoOpen: boolean;
  effectsOn: boolean;
}

export interface Activity {
  [day: string]: number; // YYYY-MM-DD -> правок
}

interface BerlogaState {
  notes: Note[];
  settings: Settings;
  activity: Activity;
  // ephemeral
  selectedId: string | null;
  view: ViewMode;
  tagFilter: string | null;
  query: string;
  paletteOpen: boolean;
  settingsOpen: boolean;
  introOpen: boolean;
  transitionCount: number;

  createNote: (text?: string) => string;
  updateNote: (id: string, text: string) => void;
  setTitleHack: (id: string, text: string) => void;
  trashNote: (id: string) => void;
  restoreNote: (id: string) => void;
  purgeNote: (id: string) => void;
  emptyTrash: () => void;
  togglePin: (id: string) => void;
  toggleArchive: (id: string) => void;
  select: (id: string | null) => void;
  setView: (v: ViewMode) => void;
  setTagFilter: (t: string | null) => void;
  setQuery: (q: string) => void;
  setSettings: (p: Partial<Settings>) => void;
  setPaletteOpen: (o: boolean) => void;
  setSettingsOpen: (o: boolean) => void;
  setIntroOpen: (o: boolean) => void;
  bumpTransition: () => void;
}

const now = Date.now();
const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

function seedNotes(): Note[] {
  return [
    {
      id: "seed-welcome",
      text: `# Добро пожаловать в Берлогу

Это ваша личная берлога для заметок. Всё живёт **прямо в браузере** — без серверов, без аккаунтов, без интернета. Закройте вкладку — ничего не потеряется.

## Что тут умеется

- Markdown красится **на лету**, как только вы печатаете
- Важное помечается ::выделением::, а суета — ~~зачёркивается~~
- Мысли собираются в #теги и вложенные #пасека/соты
- Поиск и команды живут за \`Cmd + K\`

## Шпаргалка

**Жирный**, *курсив*, ~~зачёркнуто~~, ::выделение::, \`инлайн-код\`

- [x] открыть Берлогу
- [ ] поставить звёздочку важной заметке
- [ ] попробовать тему «Ночная пасека»

> Хорошие заметки — это не архив. Это разговор с собой из будущего.

Ссылка на первоисточник: [bear.app](https://bear.app) — оригинал, вдохновивший эту берлогу.

#начало`,
      created: now - 3 * MIN,
      modified: now - 3 * MIN,
      pinned: true,
      archived: false,
      trashed: false,
    },
    {
      id: "seed-trip",
      text: `# Чек-лист: вылазка в горы

Сборы на выходные. Старт в субботу в 7:00.

## Снаряжение

- [x] палатка и тент
- [x] спальник до −5°
- [ ] горелка + баллон
- [ ] аптечка, пополнить пластыри
- [ ] термос, 1.2 л

## Маршрут

1. Перевал Озёрный — 4 часа
2. Обед у водопада
3. Ночёвка у *Голубого озера*

> Мокрые носки — главный враг похода. Возьмите четыре пары.

#походы/снаряжение #походы/маршруты`,
      created: now - 1 * DAY - 2 * HOUR,
      modified: now - 5 * HOUR,
      pinned: false,
      archived: false,
      trashed: false,
    },
    {
      id: "seed-ideas",
      text: `# Копилка идей

Складываю сюда всё, что всплывает в голове. Правило простое: сначала записать, разбирать потом.

- Сайт-визитка для мастерской с ::генеративным фоном::
- Демо WebGL-переходов для портфолио
- Подкаст про старые интерфейсы — *«кнопки, которые мы потеряли»*
- Научиться лепить керамику — хотя бы кружку

Мысль про дизайн: **типографика — это голос текста**. Крупные надписи можно трогать, они должны отзываться.

#идеи/сайты #идеи/проекты`,
      created: now - 4 * DAY,
      modified: now - 26 * HOUR,
      pinned: false,
      archived: false,
      trashed: false,
    },
    {
      id: "seed-quotes",
      text: `# Выдержки и цитаты

> Писать — значит бороться с забывчивостью. Записная книжка — тренажёр памяти.
> — из блокнота, страница неизвестна

> Простота — сложнейшая вещь на свете. Над ней нужно долго работать.
> — приписывается Чарльзу Чаплину

Заметка на полях: слова имеют ::вес:: только когда ты можешь их найти.

#цитаты`,
      created: now - 9 * DAY,
      modified: now - 3 * DAY,
      pinned: false,
      archived: false,
      trashed: false,
    },
    {
      id: "seed-code",
      text: `# Шпаргалка: шейдерный раствор

Рабочий фрагмент для плавного растворения:

\`\`\`glsl
float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

// растворение крупными пикселями
float cells = rand(floor(uv * 40.0));
float alpha = step(cells, uProgress);
\`\`\`

Параметры, которые обычно кручу:

- \`uProgress\` — ход перехода, 0..1
- сетка 40 — крупные пиксели, 90 — мелкие
- шаг \`step\` можно заменить на \`smoothstep\` для мягкости

#код/glsl`,
      created: now - 15 * DAY,
      modified: now - 6 * DAY,
      pinned: false,
      archived: false,
      trashed: false,
    },
  ];
}

function todayKey(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const uid = () =>
  `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const useBerloga = create<BerlogaState>()(
  persist(
    (set, get) => ({
      notes: seedNotes(),
      settings: {
        theme: DEFAULT_THEME,
        introSeen: false,
        fontSize: 17,
        sortMode: "modified",
        infoOpen: true,
        effectsOn: true,
      },
      activity: {},
      selectedId: "seed-welcome",
      view: "notes",
      tagFilter: null,
      query: "",
      paletteOpen: false,
      settingsOpen: false,
      introOpen: false,
      transitionCount: 0,

      createNote: (text) => {
        const t = Date.now();
        const id = uid();
        const note: Note = {
          id,
          text: text ?? "",
          created: t,
          modified: t,
          pinned: false,
          archived: false,
          trashed: false,
        };
        set((s) => ({ notes: [note, ...s.notes], selectedId: id, view: s.view === "tag" || s.view === "trash" || s.view === "archive" ? "notes" : s.view, tagFilter: null, query: "" }));
        return id;
      },

      updateNote: (id, text) => {
        set((s) => {
          const day = todayKey();
          return {
            notes: s.notes.map((n) => (n.id === id ? { ...n, text, modified: Date.now() } : n)),
            activity: { ...s.activity, [day]: (s.activity[day] ?? 0) + 1 },
          };
        });
      },

      // обновить время правки, не трогая activity (внутренние правки)
      setTitleHack: (_id, _text) => { void _id; void _text; },

      trashNote: (id) =>
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id ? { ...n, trashed: true, pinned: false } : n)),
          selectedId: s.selectedId === id ? null : s.selectedId,
        })),

      restoreNote: (id) =>
        set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, trashed: false, archived: false } : n)) })),

      purgeNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id), selectedId: s.selectedId === id ? null : s.selectedId })),

      emptyTrash: () => set((s) => ({ notes: s.notes.filter((n) => !n.trashed) })),

      togglePin: (id) =>
        set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)) })),

      toggleArchive: (id) =>
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id ? { ...n, archived: !n.archived, pinned: false } : n)),
          selectedId: s.selectedId === id ? null : s.selectedId,
        })),

      select: (id) => set({ selectedId: id }),
      setView: (v) => set({ view: v, tagFilter: v === "tag" ? get().tagFilter : null }),
      setTagFilter: (t) => set({ tagFilter: t, view: "tag" }),
      setQuery: (q) => set({ query: q }),
      setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
      setPaletteOpen: (o) => set({ paletteOpen: o }),
      setSettingsOpen: (o) => set({ settingsOpen: o }),
      setIntroOpen: (o) => set({ introOpen: o }),
      bumpTransition: () => set((s) => ({ transitionCount: s.transitionCount + 1 })),
    }),
    {
      name: "berloga.v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ notes: s.notes, settings: s.settings, activity: s.activity }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<BerlogaState>;
        return {
          ...current,
          ...p,
          settings: { ...current.settings, ...(p.settings ?? {}) },
          notes: Array.isArray(p.notes) && p.notes.length ? p.notes : current.notes,
          activity: p.activity ?? {},
        };
      },
    }
  )
);

// --- селекторы-помощники ------------------------------------------------

// отладочный доступ: window.berloga.getState() в консоли браузера
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).berloga = useBerloga;
}

export function noteTitle(note: Note): string {
  for (const raw of note.text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    return line
      .replace(/^#{1,6}\s+/, "")
      .replace(/^[-*+]\s+\[[ xX]\]\s*/, "")
      .replace(/^[-*+>\s]+/, "")
      .replace(/^#{1,6}/, "")
      .trim();
  }
  return "";
}

export function notePreview(note: Note, maxLen = 120): string {
  const lines = note.text.split("\n");
  const parts: string[] = [];
  let skipped = 0;
  for (const raw of lines) {
    const t = raw.trim();
    if (!t) continue;
    if (t.startsWith("#") && skipped === 0) { skipped = 1; continue; }
    parts.push(t);
    if (parts.join(" ").length > maxLen) break;
  }
  return parts.join(" ").slice(0, maxLen);
}

export function visibleNotes(state: Pick<BerlogaState, "notes" | "view" | "tagFilter" | "query" | "settings">): Note[] {
  const { notes, view, tagFilter, query, settings } = state;
  let list = notes.filter((n) => !n.trashed);
  if (view === "trash") list = notes.filter((n) => n.trashed);
  else if (view === "archive") list = notes.filter((n) => n.archived);
  else if (view === "tag") {
    list = notes.filter((n) => !n.trashed && !n.archived && hasTag(n, tagFilter ?? ""));
  } else if (view === "shortcuts") list = notes.filter((n) => !n.trashed && !n.archived && n.pinned);
  else list = notes.filter((n) => !n.trashed && !n.archived);

  const q = query.trim().toLowerCase();
  if (q) {
    list = list.filter((n) => n.text.toLowerCase().includes(q));
  }
  const sorted = [...list].sort((a, b) => {
    if (settings.sortMode === "created") return b.created - a.created;
    if (settings.sortMode === "title") return noteTitle(a).localeCompare(noteTitle(b), "ru");
    return b.modified - a.modified;
  });
  if (settings.sortMode === "title") return sorted;
  // закреплённые всплывают
  return [...sorted.filter((n) => n.pinned && view !== "trash"), ...sorted.filter((n) => !(n.pinned && view !== "trash"))];
}

export function hasTag(note: Note, tag: string): boolean {
  if (!tag) return false;
  const lower = tag.toLowerCase();
  return note.text.toLowerCase().includes(`#${lower}`);
}
