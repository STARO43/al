# Берлога — офлайн-заметки в духе Bear

Полностью автономный клон [bear.app](https://web.bear.app/): заметки живут в `localStorage` вашего браузера, ни один байт не уходит в сеть. Сверху — художественная надстройка: кинетическая WebGL-заставка, шейдерные переходы между темами и живая типографика в редакторе.

```
МЫСЛИ → СЛОВА → ИДЕИ → БЕРЛОГА
```

## Возможности

**Заметки**
- Markdown подсвечивается на лету: заголовки, `**жирный**`, `*курсив*`, `~~зачёркнутый~~`, `::выделение::`, `` `код` ``, блоки кода, списки, чекбоксы, цитаты, разделители
- Теги `#так` и вложенные `#пасека/соты`, многословные `#много слов#` — клик по тегу фильтрует список
- Чекбоксы кликабельны, Enter продолжает список, Backspace склеивает строки
- Своё undo/redo (`⌘Z` / `⇧⌘Z`), вставка текста, `⌘B` / `⌘I` оборачивают выделение в маркеры
- Статистика: слова, знаки, абзацы, время чтения, задачи; оглавление с переходом к строке
- Пульс берлоги — график правок за 14 дней (canvas)
- Избранное, архив, корзина с восстановлением; поиск; группировка по датам
- Палитра команд `⌘K`: заметки, команды, темы
- Экспорт заметки в `.md` / `.txt` / `.html` и всего архива одним `.md`
- 7 тем: Графит, Мёд, Уголь, Дракула, Солярис ночь/день, Ночная пасека

**Визуальные эксперименты**
- Кинетическая WebGL-заставка: слово рисуется текстурой, каждая буква независимо «дышит», от курсора расходится медовая рябь. Колесо мыши листает слова через шейдерные переходы (растворение / рябь / зум)
- Смена темы — полноэкранный GPU-переход: 9 GLSL-эффектов, портированных и переосмысленных из [GL Transitions](https://gl-transitions.com/) (MIT, автор gre): dissolve, pixel, ripple, wind, zoom, circle, blinds, burn, honey-flow
- Фон заставки — процедурный fbm-«мёд», виньетка и плёночное зерно
- Шрифты (Unbounded, Inter, JetBrains Mono) лежат локально в `public/fonts` — вёрстка не зависит от сети

## Запуск локально

```bash
bun install
bun run dev        # http://localhost:3000
```

## Деплой на GitHub Pages

Репозиторий уже настроен: workflow `.github/workflows/deploy.yml` собирает статический экспорт и публикует его.

1. Запушьте проект в репозиторий GitHub (ветка `main`).
2. `Settings → Pages → Source: GitHub Actions`.
3. Готово: сайт появится на `https://<user>.github.io/<repo>/`.

Если репозиторий называется не `<user>.github.io`, раскомментируйте в workflow строки с `NEXT_PUBLIC_BASE_PATH` — basePath нужен, чтобы ассеты лежали в подпапке.

Ручная сборка под Pages (без Actions):

```bash
npm run build:static          # или bun run build:static
# NEXT_PUBLIC_BASE_PATH="/имя-репо" npm run build:static — если сайт живёт в подпапке
# результат — папка out/, заливайте как угодно
```

## Структура

```
src/
  app/                 layout, страница, стили (berloga.css — вся дизайн-система)
  components/berloga/  Rail, NoteList, TagsPanel, Editor, InfoPanel, Palette,
                       SettingsDialog, Intro, Berloga (корень)
  lib/berloga/
    store.ts           zustand + persist (localStorage) + сид-заметки
    markdown.ts        токенайзер, построчный рендер, статистика, TOC, экспорт
    tags.ts            извлечение тегов и дерево
    themes.ts          7 тем: CSS-переменные + GL-палитры
    exporter.ts        скачивание файлов через Blob
    gl/effects.ts      GLSL-эффекты переходов
    gl/transition.ts   движок полноэкранных GL-переходов
    gl/intro.ts        кинетическая сцена заставки
public/fonts/          woff2 (кириллица+латиница) + fonts.css
.github/workflows/     деплой на GitHub Pages
```

## Приватность

Нет бэкенда, нет аналитики, нет внешних запросов. Всё — `localStorage` (ключ `berloga.v1`). «Опасная зона» в настройках стирает данные безвозвратно.

## Благодарности

- [Bear](https://bear.app) — эталон уюта, у которого мы учились
- [GL Transitions](https://gl-transitions.com/) (gre, MIT) — источник идей для шейдерных переходов
- [Unbounded](https://fonts.google.com/specimen/Unbounded), [Inter](https://fonts.google.com/specimen/Inter), [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) — шрифты (OFL)
