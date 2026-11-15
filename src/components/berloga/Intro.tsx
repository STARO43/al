"use client";

// Берлога — React-обёртка кинетической WebGL-заставки.
// Колесо мыши / свайп — следующее слово; мышь деформирует буквы в шейдере.

import React, { useEffect, useRef, useState, useCallback } from "react";
import { ArrowDown } from "lucide-react";
import { introScene } from "@/lib/berloga/gl/intro";
import { getTheme } from "@/lib/berloga/themes";
import { useBerloga } from "@/lib/berloga/store";

const SLIDES = [
  { word: "МЫСЛИ", sub: "приходят быстро — держите их в тепле" },
  { word: "СЛОВА", sub: "простые, честные, ваши" },
  { word: "ИДЕИ", sub: "вкладываются друг в друга, как соты" },
  { word: "БЕРЛОГА", sub: "офлайн-заметки: только вы и текст", final: true },
];

export default function Intro({ onEnter, themeId }: { onEnter: () => void; themeId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [index, setIndex] = useState(0);
  const lockedRef = useRef(false);
  const touchY = useRef<number | null>(null);
  const setSettings = useBerloga((s) => s.setSettings);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const glOk = (() => {
      try {
        const test = document.createElement("canvas");
        return !!(test.getContext("webgl") || test.getContext("experimental-webgl"));
      } catch { return false; }
    })();

    if (glOk) {
      introScene.attach(canvas, SLIDES.map((s) => s.word), {
        onAdvance: (i) => setIndex(i),
      });
      // ждём подгрузку Unbounded для красивой текстуры
      const boot = async () => {
        try {
          await Promise.race([
            document.fonts.load('900 100px "Unbounded"').then(() => document.fonts.ready),
            new Promise((r) => setTimeout(r, 1500)),
          ]);
        } catch { /* оффлайн без шрифта — рисуем фолбэком */ }
        introScene.start();
      };
      boot();
    } else if (canvasRef.current) {
      canvasRef.current.style.display = "none";
    }

    const onMove = (e: PointerEvent) => introScene.setMouse(e.clientX, e.clientY);
    const onWheel = (e: WheelEvent) => {
      if (lockedRef.current || Math.abs(e.deltaY) < 18) return;
      lockedRef.current = true;
      setTimeout(() => { lockedRef.current = false; }, 700);
      if (e.deltaY > 0) introScene.next(); else introScene.prev();
    };
    const onTouchStart = (e: TouchEvent) => { touchY.current = e.touches[0].clientY; };
    const onTouchEnd = (e: TouchEvent) => {
      if (touchY.current === null) return;
      const dy = touchY.current - e.changedTouches[0].clientY;
      touchY.current = null;
      if (Math.abs(dy) < 55 || lockedRef.current) return;
      lockedRef.current = true;
      setTimeout(() => { lockedRef.current = false; }, 700);
      if (dy > 0) introScene.next(); else introScene.prev();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") introScene.next();
      if (e.key === "ArrowUp" || e.key === "PageUp") introScene.prev();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKey);
      introScene.dispose();
    };
  }, []);

  const skip = useCallback(() => {
    setSettings({ introSeen: true });
    onEnter();
  }, [onEnter, setSettings]);

  const slide = SLIDES[index];
  const theme = getTheme(themeId);

  return (
    <div className="intro" role="presentation">
      <canvas ref={canvasRef} className="intro-canvas" />
      <div className="intro-ui">
        <div className="intro-top">
          <div className="intro-brand">
            <span className="intro-brand-paw" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <ellipse cx="7" cy="8.2" rx="1.9" ry="2.5" transform="rotate(-18 7 8.2)" />
                <ellipse cx="12" cy="6.4" rx="1.9" ry="2.6" />
                <ellipse cx="17" cy="8.2" rx="1.9" ry="2.5" transform="rotate(18 17 8.2)" />
                <path d="M12 11.4c2.9 0 5.4 2.1 5.4 4.6 0 2-1.6 3.3-3.4 3.1-1-.1-1.4-.4-2-.4s-1 .3-2 .4c-1.8.2-3.4-1.1-3.4-3.1 0-2.5 2.5-4.6 5.4-4.6z" />
              </svg>
            </span>
            <span className="intro-brand-name">берлога</span>
            <span className="intro-brand-offline">офлайн</span>
          </div>
          <button className="intro-skip" onClick={skip}>
            пропустить
          </button>
        </div>

        <div className="intro-bottom">
          <p className="intro-sub" key={`s-${index}`}>{slide.sub}</p>
          <div className="intro-dots" role="tablist" aria-label="Слайды заставки">
            {SLIDES.map((s, i) => (
              <button
                key={s.word}
                role="tab"
                aria-selected={i === index}
                aria-label={s.word}
                className={`intro-dot ${i === index ? "on" : ""} ${i < index ? "past" : ""}`}
                onClick={() => introScene.goTo(i)}
              />
            ))}
          </div>
          {slide.final ? (
            <button className="intro-cta" onClick={skip}>
              открыть берлогу
              <span className="cta-paw" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <ellipse cx="7" cy="8.2" rx="1.9" ry="2.5" transform="rotate(-18 7 8.2)" />
                  <ellipse cx="12" cy="6.4" rx="1.9" ry="2.6" />
                  <ellipse cx="17" cy="8.2" rx="1.9" ry="2.5" transform="rotate(18 17 8.2)" />
                  <path d="M12 11.4c2.9 0 5.4 2.1 5.4 4.6 0 2-1.6 3.3-3.4 3.1-1-.1-1.4-.4-2-.4s-1 .3-2 .4c-1.8.2-3.4-1.1-3.4-3.1 0-2.5 2.5-4.6 5.4-4.6z" />
                </svg>
              </span>
            </button>
          ) : (
            <div className="intro-hint">
              <ArrowDown size={14} className="intro-hint-ico" />
              <span>крутите колесо — буквы можно трогать мышью</span>
            </div>
          )}
        </div>
      </div>
      <div className="intro-vignette" style={{ pointerEvents: "none" }} aria-hidden="true" />
      <span className="sr-only">{`Тема: ${theme.name}`}</span>
    </div>
  );
}
