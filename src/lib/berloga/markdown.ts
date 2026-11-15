// Берлога — markdown-движок.
// Ключевой инвариант: textContent отрендеренной строки === исходной строке.
// Синтаксические маркеры сохраняются в тексте (и стильно приглушаются),
// благодаря чему каретка и undo считаются по абсолютному смещению символов.

export type LineType =
  | "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
  | "quote" | "todo" | "ul" | "ol" | "hr" | "fence" | "code" | "text";

export interface Tok {
  t: "code" | "bold" | "italic" | "strike" | "mark" | "link" | "tag" | "url";
  s: number; // начало токена
  e: number; // конец (эксклюзивно)
  ml: number; // длина маркера с каждой стороны (0 — без маркеров)
  label?: [number, number]; // диапазон текста ссылки
  url?: string;
}

const CYR = "0-9A-Za-zА-Яа-яЁё";

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const WORD_RE = /[0-9A-Za-zА-Яа-яЁё_*/~:#[\]']/;

// --- инлайн-токенизатор ---------------------------------------------------

export function scanInline(line: string): Tok[] {
  const toks: Tok[] = [];
  const n = line.length;
  let i = 0;
  const boundary = (idx: number) => idx === 0 || !WORD_RE.test(line[idx - 1]);

  while (i < n) {
    const ch = line[i];
    // инлайн-код
    if (ch === "`") {
      const j = line.indexOf("`", i + 1);
      if (j !== -1 && j > i + 1) {
        toks.push({ t: "code", s: i, e: j + 1, ml: 1 });
        i = j + 1;
        continue;
      }
    }
    // теги: #много слов# (закрытый), затем #слово/вложение
    if (ch === "#" && boundary(i)) {
      const multi = /^#([^#\n]{1,64})#/.exec(line.slice(i));
      if (multi && multi[1].trim().length > 0 && !multi[1].endsWith(" ")) {
        toks.push({ t: "tag", s: i, e: i + multi[0].length, ml: 0 });
        i += multi[0].length;
        continue;
      }
      const single = new RegExp(`^#([${CYR}][${CYR}_/-]*)`).exec(line.slice(i));
      if (single && single[0].length > 1) {
        toks.push({ t: "tag", s: i, e: i + single[0].length, ml: 0 });
        i += single[0].length;
        continue;
      }
    }
    // жирный
    if (line.startsWith("**", i) || line.startsWith("__", i)) {
      const mkr = line.slice(i, i + 2);
      const j = line.indexOf(mkr, i + 2);
      if (j !== -1 && j > i + 1) {
        toks.push({ t: "bold", s: i, e: j + 2, ml: 2 });
        i = j + 2;
        continue;
      }
    }
    // зачёркнутый
    if (line.startsWith("~~", i)) {
      const j = line.indexOf("~~", i + 2);
      if (j !== -1 && j > i + 1) {
        toks.push({ t: "strike", s: i, e: j + 2, ml: 2 });
        i = j + 2;
        continue;
      }
    }
    // выделение
    if (line.startsWith("::", i)) {
      const j = line.indexOf("::", i + 2);
      if (j !== -1 && j > i + 1) {
        toks.push({ t: "mark", s: i, e: j + 2, ml: 2 });
        i = j + 2;
        continue;
      }
    }
    // курсив *
    if (ch === "*" && !line.startsWith("**", i) && boundary(i)) {
      const j = line.indexOf("*", i + 1);
      if (j !== -1 && j > i && line[j + 1] !== "*") {
        toks.push({ t: "italic", s: i, e: j + 1, ml: 1 });
        i = j + 1;
        continue;
      }
    }
    // курсив _
    if (ch === "_" && !line.startsWith("__", i) && boundary(i)) {
      const j = line.indexOf("_", i + 1);
      if (j !== -1 && j > i && line[j + 1] !== "_") {
        toks.push({ t: "italic", s: i, e: j + 1, ml: 1 });
        i = j + 1;
        continue;
      }
    }
    // ссылка [текст](урл)
    if (ch === "[") {
      const m = /^\[([^\]\n]+)\]\(([^)\n]*)\)/.exec(line.slice(i));
      if (m && m[2].length > 0) {
        const ls = i + 1;
        toks.push({ t: "link", s: i, e: i + m[0].length, ml: 0, label: [ls, ls + m[1].length], url: m[2] });
        i += m[0].length;
        continue;
      }
    }
    // голый url
    if ((line.startsWith("http://", i) || line.startsWith("https://", i)) && boundary(i)) {
      const m = /^[^\s<>")\]]+/.exec(line.slice(i));
      if (m) {
        toks.push({ t: "url", s: i, e: i + m[0].length, ml: 0, url: m[0] });
        i += m[0].length;
        continue;
      }
    }
    i += 1;
  }
  return toks;
}

