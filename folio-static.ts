import {
  extractHeadings,
  renderFolioMarkdown,
  type FolioDoc,
  type FolioConfig,
} from "@uichat-mira/folio";
import {
  folioAbsoluteAssetUrl,
  folioAbsoluteRouteUrl,
  folioEscapeHtml,
  type FolioStaticBuildContext,
  type FolioStaticBuildOptions,
  type FolioStaticRoute,
} from "@uichat-mira/folio/vite";
import {
  mobileLandingFacts,
  mobileLandingMeta,
  mobileLandingPaths,
} from "./src/content/mobile-landing";
import {
  aboutLandingMeta,
  aboutOrganizationLinks,
  aboutPrinciples,
  aboutProjects,
} from "./src/content/about-landing";
import {
  MIRA_AUTHORS,
  MIRA_AUTHOR_KEYS,
  authorProfile,
} from "./src/content/authors";

const homeProductDescription =
  "UIChat Mira 是一个本地优先、桌面优先、多 Provider 的个人 AI 工作台，以聊天为入口，让模型、知识库、角色、Agent、MCP、工具与微应用在同一工作环境中协作。";

type StaticDoc = FolioDoc & {
  root: string;
  source: string;
  authors: string[];
  readTime?: string;
  image?: string;
  merge?: string;
  mergeIndex?: boolean;
};

function dataString(data: Record<string, unknown>, key: string): string | undefined {
  const value = data[key];
  if (Array.isArray(value)) return value.length ? String(value[0]) : undefined;
  if (value == null || value === "") return undefined;
  return String(value);
}

