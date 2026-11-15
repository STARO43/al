"use client";

// Берлога — редактор заметок на contenteditable.
// DOM-структура: <div class="line"> на каждую строку исходника.
// Инвариант markdown-движка (textContent === исходник) позволяет
// считать каретку по абсолютным смещениям и не терять её при перерендере.

import React, { useEffect, useRef, useCallback, useState } from "react";
import {
  Star, Archive, ArchiveRestore, Trash2, Undo2, Redo2, Download, FileText, FileCode2, Copy, PanelRightClose, PanelRightOpen,
} from "lucide-react";
import { toast } from "sonner";
import { useBerloga, type Note } from "@/lib/berloga/store";
import { DocRenderer, noteToTxt, noteToHtmlDoc, type LineType } from "@/lib/berloga/markdown";
import { exportFile } from "@/lib/berloga/exporter";

const TYPE_CLASS: Record<LineType, string> = {
  h1: "md-h1", h2: "md-h2", h3: "md-h3", h4: "md-h4", h5: "md-h5", h6: "md-h6",
  quote: "md-quote", todo: "md-todoline", ul: "md-li", ol: "md-li",
  hr: "md-hrline", fence: "md-codewrap", code: "md-codewrap", text: "",
};

interface CaretPos { bi: number; off: number }

function normalizeBlocks(editor: HTMLElement): HTMLElement[] {
  // инвариант «строка = div.line»
  Array.from(editor.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const div = document.createElement("div");
      div.className = "line";
      editor.insertBefore(div, node);
      div.appendChild(node);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.tagName !== "DIV") {
        const div = document.createElement("div");
        div.className = "line";
        while (el.firstChild) div.appendChild(el.firstChild);
        editor.replaceChild(div, el);
      }
    }
  });
  const blocks = Array.from(editor.children) as HTMLElement[];
  blocks.forEach((b) => {
    if (!b.classList.contains("line")) b.className = "line";
    if (b.childNodes.length === 0) b.appendChild(document.createElement("br"));
  });
  return blocks;
}

function getCaretPos(editor: HTMLElement, blocks: HTMLElement[]): CaretPos | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  let el: HTMLElement | null =
    range.startContainer.nodeType === Node.TEXT_NODE
      ? range.startContainer.parentElement
      : (range.startContainer as HTMLElement);
  while (el && el.parentElement && el.parentElement !== editor) el = el.parentElement;
  if (!el || el === editor) {
    const idx = range.startOffset >= blocks.length ? blocks.length - 1 : range.startOffset;
    return { bi: Math.max(0, idx), off: 0 };
  }
  const bi = blocks.indexOf(el);
  if (bi < 0) return null;
  const pre = document.createRange();
  pre.selectNodeContents(el);
  try { pre.setEnd(range.startContainer, range.startOffset); } catch { /* noop */ }
  return { bi, off: pre.toString().length };
}

function setCaretPos(blocks: HTMLElement[], pos: CaretPos) {
  const bi = Math.min(pos.bi, blocks.length - 1);
  const block = blocks[bi];
  if (!block) return;
  const sel = window.getSelection();
  const range = document.createRange();
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let remaining = pos.off;
  let node: Text | null = null;
  let last: Text | null = null;
  let found = false;
  while (walker.nextNode()) {
    const t = walker.currentNode as Text;
    if (remaining <= t.data.length) { node = t; found = true; break; }
    remaining -= t.data.length;
    last = t;
  }
  if (found && node) range.setStart(node, remaining);
  else if (last) range.setStart(last, last.data.length);
  else range.setStart(block, 0);
  range.collapse(true);
  sel?.removeAllRanges();
  sel?.addRange(range);
}

function getSelAbs(editor: HTMLElement): { a: number; f: number } | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  const pre = range.cloneRange();
  pre.selectNodeContents(editor);
  pre.setEnd(range.startContainer, range.startOffset);
  const a = pre.toString().length;
  const pre2 = range.cloneRange();
  pre2.selectNodeContents(editor);
  pre2.setEnd(range.endContainer, range.endOffset);
  return { a, f: pre2.toString().length };
}