// --- рендер инлайна ---------------------------------------------------------
// opts.hideMarkers — для экспорта: маркеры убираются, textContent уже не равен исходнику.

export function renderInline(
  line: string,
  opts: { hideMarkers?: boolean; linkHrefs?: boolean } = {}
): string {
  const toks = scanInline(line);
  let out = "";
  let pos = 0;
  const n = line.length;
  const hm = !!opts.hideMarkers;
  const marker = (text: string) => (hm ? "" : `<span class="md-m">${escapeHtml(text)}</span>`);
  // маркер курсива зависит от исходника — ищем фактический символ
  const itMarker = (tk: Tok) => (hm ? "" : `<span class="md-m">${escapeHtml(line[tk.s])}</span>`);

  for (const tk of toks) {
    if (tk.s > pos) out += escapeHtml(line.slice(pos, tk.s));
    const content = line.slice(tk.s + tk.ml, tk.e - (tk.ml || 0));
    switch (tk.t) {
      case "code":
        out += `${marker("`")}<code class="md-code">${escapeHtml(content)}</code>${marker("`")}`;
        break;
      case "bold":
        out += `${marker(line.slice(tk.s, tk.s + 2))}<strong class="md-b">${escapeHtml(content)}</strong>${marker(line.slice(tk.e - 2, tk.e))}`;
        break;
      case "italic":
        out += `${itMarker(tk)}<em class="md-i">${escapeHtml(content)}</em>${itMarker(tk)}`;
        break;
      case "strike":
        out += `${marker("~~")}<s class="md-s">${escapeHtml(content)}</s>${marker("~~")}`;
        break;
      case "mark":
        out += `${marker("::")}<mark class="md-hl">${escapeHtml(content)}</mark>${marker("::")}`;
        break;
      case "link": {
        const label = line.slice(tk.label![0], tk.label![1]);
        if (hm && opts.linkHrefs) out += `<a class="md-link" href="${escapeAttr(tk.url!)}">${escapeHtml(label)}</a>`;
        else if (hm) out += escapeHtml(label);
        else
          out += `<span class="md-m">[</span><a class="md-link" data-url="${escapeAttr(tk.url!)}" href="#">${escapeHtml(label)}</a><span class="md-m">](${escapeHtml(tk.url!)})</span>`;
        break;
      }
      case "tag": {
        const whole = line.slice(tk.s, tk.e);
        const isMulti = whole.endsWith("#") && whole.length > 1;
        const inner = isMulti ? whole.slice(0, -1) : whole;
        if (hm) out += escapeHtml(inner.slice(1));
        else
          out += `<a class="md-tag" data-tag="${escapeAttr(whole)}" href="#">${escapeHtml(inner)}</a>${isMulti ? marker("#") : ""}`;
        break;
      }
      case "url": {
        if (hm && opts.linkHrefs) out += `<a class="md-link" href="${escapeAttr(tk.url!)}">${escapeHtml(line.slice(tk.s, tk.e))}</a>`;
        else if (hm) out += escapeHtml(line.slice(tk.s, tk.e));
        else out += `<a class="md-link" data-url="${escapeAttr(tk.url!)}" href="#">${escapeHtml(line.slice(tk.s, tk.e))}</a>`;
        break;
      }
    }
    pos = tk.e;
  }
  if (pos < n) out += escapeHtml(line.slice(pos));
  return out;
}

