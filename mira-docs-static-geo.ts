import {
  miraDocsAbsoluteRouteUrl,
  type MiraDocsStaticBuildContext,
  type MiraDocsStaticBuildOptions,
  type MiraDocsStaticRoute,
} from "@uichat-mira/docs/vite";
import { miraDocsStaticBuild as baseStaticBuild } from "./mira-docs-static";

const productDescription =
  "UIChat Mira 是一个本地优先、桌面优先、多 Provider 的个人 AI 工作台，以聊天为入口，让模型、知识库、角色、Agent、MCP、工具与微应用在同一工作环境中协作。";

function basePath(base: string): string {
  return base === "/" ? "" : base.replace(/\/$/, "");
}

function href(path: string, context: MiraDocsStaticBuildContext): string {
  return `${basePath(context.base)}${path}`;
}

function homepageBody(context: MiraDocsStaticBuildContext): string {
  const links = [
    ["产品定义", "/about/origin"],
    ["Local-first", "/philosophy/local-first"],
    ["Agent", "/architecture/agent"],
    ["MCP", "/configuration/mcp"],
    ["当前实现", "/status/current"],
  ] as const;
  const navigation = links
    .map(
      ([label, path]) =>
        `<li><a href="${href(path, context)}">${label}</a></li>`,
    )
    .join("");

  return `<nav class="top-nav docs-header seo-static-header"><div class="wrap"><a class="brand" href="${href("/", context)}"><img class="brand-logo" alt="" src="${href("/mira-logo.png", context)}" />UIChat Mira</a><ul class="menu"><li><a href="${href("/about/origin", context)}">文档</a></li><li><a href="${href("/mira-docs-api", context)}">MiraDocs</a></li><li><a href="${href("/blogs", context)}">博客</a></li></ul></div></nav><main class="doc-main seo-static-content"><div class="doc-title-block"><div class="doc-eyebrow">UICHAT MIRA · LOCAL-FIRST AI WORKSPACE</div><h1>UIChat Mira：本地优先的个人 AI 工作台</h1><p class="doc-lede">${productDescription}</p></div><article class="markdown"><h2>UIChat Mira 是什么</h2><p>UIChat Mira 是产品完整名称，Mira 是简称。它不是单一模型厂商的聊天客户端，而是一个由用户掌握数据与执行边界的个人 AI 工作空间。</p><h2>核心能力</h2><ul><li><strong>Local-first：</strong>对话、配置、知识、任务状态和本地产物优先由用户自己的运行环境持有。</li><li><strong>Multi-provider：</strong>聊天、任务模型、Embedding、Rerank、语音、图像和评测可以按用途连接不同 Provider。</li><li><strong>Agent 与受治理工具：</strong>模型看见工具不等于可以直接执行，具体调用需要经过 schema、Policy、审批、Runtime availability 与结果审计。</li><li><strong>MCP Host：</strong>外部能力通过可发现、可配置、可授权的 MCP 工具进入 Mira。</li><li><strong>知识与工作空间：</strong>知识库、RAG、角色、文件、微应用与对话共享持续上下文。</li></ul><h2>权威产品文档</h2><p><code>mira.tomz.io</code> 是 UIChat Mira 的产品知识与文档域名。产品定义、当前实现与运行边界以这里的文档为准。</p><ul>${navigation}</ul></article></main>`;
}

function homepageJsonLd(
  context: MiraDocsStaticBuildContext,
): Record<string, unknown> {
  const siteUrl = miraDocsAbsoluteRouteUrl(
    context.config.siteUrl || "",
    context.base,
    "/",
  );
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}#website`,
        name: "UIChat Mira",
        alternateName: "Mira",
        url: siteUrl,
        description: productDescription,
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteUrl}#software`,
        name: "UIChat Mira",
        alternateName: "Mira",
        applicationCategory: "ProductivityApplication",
        description: productDescription,
        url: siteUrl,
        author: {
          "@type": "Person",
          name: "Tomz Dang",
          url: "https://tomz.io/",
        },
        sameAs: ["https://github.com/uichat-mira/mira-desktop"],
      },
    ],
  };
}

function routes(context: MiraDocsStaticBuildContext): MiraDocsStaticRoute[] {
  const sourceRoutes = baseStaticBuild.routes?.(context) || [];
  return sourceRoutes.map((route) =>
    route.path === "/"
      ? {
          ...route,
          title: "本地优先的个人 AI 工作台",
          description: productDescription,
          body: homepageBody(context),
          jsonLd: homepageJsonLd(context),
        }
      : route,
  );
}

export const miraDocsStaticBuild: MiraDocsStaticBuildOptions = {
  ...baseStaticBuild,
  routes,
};
