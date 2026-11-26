import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { folio } from "@uichat-mira/folio/vite";
import { folioStaticBuild } from "./folio-static";
import { blogTaxonomyCheck } from "./scripts/blog-taxonomy-check";
import { seo as seoConfig, siteUrl } from "./src/site.config";

const productDescription =
  "UIChat Mira 是一个本地优先、桌面优先、多 Provider 的个人 AI 工作台，统一承载对话、知识、Agent、MCP、工具与微应用。";

export default defineConfig(({ mode }) => {
  // Cloudflare Pages injects CF_PAGES=1. Treat it as a root deployment even if
  // an external build setting accidentally invokes the github-pages mode.
  // GitHub Actions does not set CF_PAGES, so the repository base remains intact.
  const isCloudflarePages = process.env.CF_PAGES === "1";
  const isGitHubPagesBuild = mode === "github-pages" && !isCloudflarePages;
  const base = isGitHubPagesBuild ? "/uichat-mira-docs/" : "/";

  return {
    server: {
      port: 5174,
    },
    plugins: [
      folio({
        contentDir: "src/pages",
        config: {
          title: "UIChat Mira",
          description: productDescription,
          siteUrl,
        },
        staticRoutes: seoConfig.enabled ? folioStaticBuild : false,
        exclude: (sourcePath) => /(^|\/)README\.md$/i.test(sourcePath),
        route: (_sourcePath, doc) => doc.path || "/",
      }),
      blogTaxonomyCheck(),
      react(),
      tailwindcss(),
      VitePWA({
        // Auto-update prevents a stale service worker from keeping an old HTML
        // shell that points at hashed assets removed by a newer deployment.
        registerType: "autoUpdate",
        includeAssets: [
          "favicon-32x32.png",
          "apple-touch-icon.png",
          "pwa-icon-192.png",
          "pwa-icon-512.png",
          "pwa-maskable-512.png",
        ],
        manifest: {
          name: "UIChat Mira",
          short_name: "Mira",
          description: productDescription,
          lang: "zh-CN",
          start_url: "./",
          scope: "./",
          display: "standalone",
          theme_color: "#cc785c",
          background_color: "#faf9f5",
          icons: [
            {
              src: "pwa-icon-192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "pwa-icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "pwa-maskable-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          cleanupOutdatedCaches: true,
        },
      }),
    ],
    base,
  };
});
