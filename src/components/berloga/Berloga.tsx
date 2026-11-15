"use client";

// Берлога — корневой компонент: заставка → приложение, темы с GL-переходами,
// глобальные горячие клавиши.

import React, { useEffect, useRef, useState } from "react";
import { toast, Toaster } from "sonner";
import Rail from "./Rail";
import NoteList from "./NoteList";
import TagsPanel from "./TagsPanel";
import Editor from "./Editor";
import InfoPanel from "./InfoPanel";
import Palette from "./Palette";
import SettingsDialog from "./SettingsDialog";
import Intro from "./Intro";
import { useBerloga } from "@/lib/berloga/store";
import { applyThemeVars, getTheme } from "@/lib/berloga/themes";
import { glTransition } from "@/lib/berloga/gl/transition";
import { randomEffect } from "@/lib/berloga/gl/effects";

export default function Berloga() {
  const glCanvasRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = useState(false);
  const [entering, setEntering] = useState(false);
  const settings = useBerloga((s) => s.settings);
  const introOpen = useBerloga((s) => s.introOpen);
  const setIntroOpen = useBerloga((s) => s.setIntroOpen);
  const view = useBerloga((s) => s.view);
  const selectedId = useBerloga((s) => s.selectedId);
  const notes = useBerloga((s) => s.notes);
  const setSettings = useBerloga((s) => s.setSettings);
  const setPaletteOpen = useBerloga((s) => s.setPaletteOpen);
  const setSettingsOpen = useBerloga((s) => s.setSettingsOpen);
  const createNote = useBerloga((s) => s.createNote);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // гидратация: применяем тему и решаем, показывать ли вступление
  useEffect(() => {
    applyThemeVars(settings.theme);
    if (!settings.introSeen) setIntroOpen(true);
    const t = setTimeout(() => {
      if (window.innerWidth < 860) setSidebarOpen(false);
      setMounted(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // GL-движок переходов
  useEffect(() => {
    if (glCanvasRef.current) glTransition.attach(glCanvasRef.current);
    return () => glTransition.detach();
  }, []);

  // смена темы (из настроек, палитры, кликов по тегам)
  const switchTheme = (id: string) => {
    if (id === settings.theme) return;
    const from = getTheme(settings.theme).gl;
    const to = getTheme(id).gl;
    const effects = settings.effectsOn;
    if (!effects) {
      applyThemeVars(id);
      setSettings({ theme: id });
      return;
    }
    glTransition.play({
      effect: randomEffect(),
      from,
      to,
      duration: 1050,
      onMid: () => {
        applyThemeVars(id);
        setSettings({ theme: id });
      },
    });
  };

  useEffect(() => {
    const onSetTheme = (e: Event) => switchTheme((e as CustomEvent<string>).detail);
    window.addEventListener("bl-set-theme", onSetTheme);
    return () => window.removeEventListener("bl-set-theme", onSetTheme);
  }, [settings.theme, settings.effectsOn]);

  // глобальные горячие клавиши
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(!useBerloga.getState().paletteOpen);
        return;
      }
      if (mod && e.key.toLowerCase() === "n") {
        e.preventDefault();
        createNote();
        toast.success("Новая заметка");
        return;
      }
      if (mod && e.key === ",") {
        e.preventDefault();
        setSettingsOpen(true);
        return;
      }
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        toast.success("Сохранено в этой берлоге — серверы отдыхают");
        return;
      }
      if (e.key === "Escape") {
        const st = useBerloga.getState();
        if (st.paletteOpen) st.setPaletteOpen(false);
        else if (st.settingsOpen) st.setSettingsOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [createNote, setPaletteOpen, setSettingsOpen]);

  // вход в приложение после заставки — шейдерный раствор
  const enterApp = () => {
    if (entering) return;
    setEntering(true);
    const th = getTheme(settings.theme).gl;
    glTransition.play({
      effect: "pixel",
      from: th,
      to: th,
      duration: 1150,
      onMid: () => {
        setIntroOpen(false);
      },
      onDone: () => {
        setEntering(false);
        setSettings({ introSeen: true });
      },
    });
  };

  const note = notes.find((n) => n.id === selectedId) ?? null;
  const showList = view === "tags" ? false : true;

  return (
    <div className={`bl-root ${mounted ? "mounted" : ""} ${introOpen ? "has-intro" : ""}`}>
      {/* WebGL-оверлей переходов */}
      <canvas ref={glCanvasRef} className="gl-transition-canvas" aria-hidden="true" />

      {introOpen && <Intro onEnter={enterApp} themeId={settings.theme} />}

      <div className={`app-shell ${introOpen ? "hidden-under" : ""}`}>
        <Rail />
        <div className={`main-cols ${sidebarOpen ? "" : "sidebar-closed"}`}>
          {showList ? <NoteList /> : <TagsPanel />}
          <Editor note={introOpen ? null : note} />
          {settings.infoOpen && <InfoPanel note={note} />}
        </div>
        <button
          className="sidebar-toggle"
          onClick={() => setSidebarOpen((v) => !v)}
          title={sidebarOpen ? "Свернуть список" : "Развернуть список"}
          aria-label="Показать или скрыть список заметок"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {sidebarOpen ? <path d="M15 6l-6 6 6 6" /> : <path d="M9 6l6 6-6 6" />}
          </svg>
        </button>
      </div>

      <Palette />
      <SettingsDialog />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "var(--bl-surface)",
            color: "var(--bl-text)",
            border: "1px solid var(--bl-border)",
            borderRadius: "12px",
            fontFamily: "'Inter', sans-serif",
            fontSize: "13.5px",
          },
        }}
      />
    </div>
  );
}
