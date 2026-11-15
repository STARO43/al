"use client";

// Берлога — настройки: темы с живым превью, размер шрифта, эффекты, данные.

import React, { useState } from "react";
import { Check, RotateCcw, Sparkles, Trash2, Download, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useBerloga } from "@/lib/berloga/store";
import { THEMES } from "@/lib/berloga/themes";
import { exportFile } from "@/lib/berloga/exporter";
import { noteTitle } from "@/lib/berloga/store";

const SHORTCUTS: [string, string][] = [
  ["⌘ N", "новая заметка"],
  ["⌘ K", "палитра команд"],
  ["⌘ ,", "настройки"],
  ["⌘ B / ⌘ I", "жирный / курсив"],
  ["⌘ Z / ⇧⌘ Z", "отменить / вернуть"],
  ["esc", "закрыть панель"],
];

export default function SettingsDialog() {
  const open = useBerloga((s) => s.settingsOpen);
  const setOpen = useBerloga((s) => s.setSettingsOpen);
  const settings = useBerloga((s) => s.settings);
  const setSettings = useBerloga((s) => s.setSettings);
  const setIntroOpen = useBerloga((s) => s.setIntroOpen);
  const notes = useBerloga((s) => s.notes);
  const [confirmWipe, setConfirmWipe] = useState(false);

  if (!open) return null;

  const exportAll = () => {
    const md = notes.filter((n) => !n.trashed)
      .map((n) => `# ${noteTitle(n) || "Без названия"}\n\n${n.text}`)
      .join("\n\n---\n\n");
    exportFile("берлога-экспорт.md", md, "text/markdown");
    toast.success("Все заметки выгружены в один .md");
  };

  const wipe = () => {
    localStorage.removeItem("berloga.v1");
    window.removeEventListener("beforeunload", () => {});
    window.location.reload();
  };

  return (
    <div className="palette-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="settings" role="dialog" aria-label="Настройки берлоги">
        <div className="settings-head">
          <h2>Настройки берлоги</h2>
          <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Закрыть">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="settings-body">
          <section className="settings-section">
            <h3>Тема</h3>
            <p className="settings-sub">Переключение сопровождается шейдерным переходом — смотрите внимательно.</p>
            <div className="theme-grid">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  className={`theme-card ${settings.theme === t.id ? "current" : ""}`}
                  style={{
                    background: t.vars["--bl-bg2"],
                    borderColor: settings.theme === t.id ? t.vars["--bl-accent"] : t.vars["--bl-border"],
                  }}
                  onClick={() => {
                    if (t.id !== settings.theme) {
                      window.dispatchEvent(new CustomEvent("bl-set-theme", { detail: t.id }));
                    }
                  }}
                >
                  <span className="theme-card-page" style={{ background: t.vars["--bl-bg"] }}>
                    <span className="theme-line w60" style={{ background: t.vars["--bl-text"] }} />
                    <span className="theme-line w80" style={{ background: t.vars["--bl-dim"] }} />
                    <span className="theme-line w40" style={{ background: t.vars["--bl-accent"] }} />
                    <span className="theme-line w70" style={{ background: t.vars["--bl-mark"] }} />
                  </span>
                  <span className="theme-card-name" style={{ color: t.vars["--bl-text"] }}>
                    {t.name}
                    {settings.theme === t.id ? <Check size={13} style={{ color: t.vars["--bl-accent"] }} /> : null}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="settings-section">
            <h3>Текст</h3>
            <div className="settings-row">
              <span>Размер шрифта редактора</span>
              <div className="font-size-ctl">
                <button className="icon-btn" onClick={() => setSettings({ fontSize: Math.max(13, settings.fontSize - 1) })} aria-label="Меньше">A−</button>
                <span className="font-size-val">{settings.fontSize}</span>
                <button className="icon-btn" onClick={() => setSettings({ fontSize: Math.min(24, settings.fontSize + 1) })} aria-label="Больше">A+</button>
              </div>
            </div>
            <div className="settings-row">
              <span>Шейдерные эффекты</span>
              <button
                className={`switch ${settings.effectsOn ? "on" : ""}`}
                role="switch"
                aria-checked={settings.effectsOn}
                onClick={() => setSettings({ effectsOn: !settings.effectsOn })}
              >
                <span className="knob" />
              </button>
            </div>
            <div className="settings-row">
              <span>Инфо-панель справа</span>
              <button
                className={`switch ${settings.infoOpen ? "on" : ""}`}
                role="switch"
                aria-checked={settings.infoOpen}
                onClick={() => setSettings({ infoOpen: !settings.infoOpen })}
              >
                <span className="knob" />
              </button>
            </div>
          </section>

          <section className="settings-section">
            <h3>Берлога</h3>
            <div className="settings-actions">
              <button className="settings-btn" onClick={() => { setOpen(false); setIntroOpen(true); }}>
                <Sparkles size={14} /> Показать вступление
              </button>
              <button className="settings-btn" onClick={exportAll}>
                <Download size={14} /> Экспортировать всё (.md)
              </button>
              <button className="settings-btn" onClick={() => { setSettings({ introSeen: false }); toast.success("Вступление покажется при следующем визите"); }}>
                <RotateCcw size={14} /> Сбросить «вступление показано»
              </button>
            </div>
          </section>

          <section className="settings-section">
            <h3>Горячие клавиши</h3>
            <div className="shortcuts">
              {SHORTCUTS.map(([k, v]) => (
                <div className="shortcut-row" key={k}>
                  <kbd>{k}</kbd>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="settings-section danger-zone">
            <h3>Опасная зона</h3>
            {confirmWipe ? (
              <div className="wipe-confirm">
                <p>Стереть все заметки без возможности вернуть? Ссылок назад не бывает.</p>
                <div className="settings-actions">
                  <button className="settings-btn" onClick={() => setConfirmWipe(false)}>Отмена</button>
                  <button className="settings-btn danger" onClick={wipe}>
                    <Trash2 size={14} /> Да, стереть всё
                  </button>
                </div>
              </div>
            ) : (
              <button className="settings-btn danger" onClick={() => setConfirmWipe(true)}>
                <Trash2 size={14} /> Стереть все данные
              </button>
            )}
            <p className="settings-privacy"><ShieldCheck size={13} /> Данные лежат в localStorage вашего браузера. Ни один байт не уходит в сеть.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