// стриппинг маркеров до чистого текста (заголовки, превью, .txt)
export function stripLine(line: string): string {
  const toks = scanInline(line);
  let out = "";
  let pos = 0;
  for (const tk of toks) {
    out += line.slice(pos, tk.s);
    if (tk.t === "link" && tk.label) out += line.slice(tk.label[0], tk.label[1]);
    else if (tk.t === "tag") {
      const whole = line.slice(tk.s, tk.e);
      out += whole.endsWith("#") && whole.length > 1 ? whole.slice(1, -1) : whole.slice(1);
    } else out += line.slice(tk.s + tk.ml, tk.e - (tk.ml || 0));
    pos = tk.e;
  }
  out += line.slice(pos);
  return out;
}

// --- классификация строк ---------------------------------------------------

export interface LineCls {
  type: LineType;
  level: number;
  rest: string;
  check?: boolean;
  lang?: string;
}

export function classifyLine(raw: string): LineCls {
  const line = raw.replace(/\t/g, "    ");
  let m: RegExpExecArray | null;

  m = /^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/.exec(line);
  if (m) return { type: "hr", level: 0, rest: "" };

  m = /^\s{0,3}```\s*([\w+#.-]*)\s*$/.exec(line);
  if (m) return { type: "fence", level: 0, rest: "", lang: m[1] || "" };

  m = /^\s{0,3}(#{1,6})\s+(.*)$/.exec(line);
  if (m) return { type: ("h" + m[1].length) as LineType, level: m[1].length, rest: m[2] };

  m = /^\s{0,3}>\s?(.*)$/.exec(line);
  if (m) return { type: "quote", level: 0, rest: m[1] };

  m = /^\s{0,3}[-*+]\s+\[( |x|X)\]\s*(.*)$/.exec(line);
  if (m) return { type: "todo", level: 0, rest: m[2], check: m[1] !== " " };

  m = /^\s{0,3}(\d{1,9})[.)]\s+(.*)$/.exec(line);
  if (m) return { type: "ol", level: parseInt(m[1], 10), rest: m[2] };

  m = /^\s{0,3}[-*+]\s+(.*)$/.exec(line);
  if (m) return { type: "ul", level: 0, rest: m[1] };

  return { type: "text", level: 0, rest: line };
}

// --- построчный рендер (инвариант: textContent(html) === raw) --------------

export interface RenderedLine {
  html: string;
  type: LineType;
  fenceOpen: boolean;
}

export function renderLine(raw: string, fenceOpen: boolean): RenderedLine {
  const cls = classifyLine(raw);
  if (fenceOpen && cls.type !== "fence") {
    return { html: `<span class="md-codeline">${escapeHtml(raw)}</span>`, type: "code", fenceOpen };
  }
  switch (cls.type) {
    case "fence":
      return { html: `<span class="md-m md-fence">${escapeHtml(raw)}</span>`, type: "fence", fenceOpen: !fenceOpen };
    case "hr":
      return { html: `<span class="md-m md-hr-chars">${escapeHtml(raw)}</span>`, type: "hr", fenceOpen };
    case "quote":
      return { html: `<span class="md-m">${escapeHtml(raw.slice(0, raw.length - cls.rest.length))}</span>${renderInline(cls.rest)}`, type: "quote", fenceOpen };
    case "todo": {
      const pfxLen = raw.length - cls.rest.length;
      const pfx = raw.slice(0, pfxLen); // например "- [x] "
      const box = cls.check ? "[x]" : "[ ]";
      const boxIdx = pfx.indexOf(box);
      return {
        html:
          `<span class="md-m">${escapeHtml(pfx.slice(0, Math.max(0, boxIdx)))}</span>` +
          `<span class="md-todo${cls.check ? " done" : ""}" data-todo="1">${box}</span>` +
          escapeHtml(pfx.slice(boxIdx + box.length)) +
          renderInline(cls.rest),
        type: "todo",
        fenceOpen,
      };
    }
    case "ul": {
      const pfxLen = raw.length - cls.rest.length;
      return { html: `<span class="md-m md-bullet">${escapeHtml(raw.slice(0, pfxLen))}</span>${renderInline(cls.rest)}`, type: "ul", fenceOpen };
    }
    case "ol": {
      const pfxLen = raw.length - cls.rest.length;
      return { html: `<span class="md-m md-bullet">${escapeHtml(raw.slice(0, pfxLen))}</span>${renderInline(cls.rest)}`, type: "ol", fenceOpen };
    }
    case "h1": case "h2": case "h3": case "h4": case "h5": case "h6": {
      const pfxLen = raw.length - cls.rest.length;
      return { html: `<span class="md-m">${escapeHtml(raw.slice(0, pfxLen))}</span>${renderInline(cls.rest)}`, type: cls.type, fenceOpen };
    }
    default:
      return { html: renderInline(raw), type: "text", fenceOpen };
  }
}

// --- инкрементальный рендерер документа -------------------------------------

export class DocRenderer {
  private cache: { src: string; open: boolean; html: string }[] = [];

  render(lines: string[]): { htmls: string[]; changed: boolean[]; types: LineType[] } {
    const changed: boolean[] = [];
    const htmls: string[] = [];
    const types: LineType[] = [];
    let open = false;
    for (let i = 0; i < lines.length; i++) {
      const r = renderLine(lines[i], open);
      open = r.fenceOpen;
      htmls.push(r.html);
      types.push(r.type);
      const prev = this.cache[i];
      const isChanged = !prev || prev.src !== lines[i] || prev.open !== open || prev.html !== r.html;
      changed.push(isChanged);
      if (isChanged) this.cache[i] = { src: lines[i], open, html: r.html };
    }
    if (this.cache.length > lines.length) this.cache.length = lines.length;
    return { htmls, changed, types };
  }

  invalidate() {
    this.cache = [];
  }
}

// --- статистика и оглавление -----------------------------------------------

export interface Stats {
  words: number;
  chars: number;
  charsNoSpaces: number;
  paragraphs: number;
  readMin: number;
  todos: { done: number; total: number };
}

export function computeStats(text: string): Stats {
  const trimmed = text.trim();
  // слова считаем по тексту без синтаксических маркеров
  let fence = false;
  const strippedLines: string[] = [];
  const lines = text.split("\n");
  let paragraphs = 0;
  let done = 0;
  let total = 0;
  for (const raw of lines) {
    const cls = classifyLine(raw);
    if (cls.type === "fence") { fence = !fence; continue; }
    if (fence) { strippedLines.push(raw); continue; }
    if (cls.type === "hr") continue;
    if (cls.type === "todo") { total += 1; if (cls.check) done += 1; }
    if (raw.trim()) paragraphs += 1;
    strippedLines.push(cls.type === "fence" ? raw : stripLine(cls.rest));
  }
  const words = strippedLines.join(" ").trim().split(/\s+/).filter(Boolean).length;
  return {
    words,
    chars: text.length,
    charsNoSpaces: text.replace(/\s/g, "").length,
    paragraphs,
    readMin: words === 0 ? 0 : Math.max(1, Math.round(words / 160)),
    todos: { done, total },
  };
}

export interface TocItem {
  level: number;
  text: string;
  line: number;
}

export function buildToc(text: string): TocItem[] {
  const items: TocItem[] = [];
  text.split("\n").forEach((raw, i) => {
    const cls = classifyLine(raw);
    if (/^h[1-6]$/.test(cls.type)) {
      items.push({ level: cls.level, text: stripLine(cls.rest) || "(без названия)", line: i });
    }
  });
  return items;
}

// --- координаты каретки -----------------------------------------------------

export function offsetToPos(lines: string[], offset: number): { line: number; col: number } {
  let acc = 0;
  for (let i = 0; i < lines.length; i++) {
    const len = lines[i].length;
    if (offset <= acc + len) return { line: i, col: offset - acc };
    acc += len + 1; // +1 за перевод строки
  }
  const last = lines.length - 1;
  return { line: Math.max(0, last), col: lines[last]?.length ?? 0 };
}

export function posToOffset(lines: string[], line: number, col: number): number {
  let acc = 0;
  for (let i = 0; i < Math.min(line, Math.max(0, lines.length - 1)); i++) acc += lines[i].length + 1;
  return acc + Math.min(col, lines[line]?.length ?? 0);
}

// --- экспорт ---------------------------------------------------------------

export function noteToTxt(text: string): string {
  return text
    .split("\n")
    .map((l) => (classifyLine(l).type === "code" ? l : stripLine(l)))
    .join("\n");
}

export function noteToHtmlDoc(text: string, title: string): string {
  const lines = text.split("\n");
  const body: string[] = [];
  let fence = false;
  let fenceBuf: string[] = [];
  let listMode: "ul" | "ol" | null = null;
  let quoteBuf: string[] = [];

  const closeList = () => {
    if (listMode) { body.push(`</${listMode}>`); listMode = null; }
  };
  const closeQuote = () => {
    if (quoteBuf.length) {
      body.push(`<blockquote>${quoteBuf.map((q) => `<p>${q}</p>`).join("")}</blockquote>`);
      quoteBuf = [];
    }
  };

  for (const raw of lines) {
    const cls = classifyLine(raw);
    if (cls.type === "fence") {
      if (fence) {
        body.push(`<pre><code>${escapeHtml(fenceBuf.join("\n"))}</code></pre>`);
        fenceBuf = [];
        fence = false;
      } else { closeList(); closeQuote(); fence = true; }
      continue;
    }
    if (fence) { fenceBuf.push(raw); continue; }

    const inline = renderInline(cls.rest, { hideMarkers: true, linkHrefs: true });
    switch (cls.type) {
      case "h1": case "h2": case "h3": case "h4": case "h5": case "h6":
        closeList(); closeQuote();
        body.push(`<h${cls.level}>${inline}</h${cls.level}>`);
        break;
      case "quote":
        closeList();
        quoteBuf.push(inline);
        break;
      case "todo":
        closeQuote();
        if (listMode !== "ul") { closeList(); body.push('<ul class="todos">'); listMode = "ul"; }
        body.push(`<li class="todo ${cls.check ? "done" : ""}">${inline}</li>`);
        break;
      case "ul":
        closeQuote();
        if (listMode !== "ul") { closeList(); body.push("<ul>"); listMode = "ul"; }
        body.push(`<li>${inline}</li>`);
        break;
      case "ol":
        closeQuote();
        if (listMode !== "ol") { closeList(); body.push("<ol>"); listMode = "ol"; }
        body.push(`<li>${inline}</li>`);
        break;
      case "hr":
        closeList(); closeQuote();
        body.push("<hr>");
        break;
      case "code":
        body.push(`<pre><code>${escapeHtml(raw)}</code></pre>`);
        break;
      default:
        closeList(); closeQuote();
        if (raw.trim()) body.push(`<p>${renderInline(raw, { hideMarkers: true, linkHrefs: true })}</p>`);
        break;
    }
  }
  closeList(); closeQuote();
  if (fenceBuf.length) body.push(`<pre><code>${escapeHtml(fenceBuf.join("\n"))}</code></pre>`);

  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title || "Заметка")} — Берлога</title>
<style>
  body { font: 16px/1.7 Georgia, 'Times New Roman', serif; color: #2b2620; background: #fffdf6;
         max-width: 44rem; margin: 0 auto; padding: 3rem 1.5rem; }
  h1,h2,h3,h4,h5,h6 { line-height: 1.25; letter-spacing: -0.01em; }
  blockquote { border-left: 3px solid #c8781b; margin: 1.2em 0; padding: .2em 0 .2em 1.2em; color: #6b5c44; font-style: italic; }
  code { font-family: ui-monospace, 'JetBrains Mono', monospace; font-size: .9em; background: #f4ecd8; padding: .15em .4em; border-radius: 4px; }
  pre { background: #f7f0dc; padding: 1rem 1.2rem; border-radius: 10px; overflow-x: auto; }
  pre code { background: none; padding: 0; }
  mark { background: #ffe9a8; padding: .05em .25em; border-radius: 3px; }
  a { color: #a56d1b; }
  hr { border: none; border-top: 1px solid #e6d8b8; margin: 2em 0; }
  ul.todos { list-style: none; padding-left: .5em; }
  li.todo::before { content: '◻ '; color: #c8781b; }
  li.todo.done::before { content: '◼ '; }
  li.todo.done { color: #a3947a; text-decoration: line-through; }
  .md-tag { color: #a56d1b; background: #f6ecd4; padding: .1em .4em; border-radius: 20px; font-size: .9em; }
</style></head><body>
${body.join("\n")}
<footer style="margin-top:3rem;color:#a3947a;font-size:.85em">Экспортировано из Берлоги — офлайн-заметок</footer>
</body></html>`;
}
