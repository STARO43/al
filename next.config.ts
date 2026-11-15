import type { NextConfig } from "next";

const isGHPages = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  // Для сборки под GitHub Pages: NEXT_PUBLIC_STATIC_EXPORT=1 npm run build
  // (+ при необходимости NEXT_PUBLIC_BASE_PATH="/<имя-репозитория>")
  ...(isGHPages
    ? {
        output: "export" as const,
        images: { unoptimized: true },
        trailingSlash: true,
        basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
      }
    : {
        output: "standalone",
      }),
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  devIndicators: false,
};

export default nextConfig;
