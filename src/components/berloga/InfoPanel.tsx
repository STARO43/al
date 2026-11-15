"use client";

// Берлога — инфо-панель: статистика, оглавление, теги заметки и «пульс» берлоги.

import React, { useEffect, useRef } from "react";
import { Clock, AlignLeft, Type, FileStack, CheckSquare, Hash } from "lucide-react";
import { useBerloga } from "@/lib/berloga/store";
import { computeStats, buildToc } from "@/lib/berloga/markdown";
import { extractTags } from "@/lib/berloga/tags";

function Sparkline({ activity }: { activity: Record<string, number> }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = cv.clientWidth || 220;
    const H = 56;
    cv.width = W * dpr;
    cv.height = H * dpr;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const days: { key: string; n: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000);
      const p = (x: number) => String(x).padStart(2, "0");
      const key = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
      days.push({ key, n: activity[key] ?? 0 });
    }
    const max = Math.max(...days.map((d) => d.n), 1);
    const gap = 4;
    const bw = (W - gap * 13) / 14;
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--bl-accent").trim() || "#C0392F";
    const faint = getComputedStyle(document.documentElement).getPropertyValue("--bl-faint").trim() || "#999";

    days.forEach((d, i) => {
      const h = Math.max(2, (d.n / max) * (H - 16));
      const x = i * (bw + gap);
      const y = H - 10 - h;
      ctx.fillStyle = d.n > 0 ? accent : faint;
      ctx.globalAlpha = d.n > 0 ? 0.35 + 0.65 * (d.n / max) : 0.18;
      const r = Math.min(3, bw / 2);
      ctx.beginPath();
      ctx.moveTo(x, H - 10);
      ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
      ctx.arcTo(x + bw, y, x + bw, y + r, r);
      ctx.lineTo(x + bw, H - 10);
      ctx.closePath();
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = faint;
    ctx.font = "9px 'Inter', sans-serif";
    const labels = ["14 дн", "7 дн", "сегодня"];
    const lx = [0, 6.5 * (bw + gap), 13 * (bw + gap) - 30];
    labels.forEach((l, i) => ctx.fillText(l, lx[i], H - 1));
  }, [activity]);
  return <canvas ref={ref} className="pulse-canvas" aria-label="Активность за две недели" />;
}

export default function InfoPanel({ note }: { note: { id: string; text: string } | null }) {
  const activity = useBerloga((s) => s.activity);
  const setTagFilter = useBerloga((s) => s.setTagFilter);

  const stats = computeStats(note?.text ?? "");
  const toc = buildToc(note?.text ?? "");
  const tags = note ? extractTags(note.text) : [];

  const goto = (line: number) => {
    window.dispatchEvent(new CustomEvent("bl-goto-line", { detail: line }));
  };

  const statItems = [
    { icon: Type, label: "слова", value: stats.words },
    { icon: AlignLeft, label: "знаки", value: stats.chars },
    { icon: FileStack, label: "абзацы", value: stats.paragraphs },
    { icon: Clock, label: "чтение", value: stats.readMin ? `${stats.readMin} мин` : "—" },
    { icon: CheckSquare, label: "задачи", value: stats.todos.total ? `${stats.todos.done}/${stats.todos.total}` : "—" },
  ];

  return (
    <aside className="info-panel" aria-label="Информация о заметке">
      <div className="info-scroll">
        <div className="info-block">
          <h3 className="info-title">Статистика</h3>
          <div className="stats-grid">
            {statItems.map(({ icon: Icon, label, value }) => (
              <div className="stat-cell" key={label}>
                <Icon size={13} className="stat-ico" />
                <span className="stat-val">{value}</span>
                <span className="stat-label">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {toc.length > 0 && (
          <div className="info-block">
            <h3 className="info-title">Оглавление</h3>
            <div className="toc">
              {toc.map((t, i) => (
                <button
                  key={`${t.line}-${i}`}
                  className={`toc-item lv${t.level}`}
                  onClick={() => goto(t.line)}
                  style={{ paddingLeft: (t.level - 1) * 12 }}
                  title="Перейти к разделу"
                >
                  {t.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {tags.length > 0 && (
          <div className="info-block">
            <h3 className="info-title">Теги заметки</h3>
            <div className="tag-chips">
              {tags.map((t) => (
                <button key={t} className="tag-chip" onClick={() => setTagFilter(t)}>
                  <Hash size={11} /> {t}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="info-block">
          <h3 className="info-title">Пульс берлоги</h3>
          <Sparkline activity={activity} />
          <p className="pulse-note">Правки за последние 14 дней</p>
        </div>
      </div>
    </aside>
  );
}