function absToPos(lines: string[], abs: number): CaretPos {
  let acc = 0;
  for (let i = 0; i < lines.length; i++) {
    if (abs <= acc + lines[i].length) return { bi: i, off: abs - acc };
    acc += lines[i].length + 1;
  }
  const last = Math.max(0, lines.length - 1);
  return { bi: last, off: lines[last]?.length ?? 0 };
}

const UL_PREFIX = /^\s{0,3}([-*+])\s+(.*)$/;
const TODO_PREFIX = /^\s{0,3}([-*+])\s+\[( |x|X)\]\s*(.*)$/;
const OL_PREFIX = /^\s{0,3}(\d{1,9})([.)])\s+(.*)$/;

export default function Editor({ note }: { note: Note | null }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<DocRenderer>(new DocRenderer());
  const linesRef = useRef<string[]>([""]);
  const noteIdRef = useRef<string | null>(null);
  const undoRef = useRef<string[]>([]);
  const redoRef = useRef<string[]>([]);
  const lastPushRef = useRef(0);
  const composingRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [historyTick, setHistoryTick] = useState({ u: 0, r: 0 });

  const updateNote = useBerloga((s) => s.updateNote);
  const togglePin = useBerloga((s) => s.togglePin);
  const toggleArchive = useBerloga((s) => s.toggleArchive);
  const trashNote = useBerloga((s) => s.trashNote);
  const restoreNote = useBerloga((s) => s.restoreNote);
  const purgeNote = useBerloga((s) => s.purgeNote);
  const settings = useBerloga((s) => s.settings);
  const setSettings = useBerloga((s) => s.setSettings);

  const bumpHistory = useCallback(
    () => setHistoryTick({ u: undoRef.current.length, r: redoRef.current.length }),
    []
  );

  // --- сохранение ---------------------------------------------------------
  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const id = noteIdRef.current;
      if (id) updateNote(id, linesRef.current.join("\n"));
    }, 220);
  }, [updateNote]);

  const flushSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const id = noteIdRef.current;
    if (id) updateNote(id, linesRef.current.join("\n"));
  }, [updateNote]);

  useEffect(() => {
    const onUnload = () => flushSave();
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      flushSave();
    };
  }, [flushSave]);

  // --- рендер -------------------------------------------------------------
  const renderAll = useCallback((reveal: boolean) => {
    const editor = editorRef.current;
    if (!editor) return;
    const lines = linesRef.current;
    const { htmls, types } = rendererRef.current.render(lines);
    editor.innerHTML = "";
    const frag = document.createDocumentFragment();
    for (let i = 0; i < lines.length; i++) {
      const div = document.createElement("div");
      div.className = ("line " + TYPE_CLASS[types[i]]).trim();
      div.innerHTML = htmls[i];
      if (reveal) {
        div.classList.add("line-in");
        div.style.setProperty("--i", String(Math.min(i, 14)));
      }
      frag.appendChild(div);
    }
    editor.appendChild(frag);
  }, []);

  const applyLines = useCallback((newLines: string[], caret?: CaretPos) => {
    linesRef.current = newLines;
    renderAll(false);
    const editor = editorRef.current;
    if (editor && caret) {
      const blocks = normalizeBlocks(editor);
      setCaretPos(blocks, caret);
    }
    scheduleSave();
  }, [renderAll, scheduleSave]);

  const pushUndo = useCallback(() => {
    undoRef.current.push(linesRef.current.join("\n"));
    if (undoRef.current.length > 140) undoRef.current.shift();
    redoRef.current = [];
    lastPushRef.current = Date.now();
    bumpHistory();
  }, [bumpHistory]);

  const undo = useCallback(() => {
    const prev = undoRef.current.pop();
    if (prev === undefined) return;
    redoRef.current.push(linesRef.current.join("\n"));
    const editor = editorRef.current;
    const pos = editor ? getSelAbs(editor) : null;
    applyLines(prev.split("\n"), pos ? absToPos(prev.split("\n"), Math.min(pos.a, pos.f)) : undefined);
    bumpHistory();
  }, [applyLines, bumpHistory]);

  const redo = useCallback(() => {
    const next = redoRef.current.pop();
    if (next === undefined) return;
    undoRef.current.push(linesRef.current.join("\n"));
    const pos = editorRef.current ? getSelAbs(editorRef.current) : null;
    applyLines(next.split("\n"), pos ? absToPos(next.split("\n"), Math.min(pos.a, pos.f)) : undefined);
    bumpHistory();
  }, [applyLines, bumpHistory]);

  // --- синхронизация после ввода -------------------------------------------
  const sync = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const blocks = normalizeBlocks(editor);
    const pos = getCaretPos(editor, blocks);
    const selAbs = getSelAbs(editor);
    const newLines = blocks.map((b) => (b.textContent ?? "").replace(/\u200B/g, ""));

    linesRef.current = newLines;
    const { htmls, changed, types } = rendererRef.current.render(newLines);
    for (let i = 0; i < blocks.length && i < htmls.length; i++) {
      if (changed[i]) blocks[i].innerHTML = htmls[i];
      blocks[i].className = ("line " + TYPE_CLASS[types[i]]).trim();
    }
    if (selAbs && selAbs.a !== selAbs.f) {
      const sel = window.getSelection();
      if (sel) {
        const restore = (abs: number): { node: Node | null; off: number } => {
          const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
          let remaining = abs;
          let node: Node | null = null;
          let last: Node | null = null;
          while (walker.nextNode()) {
            const t = walker.currentNode;
            const len = t.textContent?.length ?? 0;
            if (remaining <= len) { node = t; break; }
            remaining -= len;
            last = t;
          }
          return { node: node ?? last, off: node ? remaining : last?.textContent?.length ?? 0 };
        };
        const ra = restore(Math.min(selAbs.a, selAbs.f));
        const rf = restore(Math.max(selAbs.a, selAbs.f));
        if (ra.node && rf.node) {
          const range = document.createRange();
          range.setStart(ra.node, ra.off);
          range.setEnd(rf.node, rf.off);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    } else if (pos) {
      setCaretPos(blocks, pos);
    }
    scheduleSave();
  }, [scheduleSave]);

  // --- смена заметки -------------------------------------------------------
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    flushSave();
    noteIdRef.current = note?.id ?? null;
    undoRef.current = [];
    redoRef.current = [];
    rendererRef.current.invalidate();
    linesRef.current = (note?.text ?? "").split("\n");
    renderAll(!!note);
    const blocks = normalizeBlocks(editor);
    setCaretPos(blocks, { bi: 0, off: 0 });
    const t = setTimeout(() => {
      editor.querySelectorAll(".line-in").forEach((el) => {
        el.classList.remove("line-in");
        el.style.removeProperty("--i");
      });
    }, 950);
    return () => clearTimeout(t);
  }, [note?.id]);

  // нативный beforeinput: надёжный inputType + перехват нативных undo/redo
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const onNativeBeforeInput = (ev: Event) => {
      const e = ev as InputEvent;
      const type = e.inputType ?? "";
      if (type === "historyUndo") { e.preventDefault(); undo(); return; }
      if (type === "historyRedo") { e.preventDefault(); redo(); return; }
      const now = Date.now();
      if (type === "insertText" || type === "deleteContentBackward" || type === "deleteContentForward") {
        if (now - lastPushRef.current > 650) pushUndo();
      } else if (type.startsWith("insert") || type.startsWith("delete")) {
        pushUndo();
      }
    };
    editor.addEventListener("beforeinput", onNativeBeforeInput);
    return () => editor.removeEventListener("beforeinput", onNativeBeforeInput);
  }, [note?.id, undo, redo, pushUndo]);

  // переход к строке из оглавления
  useEffect(() => {
    const onGoto = (ev: Event) => {
      const line = (ev as CustomEvent<number>).detail;
      const editor = editorRef.current;
      if (!editor) return;
      const target = editor.children[Math.min(line, editor.children.length - 1)] as HTMLElement | undefined;
      const scroller = editor.closest(".editor-scroll");
      if (target && scroller) {
        const top = target.offsetTop - 80;
        scroller.scrollTo({ top, behavior: "smooth" });
        target.classList.add("line-flash");
        setTimeout(() => target.classList.remove("line-flash"), 1200);
      }
    };
    window.addEventListener("bl-goto-line", onGoto);
    return () => window.removeEventListener("bl-goto-line", onGoto);
  }, []);

  // --- ввод ----------------------------------------------------------------
  const insertText = useCallback((text: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    const blocks = normalizeBlocks(editor);
    const pos = getCaretPos(editor, blocks);
    if (!pos) return;
    const lines = linesRef.current;
    const line = lines[pos.bi] ?? "";
    const left = line.slice(0, pos.off);
    const right = line.slice(pos.off);
    const parts = text.split("\n");
    const newLines = [...lines];
    const insertion = [left + parts[0], ...parts.slice(1, -1), parts[parts.length - 1] + right];
    newLines.splice(pos.bi, 1, ...insertion);
    const endBi = pos.bi + insertion.length - 1;
    const endOff = (insertion.length > 1 ? insertion[insertion.length - 1] : left + parts[0]).length - right.length;
    applyLines(newLines, { bi: endBi, off: Math.max(0, endOff) });
  }, [applyLines]);

  const wrapSelection = useCallback((mkr: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    const sel = getSelAbs(editor);
    const lines = linesRef.current;
    if (!sel) return;
    pushUndo();
    if (sel.a === sel.f) {
      const pos = absToPos(lines, sel.a);
      const line = lines[pos.bi] ?? "";
      const nl = line.slice(0, pos.off) + mkr + mkr + line.slice(pos.off);
      const newLines = [...lines];
      newLines.splice(pos.bi, 1, nl);
      applyLines(newLines, { bi: pos.bi, off: pos.off + mkr.length });
      return;
    }
    const start = Math.min(sel.a, sel.f);
    const end = Math.max(sel.a, sel.f);
    const sp = absToPos(lines, start);
    const ep = absToPos(lines, end);
    const sLine = lines[sp.bi] ?? "";
    if (sLine.slice(sp.off - mkr.length, sp.off) === mkr && sLine.slice(ep.off, ep.off + mkr.length) === mkr) {
      const nl = sLine.slice(0, sp.off - mkr.length) + sLine.slice(sp.off, ep.off) + sLine.slice(ep.off + mkr.length);
      const newLines = [...lines];
      newLines.splice(sp.bi, 1, nl);
      applyLines(newLines, { bi: sp.bi, off: sp.off - mkr.length });
      return;
    }
    if (sp.bi === ep.bi) {
      const nl = sLine.slice(0, sp.off) + mkr + sLine.slice(sp.off, ep.off) + mkr + sLine.slice(ep.off);
      const newLines = [...lines];
      newLines.splice(sp.bi, 1, nl);
      applyLines(newLines, { bi: sp.bi, off: ep.off + mkr.length * 2 });
    } else {
      const flat = lines.slice(sp.bi, ep.bi + 1).join("\n");
      const wrapped = flat.slice(0, sp.off) + mkr + flat.slice(sp.off, ep.off) + mkr + flat.slice(ep.off);
      const newLines = [...lines];
      newLines.splice(sp.bi, ep.bi - sp.bi + 1, ...wrapped.split("\n"));
      applyLines(newLines, { bi: ep.bi, off: ep.off + mkr.length * 2 });
    }
  }, [applyLines, pushUndo]);

  const onInput = useCallback(() => {
    if (composingRef.current) return;
    sync();
  }, [sync]);

  const setComposing = useCallback((start: boolean) => {
    composingRef.current = start;
    if (!start) setTimeout(() => sync(), 0);
  }, [sync]);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const editor = editorRef.current;
    if (!editor) return;
    const mod = e.metaKey || e.ctrlKey;

    if (mod && !e.shiftKey && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); return; }
    if (mod && ((e.shiftKey && e.key.toLowerCase() === "z") || e.key.toLowerCase() === "y")) { e.preventDefault(); redo(); return; }
    if (mod && e.key.toLowerCase() === "b") { e.preventDefault(); wrapSelection("**"); return; }
    if (mod && e.key.toLowerCase() === "i") { e.preventDefault(); wrapSelection("*"); return; }
    if (mod && e.key.toLowerCase() === "u") {
      e.preventDefault();
      toast("Подчёркивание не поддерживается — используйте **жирный** или *курсив*");
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      pushUndo();
      insertText("    ");
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      const blocks = normalizeBlocks(editor);
      const pos = getCaretPos(editor, blocks);
      if (!pos) return;
      e.preventDefault();
      pushUndo();
      const lines = linesRef.current;
      const line = lines[pos.bi] ?? "";
      const left = line.slice(0, pos.off);
      const right = line.slice(pos.off);

      // умные списки: пункт пуст — выходим из списка, иначе создаём новый маркер
      let prefix = "";
      const tm = TODO_PREFIX.exec(left);
      const um = UL_PREFIX.exec(left);
      const om = OL_PREFIX.exec(left);
      if (tm) prefix = tm[3].trim() ? `${tm[1]} [ ] ` : "";
      else if (um) prefix = um[2].trim() ? `${um[1]} ` : "";
      else if (om) prefix = om[3].trim() ? `${parseInt(om[1], 10) + 1}${om[2]} ` : "";

      const newLines = [...lines];
      newLines.splice(pos.bi, 1, left, prefix + right);
      applyLines(newLines, { bi: pos.bi + 1, off: prefix.length });
      return;
    }
    if (e.key === "Backspace") {
      const sel = window.getSelection();
      const collapsed = !!sel && sel.rangeCount > 0 && sel.getRangeAt(0).collapsed;
      const blocks = normalizeBlocks(editor);
      const pos = collapsed ? getCaretPos(editor, blocks) : null;
      if (pos && pos.off === 0 && pos.bi > 0) {
        e.preventDefault();
        pushUndo();
        const lines = linesRef.current;
        const merged = lines[pos.bi - 1] + lines[pos.bi];
        const newLines = [...lines];
        newLines.splice(pos.bi - 1, 2, merged);
        applyLines(newLines, { bi: pos.bi - 1, off: lines[pos.bi - 1].length });
      }
      return;
    }
    if (e.key === "Delete") {
      const sel = window.getSelection();
      const collapsed = !!sel && sel.rangeCount > 0 && sel.getRangeAt(0).collapsed;
      const blocks = normalizeBlocks(editor);
      const pos = collapsed ? getCaretPos(editor, blocks) : null;
      if (pos && pos.bi < linesRef.current.length - 1 && pos.off === (linesRef.current[pos.bi]?.length ?? 0)) {
        e.preventDefault();
        pushUndo();
        const lines = linesRef.current;
        const merged = lines[pos.bi] + lines[pos.bi + 1];
        const newLines = [...lines];
        newLines.splice(pos.bi, 2, merged);
        applyLines(newLines, { bi: pos.bi, off: pos.off });
      }
    }
  }, [undo, redo, insertText, applyLines, pushUndo, wrapSelection]);

  const onPaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    if (!text) return;
    pushUndo();
    insertText(text.replace(/\r\n/g, "\n").replace(/\r/g, "\n"));
  }, [insertText, pushUndo]);

  const onClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement;
    if (t.dataset?.todo) {
      const editor = editorRef.current;
      if (!editor) return;
      const blocks = normalizeBlocks(editor);
      const bi = blocks.indexOf(t.closest(".line") as HTMLElement);
      if (bi < 0) return;
      const lines = linesRef.current;
      const line = lines[bi] ?? "";
      const m = /\[([ xX])\]/.exec(line);
      if (!m || m.index === undefined) return;
      pushUndo();
      const toggled = m[1] === " " ? "[x]" : "[ ]";
      const nl = line.slice(0, m.index) + toggled + line.slice(m.index + 3);
      const newLines = [...lines];
      newLines.splice(bi, 1, nl);
      const pos = getCaretPos(editor, blocks);
      applyLines(newLines, pos ?? undefined);
      return;
    }
    if (t.classList?.contains("md-tag")) {
      e.preventDefault();
      const tag = (t.dataset.tag ?? "").replace(/^#/, "").replace(/#$/, "");
      if (tag) useBerloga.getState().setTagFilter(tag);
      return;
    }
    const link = t.closest?.("a.md-link") as HTMLElement | null;
    if (link) {
      e.preventDefault();
      const url = link.dataset.url;
      if (url) window.open(url, "_blank", "noopener");
    }
  }, [applyLines, pushUndo]);

  // --- экспорт -------------------------------------------------------------
  const doExport = useCallback((kind: "md" | "txt" | "html" | "copy") => {
    if (!note) return;
    const text = linesRef.current.join("\n");
    const title = (note.text.split("\n").find((l) => l.trim()) ?? "Заметка").replace(/^#+\s*/, "").slice(0, 40) || "Заметка";
    if (kind === "md") exportFile(`${title}.md`, text, "text/markdown");
    if (kind === "txt") exportFile(`${title}.txt`, noteToTxt(text), "text/plain");
    if (kind === "html") exportFile(`${title}.html`, noteToHtmlDoc(text, title), "text/html");
    if (kind === "copy") {
      navigator.clipboard?.writeText(text).then(
        () => toast.success("Markdown скопирован в буфер"),
        () => toast.error("Не удалось скопировать")
      );
      return;
    }
    toast.success(`Сохранено: ${title}.${kind}`);
  }, [note]);

  const empty = (note?.text ?? "").trim().length === 0;

  return (
    <section className="editor-pane" aria-label="Редактор заметки">
      {note ? (
        <div className="editor-shell" key={note.id}>
          <div className="note-toolbar" data-tick={historyTick.u}>
            <div className="note-toolbar-group">
              <button
                className={`icon-btn ${note.pinned ? "active" : ""}`}
                onClick={() => togglePin(note.id)}
                title={note.pinned ? "Снять звёздочку" : "Поставить звёздочку"}
                aria-label="В избранное"
              >
                <Star size={16} fill={note.pinned ? "currentColor" : "none"} />
              </button>
              <button
                className="icon-btn"
                onClick={() => undo()}
                disabled={historyTick.u === 0}
                title="Отменить (Cmd+Z)"
                aria-label="Отменить"
              >
                <Undo2 size={16} />
              </button>
              <button
                className="icon-btn"
                onClick={() => redo()}
                disabled={historyTick.r === 0}
                title="Вернуть (Cmd+Shift+Z)"
                aria-label="Вернуть"
              >
                <Redo2 size={16} />
              </button>
            </div>
            <div className="note-toolbar-group">
              <div className="menu-wrap">
                <button className="icon-btn" title="Экспорт" aria-label="Экспорт">
                  <Download size={16} />
                </button>
                <div className="menu" role="menu">
                  <button onClick={() => doExport("copy")} role="menuitem"><Copy size={14} /> Копировать Markdown</button>
                  <button onClick={() => doExport("md")} role="menuitem"><FileText size={14} /> Скачать .md</button>
                  <button onClick={() => doExport("txt")} role="menuitem"><FileText size={14} /> Скачать .txt</button>
                  <button onClick={() => doExport("html")} role="menuitem"><FileCode2 size={14} /> Скачать .html</button>
                </div>
              </div>
              <button
                className="icon-btn"
                onClick={() => setSettings({ infoOpen: !settings.infoOpen })}
                title={settings.infoOpen ? "Скрыть инфо-панель" : "Показать инфо-панель"}
                aria-label="Информация о заметке"
              >
                {settings.infoOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
              </button>
              {note.trashed ? (
                <>
                  <button className="icon-btn" onClick={() => restoreNote(note.id)} title="Восстановить" aria-label="Восстановить">
                    <ArchiveRestore size={16} />
                  </button>
                  <button className="icon-btn danger" onClick={() => purgeNote(note.id)} title="Удалить навсегда" aria-label="Удалить навсегда">
                    <Trash2 size={16} />
                  </button>
                </>
              ) : (
                <>
                  <button className="icon-btn" onClick={() => toggleArchive(note.id)} title={note.archived ? "Вернуть из архива" : "В архив"} aria-label="Архив">
                    {note.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                  </button>
                  <button className="icon-btn danger" onClick={() => trashNote(note.id)} title="В корзину" aria-label="В корзину">
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="editor-scroll">
            <div
              ref={editorRef}
              className={`editor ${empty ? "is-empty" : ""}`}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-multiline="true"
              aria-label="Текст заметки"
              spellCheck={false}
              style={{ fontSize: `${settings.fontSize}px` }}
              onInput={onInput}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              onClick={onClick}
              onCompositionStart={() => setComposing(true)}
              onCompositionEnd={() => setComposing(false)}
              onBlur={flushSave}
              data-gramm="false"
            />
          </div>
        </div>
      ) : (
        <div className="editor-shell editor-nothing">
          <div className="editor-scroll">
            <div className="empty-hint">
              <p className="empty-title">Ничего не выбрано</p>
              <p className="empty-sub">Выберите заметку слева или создайте новую — <kbd>Cmd</kbd>+<kbd>N</kbd></p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
