// Берлога — извлечение и дерево тегов.

import { scanInline } from "./markdown";
import type { Note } from "./store";

export interface TagNode {
  name: string; // сегмент пути
  path: string; // полный путь без #
  count: number; // прямых заметок
  children: TagNode[];
}

export function extractTags(text: string): string[] {
  const out = new Set<string>();
  let fence = false;
  for (const raw of text.split("\n")) {
    if (/^\s{0,3}```/.test(raw)) { fence = !fence; continue; }
    if (fence) continue;
    for (const tk of scanInline(raw)) {
      if (tk.t !== "tag") continue;
      const whole = raw.slice(tk.s, tk.e);
      const body = whole.endsWith("#") && whole.length > 1 ? whole.slice(1, -1) : whole.slice(1);
      out.add(body);
    }
  }
  return [...out];
}

export function allTags(notes: Note[]): TagNode {
  const root: TagNode = { name: "", path: "", count: 0, children: [] };
  const ensure = (path: string): TagNode => {
    if (!path) return root;
    const parts = path.split("/");
    let node = root;
    let acc = "";
    for (const part of parts) {
      acc = acc ? `${acc}/${part}` : part;
      let next = node.children.find((c) => c.name === part);
      if (!next) {
        next = { name: part, path: acc, count: 0, children: [] };
        node.children.push(next);
      }
      node = next;
    }
    return node;
  };

  for (const n of notes) {
    if (n.trashed || n.archived) continue;
    const seen = new Set<string>();
    for (const t of extractTags(n.text)) {
      const lower = t.toLowerCase();
      if (seen.has(lower)) continue;
      seen.add(lower);
      ensure(t).count += 1;
    }
  }

  const sortTree = (node: TagNode) => {
    node.children.sort((a, b) => a.name.localeCompare(b.name, "ru"));
    node.children.forEach(sortTree);
  };
  sortTree(root);
  return root;
}

// все теги заметки с путями предков (для чипов в инфо-панели)
export function noteTagPaths(note: Note): string[] {
  return extractTags(note.text);
}

export function countNotesWithTag(notes: Note[], tagPath: string): number {
  const lower = tagPath.toLowerCase();
  return notes.filter(
    (n) => !n.trashed && !n.archived && n.text.toLowerCase().includes(`#${lower}`)
  ).length;
}
