"use client";

// Берлога — панель тегов с деревом вложений (#пасека/соты).

import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Hash } from "lucide-react";
import { allTags, type TagNode } from "@/lib/berloga/tags";
import { useBerloga } from "@/lib/berloga/store";

function TreeNode({ node, depth, selected, onPick }: { node: TagNode; depth: number; selected: string | null; onPick: (p: string) => void }) {
  const [open, setOpen] = useState(depth < 1);
  const hasKids = node.children.length > 0;
  return (
    <div className="tag-node">
      <div
        className={`tag-row ${selected === node.path ? "selected" : ""}`}
        style={{ paddingLeft: 10 + depth * 16 }}
        role="button"
        tabIndex={0}
        onClick={() => { onPick(node.path); if (hasKids) setOpen(true); }}
        onKeyDown={(e) => { if (e.key === "Enter") onPick(node.path); }}
      >
        {hasKids ? (
          <span className="tag-chev" onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>
            {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </span>
        ) : (
          <span className="tag-chev pad" />
        )}
        <Hash size={12} className="tag-hash" />
        <span className="tag-name">{node.name}</span>
        <span className="tag-count">{node.count}</span>
      </div>
      {open && node.children.map((c) => (
        <TreeNode key={c.path} node={c} depth={depth + 1} selected={selected} onPick={onPick} />
      ))}
    </div>
  );
}

export default function TagsPanel() {
  const notes = useBerloga((s) => s.notes);
  const tagFilter = useBerloga((s) => s.tagFilter);
  const setTagFilter = useBerloga((s) => s.setTagFilter);
  const setView = useBerloga((s) => s.setView);

  const tree = useMemo(() => allTags(notes), [notes]);

  return (
    <aside className="note-list tags-panel" aria-label="Теги">
      <div className="list-head">
        <div className="list-title-row">
          <h2 className="list-title">Теги</h2>
        </div>
        <p className="tags-hint">Пишите в тексте #тег — он появится здесь. Слэш делает вложенность: #пасека/соты</p>
      </div>
      <div className="list-scroll">
        <button
          className={`tag-row all ${tagFilter === null ? "selected" : ""}`}
          onClick={() => setView("notes")}
        >
          <span className="tag-chev pad" />
          <Hash size={12} className="tag-hash" />
          <span className="tag-name">все заметки</span>
          <span className="tag-count">{notes.filter((n) => !n.trashed && !n.archived).length}</span>
        </button>
        {tree.children.map((c) => (
          <TreeNode key={c.path} node={c} depth={0} selected={tagFilter} onPick={setTagFilter} />
        ))}
        {tree.children.length === 0 && (
          <div className="list-empty"><p>Пока ни одного тега.<br />Добавьте #тег в заметку.</p></div>
        )}
      </div>
    </aside>
  );
}
