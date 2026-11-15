"use client";

// Берлога — палитра команд: быстрый поиск по заметкам + команды.

import React, { useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import { Search, FileText, PenSquare, Palette as PaletteIcon, Archive, Trash2, Sparkles, Info, Download } from "lucide-react";
import { useBerloga, noteTitle, notePreview } from "@/lib/berloga/store";
import { THEMES } from "@/lib/berloga/themes";
import { exportFile } from "@/lib/berloga/exporter";

function score(query: string, target: string): number {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase();
  if (!q) return 1;
  if (t.includes(q)) return 100 - t.indexOf(q);
  // подпоследовательность
  let ti = 0;
  for (const ch of q) {
    ti = t.indexOf(ch, ti);
    if (ti === -1) return 0;
    ti += 1;
  }
  return 30;
}

export default function Palette() {
  const open = useBerloga((s) => s.paletteOpen);
  const setOpen = useBerloga((s) => s.setPaletteOpen);
  const store = useBerloga();
  const [q, setQ] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!open) return;
    // сброс — в асинхронном колбэке (не синхронно в теле эффекта)
    const t = setTimeout(() => { setQ(""); setTick((x) => x + 1); }, 0);
    return () => clearTimeout(t);
  }, [open]);

  const noteResults = useMemo(() => {
    const notes = store.notes.filter((n) => !n.trashed && !n.archived);
    return notes
      .map((n) => ({
        n,
        s: Math.max(
          score(q, noteTitle(n) || "без названия"),
          q ? score(q, n.text) * 0.4 : 0.4
        ),
      }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 6);
  }, [q, store.notes, tick]);

  const run = (fn: () => void) => {
    setOpen(false);
    setTimeout(fn, 80);
  };

  if (!open) return null;

  return (
    <div className="palette-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="palette" role="dialog" aria-label="Палитра команд">
        <Command shouldFilter={false} className="palette-cmd" loop>
          <div className="palette-input-row">
            <Search size={16} className="palette-search-ico" />
            <Command.Input
              className="palette-input"
              placeholder="Найти заметку или команду…"
              value={q}
              onValueChange={setQ}
              autoFocus
            />
            <kbd className="palette-esc">esc</kbd>
          </div>
          <Command.List className="palette-list">
          <Command.Empty className="palette-empty">Пусто, как в берлоге зимой.</Command.Empty>

          <Command.Group heading="Заметки" className="palette-group">
            {noteResults.map(({ n }) => (
              <Command.Item
                key={n.id}
                className="palette-item"
                onSelect={() => run(() => { store.select(n.id); store.setView(n.pinned ? "notes" : "notes"); })}
              >
                <FileText size={15} className="pi-ico" />
                <span className="pi-text">
                  <span className="pi-title">{noteTitle(n) || "Без названия"}</span>
                  <span className="pi-sub">{notePreview(n, 60)}</span>
                </span>
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Group heading="Команды" className="palette-group">
            <Command.Item className="palette-item" onSelect={() => run(() => store.createNote())}>
              <PenSquare size={15} className="pi-ico" /> Новая заметка <kbd className="pi-kbd">⌘N</kbd>
            </Command.Item>
            <Command.Item className="palette-item" onSelect={() => run(() => store.setView("shortcuts"))}>
              <FileText size={15} className="pi-ico" /> Избранные заметки
            </Command.Item>
            <Command.Item className="palette-item" onSelect={() => run(() => store.setView("archive"))}>
              <Archive size={15} className="pi-ico" /> Открыть архив
            </Command.Item>
            <Command.Item className="palette-item" onSelect={() => run(() => store.setView("trash"))}>
              <Trash2 size={15} className="pi-ico" /> Открыть корзину
            </Command.Item>
            <Command.Item className="palette-item" onSelect={() => run(() => store.setSettingsOpen(true))}>
              <PaletteIcon size={15} className="pi-ico" /> Темы и настройки <kbd className="pi-kbd">⌘,</kbd>
            </Command.Item>
            <Command.Item className="palette-item" onSelect={() => run(() => store.setIntroOpen(true))}>
              <Sparkles size={15} className="pi-ico" /> Показать вступление
            </Command.Item>
            <Command.Item className="palette-item" onSelect={() => run(() => store.setSettings({ infoOpen: !store.settings.infoOpen }))}>
              <Info size={15} className="pi-ico" /> {store.settings.infoOpen ? "Скрыть" : "Показать"} инфо-панель
            </Command.Item>
            <Command.Item
              className="palette-item"
              onSelect={() => run(() => {
                const md = store.notes.filter((n) => !n.trashed).map((n) => `# ${noteTitle(n) || "Без названия"}\n\n${n.text}`).join("\n\n---\n\n");
                exportFile("берлога-экспорт.md", md, "text/markdown");
              })}
            >
              <Download size={15} className="pi-ico" /> Экспортировать все заметки (.md)
            </Command.Item>
          </Command.Group>

          <Command.Group heading="Темы" className="palette-group">
            {THEMES.map((t) => (
              <Command.Item
                key={t.id}
                className="palette-item"
                onSelect={() => run(() => window.dispatchEvent(new CustomEvent("bl-set-theme", { detail: t.id })))}
              >
                <span className="pi-swatch" style={{ background: t.vars["--bl-bg"], boxShadow: `inset 0 0 0 1px ${t.vars["--bl-border"]}` }}>
                  <span style={{ width: 8, height: 8, borderRadius: 9, background: t.vars["--bl-accent"] }} />
                </span>
                {t.name}
                {store.settings.theme === t.id ? <span className="pi-kbd">текущая</span> : null}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
        </Command>
        <div className="palette-foot">
          <span>↑↓ — ходить, ↵ — выбрать</span>
          <span>берлога · офлайн</span>
        </div>
      </div>
    </div>
  );
}
