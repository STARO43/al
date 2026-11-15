"use client";

// Берлога — панель списка заметок с поиском и группировкой по датам.

import React from "react";
import { Search, Star, ArchiveRestore, Trash2, PenSquare, X } from "lucide-react";
import { useBerloga, visibleNotes, noteTitle, notePreview, type Note } from "@/lib/berloga/store";

function dayStart(ts: number | Date): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function groupLabel(ts: number): string {
  const today = dayStart(Date.now());
  const d = dayStart(ts);
  const diff = Math.floor((today - d) / 86_400_000);
  if (diff <= 0) return "Сегодня";
  if (diff === 1) return "Вчера";
  if (diff <= 6) return "На этой неделе";
  if (diff <= 30) return "В этом месяце";
  return "Давно";
}

function fmtDate(ts: number): string {
  const d = new Date(ts);
  const today = dayStart(Date.now()) === dayStart(ts);
  if (today) return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const GROUP_ORDER = ["Сегодня", "Вчера", "На этой неделе", "В этом месяце", "Давно"];

export default function NoteList() {
  const store = useBerloga();
  const view = store.view;
  const query = store.query;
  const selectedId = store.selectedId;

  const list = visibleNotes(store);

  const groups = (() => {
    if (store.settings.sortMode === "title") {
      return [{ label: "По алфавиту", items: list }];
    }
    const map = new Map<string, Note[]>();
    for (const n of list) {
      const g = n.pinned && view !== "trash" ? "Закреплённые" : groupLabel(view === "trash" || view === "archive" ? n.modified : n.modified);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(n);
    }
    const order = view === "trash" || view === "archive" ? GROUP_ORDER : ["Закреплённые", ...GROUP_ORDER];
    return order.filter((g) => map.has(g)).map((g) => ({ label: g, items: map.get(g)! }));
  })();

  const titles = {
    notes: "Заметки",
    shortcuts: "Избранное",
    archive: "Архив",
    trash: "Корзина",
    tag: `#${store.tagFilter ?? ""}`,
  } as const;

  const totalWords = list.reduce((acc, n) => acc + n.text.split(/\s+/).filter(Boolean).length, 0);

  return (
    <aside className="note-list" aria-label="Список заметок">
      <div className="list-head">
        <div className="list-title-row">
          <h2 className="list-title">{titles[view]}</h2>
          <button className="icon-btn accent" onClick={() => store.createNote()} title="Новая заметка (Cmd+N)" aria-label="Новая заметка">
            <PenSquare size={15} />
          </button>
        </div>
        <div className="search-wrap">
          <Search size={14} className="search-ico" />
          <input
            className="search-input"
            placeholder="Поиск по берлоге…"
            value={query}
            onChange={(e) => store.setQuery(e.target.value)}
            aria-label="Поиск заметок"
          />
          {query && (
            <button className="search-clear" onClick={() => store.setQuery("")} aria-label="Очистить поиск">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="list-scroll">
        {groups.length === 0 && (
          <div className="list-empty">
            {query ? <p>Ничего не нашлось.<br />Попробуйте иначе.</p> : view === "trash" ? <p>Корзина пуста.<br />Чисто и уютно.</p> : <p>Тишина.<br />Создайте первую заметку.</p>}
          </div>
        )}
        {groups.map((g) => (
          <div key={g.label} className="list-group">
            <div className="group-label">{g.label}</div>
            {g.items.map((n) => (
              <button
                key={n.id}
                className={`note-item ${selectedId === n.id ? "selected" : ""}`}
                onClick={() => store.select(n.id)}
              >
                <div className="note-item-top">
                  <span className="note-item-title">{noteTitle(n) || "Без названия"}</span>
                  <span className="note-item-date">{fmtDate(n.modified)}</span>
                </div>
                <span className="note-item-preview">{notePreview(n)}</span>
                <span className="note-item-meta">
                  {n.pinned && view !== "trash" ? <Star size={12} className="pin-star" /> : null}
                  {n.archived && !n.trashed ? <span className="mini-chip">архив</span> : null}
                  <span className="note-item-words">{n.text.split(/\s+/).filter(Boolean).length} слов</span>
                  {view === "trash" && (
                    <span className="trash-actions">
                      <span
                        role="button"
                        tabIndex={0}
                        className="trash-act"
                        onClick={(e) => { e.stopPropagation(); store.restoreNote(n.id); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); store.restoreNote(n.id); } }}
                        title="Восстановить"
                      >
                        <ArchiveRestore size={13} />
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        className="trash-act danger"
                        onClick={(e) => { e.stopPropagation(); store.purgeNote(n.id); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); store.purgeNote(n.id); } }}
                        title="Стереть навсегда"
                      >
                        <Trash2 size={13} />
                      </span>
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="list-foot">
        <span>{list.length} шт.</span>
        <span>≈{totalWords.toLocaleString("ru-RU")} слов</span>
      </div>
    </aside>
  );
}
