"use client";

import dynamic from "next/dynamic";

// Берлога — полностью клиентское офлайн-приложение (localStorage + WebGL),
// поэтому SSR отключён: это же убирает расхождения гидратации.
const Berloga = dynamic(() => import("@/components/berloga/Berloga"), {
  ssr: false,
  loading: () => (
    <div className="bl-root boot">
      <div className="boot-splash" aria-label="Загрузка берлоги">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor" className="boot-paw">
          <ellipse cx="7" cy="8.2" rx="1.9" ry="2.5" transform="rotate(-18 7 8.2)" />
          <ellipse cx="12" cy="6.4" rx="1.9" ry="2.6" />
          <ellipse cx="17" cy="8.2" rx="1.9" ry="2.5" transform="rotate(18 17 8.2)" />
          <path d="M12 11.4c2.9 0 5.4 2.1 5.4 4.6 0 2-1.6 3.3-3.4 3.1-1-.1-1.4-.4-2-.4s-1 .3-2 .4c-1.8.2-3.4-1.1-3.4-3.1 0-2.5 2.5-4.6 5.4-4.6z" />
        </svg>
      </div>
    </div>
  ),
});

export default function Home() {
  return <Berloga />;
}
