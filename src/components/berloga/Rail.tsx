"use client";

// Берлога — левый рейл с навигацией.

import { PenSquare, FileText, Tags, Star, Archive, Trash2, Palette, Settings, Sparkles } from "lucide-react";
import { useBerloga, type ViewMode } from "@/lib/berloga/store";

const ITEMS: { view: ViewMode; icon: React.ElementType; label: string }[] = [
  { view: "notes", icon: FileText, label: "Заметки" },
  { view: "tags", icon: Tags, label: "Теги" },
  { view: "shortcuts", icon: Star, label: "Избранное" },
  { view: "archive", icon: Archive, label: "Архив" },
  { view: "trash", icon: Trash2, label: "Корзина" },
];

export default function Rail() {
  const view = useBerloga((s) => s.view);
  const setView = useBerloga((s) => s.setView);
  const createNote = useBerloga((s) => s.createNote);
  const setSettingsOpen = useBerloga((s) => s.setSettingsOpen);
  const setIntroOpen = useBerloga((s) => s.setIntroOpen);
  const notes = useBerloga((s) => s.notes);

  const counts: Record<string, number> = {
    notes: notes.filter((n) => !n.trashed && !n.archived).length,
    shortcuts: notes.filter((n) => n.pinned && !n.trashed && !n.archived).length,
    archive: notes.filter((n) => n.archived && !n.trashed).length,
    trash: notes.filter((n) => n.trashed).length,
  };

  const active = view === "tag" ? "tags" : view;

  return (
    <nav className="rail" aria-label="Навигация по берлоге">
      <div className="rail-logo" aria-hidden="true">
        <PawIcon />
      </div>
      <button className="rail-btn new" onClick={() => createNote()} title="Новая заметка (Cmd+N)" aria-label="Новая заметка">
        <PenSquare size={17} />
      </button>
      <div className="rail-sep" />
      {ITEMS.map(({ view: v, icon: Icon, label }) => (
        <button
          key={v}
          className={`rail-btn ${active === v ? "active" : ""}`}
          onClick={() => setView(v)}
          title={label}
          aria-label={label}
          aria-current={active === v ? "page" : undefined}
        >
          <Icon size={17} />
          {v !== "tags" && counts[v] ? <span className="rail-badge">{counts[v]}</span> : null}
        </button>
      ))}
      <div className="rail-flex" />
      <button className="rail-btn" onClick={() => setIntroOpen(true)} title="Показать вступление" aria-label="Вступление">
        <Sparkles size={17} />
      </button>
      <button className="rail-btn" onClick={() => setSettingsOpen(true)} title="Настройки" aria-label="Настройки">
        <Palette size={17} />
      </button>
      <button className="rail-btn" onClick={() => setSettingsOpen(true)} title="О берлоге" aria-label="О берлоге">
        <Settings size={17} />
      </button>
    </nav>
  );
}

function PawIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="7" cy="8.2" rx="1.9" ry="2.5" transform="rotate(-18 7 8.2)" fill="currentColor" stroke="none" />
      <ellipse cx="12" cy="6.4" rx="1.9" ry="2.6" fill="currentColor" stroke="none" />
      <ellipse cx="17" cy="8.2" rx="1.9" ry="2.5" transform="rotate(18 17 8.2)" fill="currentColor" stroke="none" />
      <path d="M12 11.4c2.9 0 5.4 2.1 5.4 4.6 0 2-1.6 3.3-3.4 3.1-1-.1-1.4-.4-2-.4s-1 .3-2 .4c-1.8.2-3.4-1.1-3.4-3.1 0-2.5 2.5-4.6 5.4-4.6z" fill="currentColor" stroke="none" />
    </svg>
  );
}
