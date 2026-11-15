import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./berloga.css";

const BP = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  title: "Берлога — офлайн-заметки",
  description:
    "Уютные офлайн-заметки в духе Bear: markdown на лету, теги, темы и шейдерные переходы. Всё живёт в браузере, без серверов.",
  keywords: ["заметки", "markdown", "офлайн", "берлога", "notes", "offline"],
  icons: { icon: `${BP}/favicon.svg` },
};

export const viewport: Viewport = {
  themeColor: "#FFF8E9",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" data-theme="graphite" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href={`${BP}/fonts/fonts.css`} />
        <link rel="icon" href={`${BP}/favicon.svg`} type="image/svg+xml" />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var r=localStorage.getItem('berloga.v1');var s=r?JSON.parse(r).state:null;var t=s&&s.settings&&s.settings.theme?s.settings.theme:'graphite';document.documentElement.dataset.theme=t;var light=t==='graphite'||t==='honey'||t==='solar-light';document.documentElement.style.colorScheme=light?'light':'dark';}catch(e){}`,
          }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
