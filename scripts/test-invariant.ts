// Проверка инварианта редактора: textContent(рендер строки) === исходная строка.
// Запуск: bun scripts/test-invariant.ts
import { renderLine, stripLine, classifyLine, computeStats } from "../src/lib/berloga/markdown";

function htmlToText(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

const CASES = [
  "# Заголовок раз",
  "## Заголовок два",
  "### Три уровня",
  "Обычный текст с **жирным** и *курсивом*",
  "- пункт списка",
  "* звёздный пункт",
  "1. нумерованный",
  "42) другой формат",
  "- [ ] несделано",
  "- [x] сделано",
  "* [ ] звёздное несделано",
  "> цитата строка",
  ">цитата без пробела",
  "---",
  "_____",
  "```glsl",
  "float x = 1.0;",
  "```",
  "#тег в тексте",
  "#пасека/соты вложенный",
  "#много слов# и `код`",
  "[ссылка](https://example.com)",
  "https://автолинк.example/path",
  "~~зачёркнутый~~ и ::выделение::",
  "пустая выше, эта с _подчёркиванием_",
  "китайский 中文 и грузинский გა",
  "",
];

let fails = 0;
for (const raw of CASES) {
  const { html } = renderLine(raw, false);
  const text = htmlToText(html);
  const ok = text === raw;
  if (!ok) {
    fails++;
    console.log(`✗ "${raw}" → "${text}"`);
  }
}

// инвариант внутри кодо-блока
const code = renderLine("  const a = <b> & \"c\";", true);
if (htmlToText(code.html) !== "  const a = <b> & \"c\";") {
  fails++;
  console.log(`✗ код-строка → "${htmlToText(code.html)}"`);
}

// stripLine сохраняет содержимое
const st = stripLine("**жирный** и [текст](https://x.y) с #много слов# и `код` и https://url.example/a");
if (st !== "жирный и текст с много слов и код и https://url.example/a") {
  fails++;
  console.log(`✗ stripLine → "${st}"`);
}

// статистика
const stats = computeStats("- [x] раз\n- [ ] два\n\nтекст");
if (stats.todos.total !== 2 || stats.todos.done !== 1 || stats.words !== 3) {
  fails++;
  console.log(`✗ stats → ${JSON.stringify(stats)}`);
}

console.log(fails === 0 ? "OK: все инварианты выполнены" : `ПРОВАЛОВ: ${fails}`);
process.exit(fails === 0 ? 0 : 1);