function dataList(data: Record<string, unknown>, key: string): string[] {
  const value = data[key];
  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean);
  }
  if (typeof value !== "string" || !value.trim()) return [];
  return value
    .split(/[|,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function authorName(value: string): string {
  return authorProfile(value)?.name ?? value;
}

function authorAvatar(name: string): string {
  return authorProfile(name)?.avatar ?? MIRA_AUTHORS.tomz.avatar;
}

function staticSiteAuthors(): string {
  const authors = MIRA_AUTHOR_KEYS
    .map((key) => {
      const author = MIRA_AUTHORS[key];
      return `<article class="mira-site-author"><span class="folio-doc-meta__avatar mira-site-author__avatar" aria-hidden="true">${folioEscapeHtml(author.name.slice(0, 1))}<img alt="" loading="lazy" src="${author.avatar}" /></span><div><div class="mira-site-author__role">${folioEscapeHtml(author.roleLabel)}</div><h3>${folioEscapeHtml(author.name)}</h3><p>${folioEscapeHtml(author.bio)}</p></div></article>`;
    })
    .join("");
  return `<section class="mira-site-authors" aria-labelledby="mira-site-authors-title"><div class="mira-site-authors__heading"><span>AUTHORS</span><h2 id="mira-site-authors-title">本站作者</h2></div><div class="mira-site-authors__grid">${authors}</div></section>`;
}

function staticDocs(docs: FolioDoc[]): StaticDoc[] {
  const parsed: StaticDoc[] = docs.map((doc: FolioDoc) => {
    const explicitAuthors = dataList(doc.data, "author").map(authorName);
    return {
      ...doc,
      root: doc.path.split("/")[1] || "docs",
      source: doc.body,
      authors:
        dataString(doc.data, "writingMode") === "co-authored"
          ? [MIRA_AUTHORS.tomz.name, MIRA_AUTHORS.mira.name]
          : explicitAuthors.length
            ? explicitAuthors
            : [MIRA_AUTHORS.tomz.name],
      readTime:
        dataString(doc.data, "readTime") ||
        dataString(doc.data, "readtime") ||
        dataString(doc.data, "read_time"),
      image: doc.cover || dataString(doc.data, "image"),
      merge: dataString(doc.data, "merge"),
      mergeIndex: dataString(doc.data, "mergeIndex") === "true",
    };
  });

  return parsed
    .filter((doc: StaticDoc) => !doc.merge || doc.mergeIndex)
    .map((doc: StaticDoc) => {
      if (!doc.merge) return doc;
      const source = parsed
        .filter((section: StaticDoc) => section.merge === doc.merge)
        .sort((left: StaticDoc, right: StaticDoc) => left.order - right.order)
        .map((section: StaticDoc) => section.source)
        .join("\n\n");
      return {
        ...doc,
        source,
        body: source,
        headings: extractHeadings(source),
      };
    });
}

function basePath(base: string): string {
  return base === "/" ? "" : base.replace(/\/$/, "");
}

function canonicalRoutePath(path: string): string {
  const match = path.match(/^([^?#]*)([?#].*)?$/);
  const pathname = match?.[1] || path;
  const suffix = match?.[2] || "";
  const canonicalPath =
    pathname === "/" || pathname.endsWith("/") || /\/[^/]+\.[^/]+$/.test(pathname)
      ? pathname
      : `${pathname}/`;
  return `${canonicalPath}${suffix}`;
}

function docHref(path: string, context: FolioStaticBuildContext): string {
  return `${basePath(context.base)}${canonicalRoutePath(path)}`;
}

function canonicalizeInternalHtmlLinks(
  html: string,
  context: FolioStaticBuildContext,
): string {
  return html.replace(/href="(\/[^"]*)"/g, (_match, href: string) => {
    return `href="${docHref(href, context)}"`;
  });
}

const VISUAL_CONTENT_ROOT = "design-md";
const VISUAL_NAV_DIRECTORY = "视觉";
function logicalStaticAreaKey(root: string): string {
  return root;
}

function pageNavigation(
  previous: StaticDoc | undefined,
  next: StaticDoc | undefined,
  context: FolioStaticBuildContext,
): string {
  if (!previous && !next) return "";
  const previousLink = previous
    ? `<a href="${docHref(previous.path, context)}"><span class="dir">上一篇</span><span class="to">← ${folioEscapeHtml(previous.title)}</span></a>`
    : "<span></span>";
  const nextLink = next
    ? `<a class="next" href="${docHref(next.path, context)}"><span class="dir">下一篇</span><span class="to">${folioEscapeHtml(next.title)} →</span></a>`
    : "";
  return `<div class="page-nav">${previousLink}${nextLink}</div>`;
}

function staticSiteHeader(context: FolioStaticBuildContext): string {
  const links = [
    ["首页", "/"],
    ["指南", "/guide"],
    ["API", "/api"],
    ["博客", "/blogs"],
    ["关于", "/about"],
  ] as const;
  const navigation = links
    .map(
      ([label, path]) =>
        `<li><a href="${docHref(path, context)}">${folioEscapeHtml(label)}</a></li>`,
    )
    .join("");
  return `<nav class="top-nav docs-header seo-static-header"><div class="wrap"><a class="brand" href="${docHref("/", context)}"><img class="brand-logo" alt="" src="${docHref("/mira-logo.png", context)}" />UIChat Mira</a><ul class="menu">${navigation}</ul></div></nav>`;
}

function staticDirectory(doc: StaticDoc): string {
  const parts = doc.path.split("/").filter(Boolean);
  return parts.slice(1, -1).join("/");
}

function staticNavigationDirectory(doc: StaticDoc): string {
  return doc.root === VISUAL_CONTENT_ROOT
    ? VISUAL_NAV_DIRECTORY
    : staticDirectory(doc);
}

function staticDirectoryTitle(directory: string): string {
  const labels: Record<string, string> = {
    about: "认识 Mira",
    philosophy: "产品哲学",
    product: "产品能力",
    configuration: "配置",
    status: "现状与方向",
    architecture: "架构",
    engineering: "工程",
    benchmark: "Agent Benchmark",
  };
  if (!directory) return "文档";
  return directory
    .split("/")
    .filter(Boolean)
    .map((part) => labels[part] || part.replace(/[-_]+/g, " "))
    .join(" / ");
}

function staticDocNav(
  doc: StaticDoc,
  docs: StaticDoc[],
  context: FolioStaticBuildContext,
): string {
  const logicalRoot = logicalStaticAreaKey(doc.root);
  const scoped = docs
    .filter((candidate) => logicalStaticAreaKey(candidate.root) === logicalRoot)
    .sort(
      (left, right) =>
        left.order - right.order || left.path.localeCompare(right.path),
    );
  const groups = new Map<string, StaticDoc[]>();
  for (const candidate of scoped) {
    const directory = staticNavigationDirectory(candidate);
    const group = groups.get(directory) || [];
    group.push(candidate);
    groups.set(directory, group);
  }
  const rootPath = `/${logicalRoot}`;
  const rootTitle =
    logicalRoot === "guide"
      ? "指南"
      : logicalRoot === "api"
        ? "API"
        : logicalRoot === VISUAL_CONTENT_ROOT
          ? "视觉"
          : scoped
          .filter((candidate) => candidate.root === logicalRoot)
          .map((candidate) => dataString(candidate.data, "nav"))
          .find(Boolean) ||
        doc.group ||
        logicalRoot;
  const sections = [...groups.entries()]
    .sort(([left], [right]) => {
      if (left === VISUAL_NAV_DIRECTORY) return 1;
      if (right === VISUAL_NAV_DIRECTORY) return -1;
      return 0;
    })
    .map(([directory, items]) => {
      const links = items
        .map(
          (item) =>
            `<li><a${item.path === doc.path ? ' class="active" aria-current="page"' : ""} href="${docHref(item.path, context)}">${folioEscapeHtml(item.title)}</a></li>`,
        )
        .join("");
      return `<div class="docnav-group"><h5>${folioEscapeHtml(staticDirectoryTitle(directory))}</h5><ul>${links}</ul></div>`;
    })
    .join("");
  return `<nav class="docnav"><h5>目录</h5><div class="docnav-group"><h5><a href="${docHref(rootPath, context)}">${folioEscapeHtml(rootTitle)}</a></h5></div>${sections}</nav>`;
}

function staticDocToc(doc: StaticDoc): string {
  if (!doc.headings.length) return "";
  const links = doc.headings
    .map(
      (heading) =>
        `<li class="toc-depth-${heading.depth}"><a href="#${folioEscapeHtml(heading.id)}">${folioEscapeHtml(heading.text)}</a></li>`,
    )
    .join("");
  return `<aside class="toc"><h5>本页目录</h5><ul>${links}</ul></aside>`;
}

function documentBody(
  doc: StaticDoc,
  previous: StaticDoc | undefined,
  next: StaticDoc | undefined,
  context: FolioStaticBuildContext,
  docs: StaticDoc[],
): string {
  const body = canonicalizeInternalHtmlLinks(
    renderFolioMarkdown(doc.source, { removeH1: true }),
    context,
  );
  const main = `<main class="doc-main seo-static-content"><div class="doc-eyebrow">${folioEscapeHtml(doc.group)} · ${String(doc.order).padStart(2, "0")}</div><div class="doc-title-block"><h1>${folioEscapeHtml(doc.title)}</h1>${doc.description ? `<p class="doc-lede">${folioEscapeHtml(doc.description)}</p>` : ""}</div><article class="markdown">${body}</article>${pageNavigation(previous, next, context)}</main>`;
  return `${staticSiteHeader(context)}<div class="docs-app seo-static-docs-app"><div class="docs-shell">${staticDocNav(doc, docs, context)}${main}${staticDocToc(doc)}</div></div>`;
}

function articleToc(doc: StaticDoc): string {
  if (!doc.headings.length) return "";
  const items = doc.headings
    .map(
      (heading) =>
        `<li class="folio-toc-depth-${heading.depth}"><a data-folio-toc-id="${folioEscapeHtml(heading.id)}" href="#${folioEscapeHtml(heading.id)}">${folioEscapeHtml(heading.text)}</a></li>`,
    )
    .join("");
  return `<aside class="folio-toc" aria-label="本页目录"><h2>本文目录</h2><ul>${items}</ul></aside>`;
}

function articlePageNavigation(
  previous: StaticDoc | undefined,
  next: StaticDoc | undefined,
  context: FolioStaticBuildContext,
): string {
  if (!previous && !next) return "";
  const previousLink = previous
    ? `<a class="folio-page-nav__previous" href="${docHref(previous.path, context)}"><span>上一篇</span><strong>${folioEscapeHtml(previous.title)}</strong></a>`
    : "<span></span>";
  const nextLink = next
    ? `<a class="folio-page-nav__next" href="${docHref(next.path, context)}"><span>下一篇</span><strong>${folioEscapeHtml(next.title)}</strong></a>`
    : "<span></span>";
  return `<nav class="folio-page-nav" aria-label="博客文章分页">${previousLink}${nextLink}</nav>`;
}

function articleByline(doc: StaticDoc): string {
  const authors = doc.authors
    .map(
      (name) =>
        `<span class="folio-doc-meta__author"><span class="folio-doc-meta__avatar" aria-hidden="true">${folioEscapeHtml(name.slice(0, 1))}<img alt="" loading="lazy" src="${authorAvatar(name)}" /></span><span class="folio-doc-meta__name">${folioEscapeHtml(name)}</span></span>`,
    )
    .join("");
  const details = [
    doc.date
      ? `<span class="folio-doc-meta__detail"><span class="folio-doc-meta__separator" aria-hidden="true">/</span><span>${folioEscapeHtml(doc.date)}</span></span>`
      : "",
    doc.readTime
      ? `<span class="folio-doc-meta__detail"><span class="folio-doc-meta__separator" aria-hidden="true">/</span><span>${folioEscapeHtml(doc.readTime)}</span></span>`
      : "",
    `<span class="folio-doc-meta__detail"><span class="folio-doc-meta__separator" aria-hidden="true">/</span><span>${folioEscapeHtml(doc.group)}</span></span>`,
  ].join("");
  return `<div class="folio-doc-meta mira-article-byline" role="group" aria-label="文章信息">${authors}${details}</div>`;
}

function articleBody(
  doc: StaticDoc,
  previous: StaticDoc | undefined,
  next: StaticDoc | undefined,
  context: FolioStaticBuildContext,
): string {
  const body = canonicalizeInternalHtmlLinks(
    renderFolioMarkdown(doc.source, { removeH1: true }),
    context,
  );
  const articleMain = `<main class="folio-doc-page${doc.headings.length ? " folio-article-main" : ""}"><h1>${folioEscapeHtml(doc.title)}</h1>${doc.description ? `<p class="folio-lede">${folioEscapeHtml(doc.description)}</p>` : ""}${articleByline(doc)}<article class="folio-markdown">${body}</article>${staticSiteAuthors()}${articlePageNavigation(previous, next, context)}</main>`;
  const reading = doc.headings.length
    ? `<div class="folio-article-layout"><details class="folio-article-mobile-toc"><summary>本页目录</summary>${articleToc(doc)}</details>${articleMain}${articleToc(doc)}</div>`
    : articleMain;
  const main = `<div class="doc-main seo-static-content mira-folio-article"><div class="mira-folio-article__topline"><a class="mira-folio-article__back" href="${docHref("/blogs", context)}">← 返回博客</a></div>${reading}</div>`;
  return `${staticSiteHeader(context)}<div class="docs-app blog-app seo-static-docs-app"><div class="docs-shell blog-shell">${main}</div></div>`;
}
function areaBody(
  root: string,
  docs: StaticDoc[],
  context: FolioStaticBuildContext,
): string {
  const title =
    root === "guide"
      ? "指南"
      : root === "api"
        ? "API"
        : root === "blogs"
          ? "博客"
          : root === VISUAL_CONTENT_ROOT
            ? "视觉"
            : docs.find((doc: StaticDoc) => doc.root === root)?.title || root;
  const links = docs
    .filter((doc: StaticDoc) => logicalStaticAreaKey(doc.root) === root)
    .map(
      (doc: StaticDoc) =>
        `<li><a href="${docHref(doc.path, context)}">${folioEscapeHtml(doc.title)}</a><p>${folioEscapeHtml(doc.description)}</p></li>`,
    )
    .join("");
  const specialLinks =
    root === mobileLandingMeta.root
      ? `<li><a href="${docHref(mobileLandingMeta.path, context)}">${folioEscapeHtml(mobileLandingMeta.title)}</a><p>${folioEscapeHtml(mobileLandingMeta.description)}</p></li>`
      : "";
  const main = `<main class="doc-main seo-static-content"><div class="doc-title-block"><h1>${folioEscapeHtml(title)}</h1></div><section class="docs-sitemap-grid"><section class="area-overview-card"><ol>${links}${specialLinks}</ol></section></section></main>`;
  return `${staticSiteHeader(context)}<div class="docs-app seo-static-docs-app"><div class="docs-shell">${main}</div></div>`;
}

function homeBody(context: FolioStaticBuildContext): string {
  const links = [
    ["产品定义", "/guide/about/origin"],
    ["Local-first", "/guide/philosophy/local-first"],
    ["Agent", "/api/architecture/agent"],
    ["MCP", "/guide/configuration/mcp"],
    ["当前实现", "/guide/status/current"],
  ] as const;
  const navigation = links
    .map(
      ([label, path]) =>
        `<li><a href="${docHref(path, context)}">${label}</a></li>`,
    )
    .join("");
  const main = `<main class="doc-main seo-static-content"><div class="doc-title-block"><div class="doc-eyebrow">UICHAT MIRA · LOCAL-FIRST AI WORKSPACE</div><h1>UIChat Mira：本地优先的个人 AI 工作台</h1><p class="doc-lede">${homeProductDescription}</p></div><article class="markdown"><h2>UIChat Mira 是什么</h2><p>UIChat Mira 是产品完整名称，Mira 是简称。它不是单一模型厂商的聊天客户端，而是一个由用户掌握数据与执行边界的个人 AI 工作空间。</p><h2>核心能力</h2><ul><li><strong>Local-first：</strong>对话、配置、知识、任务状态和本地产物优先由用户自己的运行环境持有。</li><li><strong>Multi-provider：</strong>聊天、任务模型、Embedding、Rerank、语音、图像和评测可以按用途连接不同 Provider。</li><li><strong>Agent 与受治理工具：</strong>模型看见工具不等于可以直接执行，具体调用需要经过 schema、Policy、审批、Runtime availability 与结果审计。</li><li><strong>MCP Host：</strong>外部能力通过可发现、可配置、可授权的 MCP 工具进入 Mira。</li><li><strong>知识与工作空间：</strong>知识库、RAG、角色、文件、微应用与对话共享持续上下文。</li></ul><h2>权威产品文档</h2><p><code>mira.tomz.io</code> 是 UIChat Mira 的产品知识与文档域名。产品定义、当前实现与运行边界以这里的文档为准。</p><ul>${navigation}</ul></article></main><section class="home-values-section"><div class="wrap home-values-layout"><div class="home-values-copy"><span class="eyebrow">MIRA VALUES</span><h2>People are not infrastructure.</h2><p class="home-values-cn">人不是基础设施。</p><p>Mira 反对 996，以及违法、强迫和无偿的过度劳动。</p></div><div class="home-values-links"><a class="text-link" href="${docHref("/about#fair-work", context)}">关于 Mira</a><a class="text-link" href="${aboutOrganizationLinks.fairWork}">公平劳动声明</a></div></div></section>`;
  return `${staticSiteHeader(context)}${main}`;
}

function staticMobilePhoneMockup(): string {
  return `<figure class="mobile-landing-phone-stage" aria-label="Mira Mobile 会话界面示意"><div class="mobile-landing-phone-orbit" aria-hidden="true"></div><div class="mobile-landing-phone"><div class="mobile-landing-phone-screen"><div class="mobile-landing-phone-notch" aria-hidden="true"></div><div class="mobile-landing-phone-brand">Mira</div><div class="mobile-landing-phone-bubble me">今晚回去继续刚才那段对话。</div><div class="mobile-landing-phone-bubble">可以。你也可以连接桌面 Mira，把更重的工作交给电脑。</div><div class="mobile-landing-phone-status">DESKTOP HOST CONNECTED</div></div></div></figure>`;
}

function mobileLandingBody(context: FolioStaticBuildContext): string {
  const pathCards = mobileLandingPaths
    .map(
      (item) =>
        `<article><span>${folioEscapeHtml(item.eyebrow)}</span><h2>${folioEscapeHtml(item.title)}</h2><p>${folioEscapeHtml(item.description)}</p><code>${folioEscapeHtml(item.endpoint)}</code></article>`,
    )
    .join("");
  const facts = mobileLandingFacts
    .map(
      (item) =>
        `<li><strong>${folioEscapeHtml(item.title)}</strong><p>${folioEscapeHtml(item.description)}</p></li>`,
    )
    .join("");
  const main = `<main class="mobile-landing-page seo-static-content"><div class="doc-title-block"><span class="doc-eyebrow">MIRA MOBILE · PREVIEW</span><h1>Mira，跟你一起出门。</h1><p class="doc-lede">${folioEscapeHtml(mobileLandingMeta.description)}</p></div>${staticMobilePhoneMockup()}<section><h2>同一个 Mira，两种进入方式。</h2>${pathCards}</section><section><h2>现在已经跑起来的部分。</h2><ul>${facts}</ul></section><section><h2>不是把 Desktop 塞进一块更小的屏幕。</h2><p>手机更适合发起、继续、查看和确认；需要桌面环境和更重能力时，再连接 Desktop Host。</p></section><p><a href="https://github.com/uichat-mira/mira-mobile/releases">下载 Mira Mobile</a> · <a href="https://github.com/uichat-mira/mira-mobile">查看源码</a></p></main>`;
  return `${staticSiteHeader(context)}${main}`;
}

function aboutLandingBody(context: FolioStaticBuildContext): string {
  const projects = aboutProjects.map((project, index) => `<a class="about-project-card" href="${folioEscapeHtml(project.href)}"><span>${String(index + 1).padStart(2, "0")}</span><h3>${folioEscapeHtml(project.name)}</h3><strong>${folioEscapeHtml(project.role)}</strong><p>${folioEscapeHtml(project.description)}</p></a>`).join("");
  const principles = aboutPrinciples.map((item, index) => `<article><span>${String(index + 1).padStart(2, "0")}</span><div><h3>${folioEscapeHtml(item.title)}</h3><p>${folioEscapeHtml(item.description)}</p></div></article>`).join("");
  const main = `<main class="about-landing-page seo-static-content"><section class="about-hero"><div class="wrap"><span class="about-kicker">MIRA ORGANIZATION</span><h1>我们在做 Mira，也在公开它是怎样被做出来的。</h1><p>${folioEscapeHtml(aboutLandingMeta.description)}</p><p><a href="${folioEscapeHtml(aboutOrganizationLinks.github)}">GitHub Organization</a> · <a href="${folioEscapeHtml(aboutOrganizationLinks.controlRoom)}">Control Room</a></p></div></section><section class="about-section"><div class="wrap"><h2>一个组织，不是一只越来越大的仓库。</h2><div class="about-project-grid">${projects}</div></div></section><section class="about-section"><div class="wrap"><h2>把能力做大，但把责任边界写清楚。</h2><div class="about-principle-list">${principles}</div></div></section><section id="fair-work" class="about-section"><div class="wrap"><h2>People are not infrastructure.</h2><p>人不是基础设施。</p><p><a href="${folioEscapeHtml(aboutOrganizationLinks.fairWork)}">阅读 Mira 公平劳动声明</a></p></div></section></main>`;
  return `${staticSiteHeader(context)}${main}`;
}

function notFoundBody(context: FolioStaticBuildContext): string {
  const main = `<main class="doc-main seo-static-content"><div class="doc-not-found"><h1>这条路径没有内容</h1><p>页面可能已经移动、被删除，或者地址输入有误。</p><a class="btn btn-primary" href="${basePath(context.base)}/">返回首页</a></div></main>`;
  return `${staticSiteHeader(context)}${main}`;
}

function imageUrl(
  doc: StaticDoc | undefined,
  context: FolioStaticBuildContext,
): string {
  const image = doc?.image?.trim() || "mira-logo.png";
  if (/^https?:\/\//i.test(image)) return image;
  return folioAbsoluteAssetUrl(
    context.config.siteUrl || "",
    context.base,
    image,
  );
}

function homepageJsonLd(
  context: FolioStaticBuildContext,
): Record<string, unknown> {
  const siteUrl = folioAbsoluteRouteUrl(
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
        description: homeProductDescription,
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteUrl}#software`,
        name: "UIChat Mira",
        alternateName: "Mira",
        applicationCategory: "ProductivityApplication",
        description: homeProductDescription,
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

function websiteJsonLd(
  context: FolioStaticBuildContext,
  path: string,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "UIChat Mira",
    url: folioAbsoluteRouteUrl(
      context.config.siteUrl || "",
      context.base,
      path,
    ),
  };
}

function documentJsonLd(
  doc: StaticDoc,
  context: FolioStaticBuildContext,
): Record<string, unknown> {
  const url = folioAbsoluteRouteUrl(
    context.config.siteUrl || "",
    context.base,
    doc.path,
  );
  return {
    "@context": "https://schema.org",
    "@type": doc.root === "blogs" ? "Article" : "TechArticle",
    headline: doc.title,
    description: doc.description,
    url,
    image: imageUrl(doc, context),
    datePublished: doc.date,
    author: doc.authors.map((name: string) => ({ "@type": "Person", name })),
    publisher: { "@type": "Organization", name: "UIChat Mira" },
  };
}

function siblingDocs(
  doc: StaticDoc,
  docs: StaticDoc[],
): { previous?: StaticDoc; next?: StaticDoc } {
  const scoped = docs
    .filter((candidate) => candidate.root === doc.root)
    .sort(
      (left, right) =>
        left.order - right.order || left.path.localeCompare(right.path),
    );
  const index = scoped.findIndex((candidate) => candidate.path === doc.path);
  return {
    previous: index > 0 ? scoped[index - 1] : undefined,
    next: index >= 0 ? scoped[index + 1] : undefined,
  };
}

function routes(context: FolioStaticBuildContext): FolioStaticRoute[] {
  const docs = staticDocs(context.docs);
  const result: FolioStaticRoute[] = [
    {
      path: "/",
      title: "本地优先的个人 AI 工作台",
      description: homeProductDescription,
      body: homeBody(context),
      type: "website",
      jsonLd: homepageJsonLd(context),
    },
    {
      path: aboutLandingMeta.path,
      title: aboutLandingMeta.title,
      description: aboutLandingMeta.description,
      body: aboutLandingBody(context),
      type: "website",
      image: "/mira-logo.png",
      jsonLd: websiteJsonLd(context, aboutLandingMeta.path),
    },
  ];

  const roots = [
    ...new Set(docs.map((doc: StaticDoc) => logicalStaticAreaKey(doc.root))),
  ];
  for (const root of roots) {
    const rootDocs = docs.filter(
      (doc: StaticDoc) => logicalStaticAreaKey(doc.root) === root,
    );
    const title =
      root === "guide"
        ? "指南"
        : root === "api"
          ? "API"
          : root === "blogs"
            ? "博客"
            : rootDocs[0]?.title || root;
    result.push({
      path: `/${root}`,
      title,
      description: rootDocs[0]?.description || "UIChat Mira 文档与博客",
      body: areaBody(root, rootDocs, context),
      type: "website",
      jsonLd: websiteJsonLd(context, `/${root}`),
    });
  }

  result.push({
    path: mobileLandingMeta.path,
    title: mobileLandingMeta.title,
    description: mobileLandingMeta.description,
    body: mobileLandingBody(context),
    type: "website",
    image: "/images/product/mira-hero-desktop-mobile.svg",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: mobileLandingMeta.title,
      description: mobileLandingMeta.description,
      url: folioAbsoluteRouteUrl(
        context.config.siteUrl || "",
        context.base,
        mobileLandingMeta.path,
      ),
    },
  });

  for (const doc of docs) {
    const { previous, next } = siblingDocs(doc, docs);
    result.push({
      path: doc.path,
      title: doc.title,
      description: doc.description || "UIChat Mira 文档",
      body:
        doc.root === "blogs"
          ? articleBody(doc, previous, next, context)
          : documentBody(doc, previous, next, context, docs),
      type: "article",
      image: doc.image,
      jsonLd: documentJsonLd(doc, context),
      doc,
    });
  }

  return result;
}

export const folioStaticBuild: FolioStaticBuildOptions = {
  routes,
  notFound: (context: FolioStaticBuildContext): FolioStaticRoute => ({
    path: "/404",
    title: "页面不存在",
    description: "你访问的页面不存在，可能已经移动、被删除，或者地址输入有误。",
    body: notFoundBody(context),
    type: "website",
    robots: "noindex,nofollow",
    jsonLd: websiteJsonLd(context, "/404"),
  }),
  locale: "zh_CN",
  siteName: "UIChat Mira",
  defaultImage: "mira-logo.png",
  image: {
    type: "image/png",
    width: 940,
    height: 760,
  },
  twitterCard: "summary_large_image",
  title: (route: FolioStaticRoute, config: FolioConfig): string =>
    `${route.title} · ${config.title}`,
  transformTemplate: (
    template: string,
    context: FolioStaticBuildContext,
  ): string => {
    const assetBase = context.base === "/" ? "/" : context.base;
    return template.replace(
      /(href|src)="\/mira-logo\.png"/g,
      `$1="${assetBase}mira-logo.png"`,
    );
  },
  sitemap: true,
  robots: true,
};
