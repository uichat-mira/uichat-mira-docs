import { existsSync, readFileSync, readdirSync } from "node:fs";
import { relative, resolve } from "node:path";
import { verifyBlogFeed } from "./blog-feed.mjs";
import { parseMiraDoc } from "@uichat-mira/docs";

const root = process.cwd();
const pagesRoot = resolve(root, "src/pages");
const distRoot = resolve(root, "dist");
const siteUrl = "https://mira.tomz.io";
const expectedBase = `/${(process.env.EXPECTED_BASE || "uichat-mira-docs").replace(/^\/+|\/+$/g, "")}`;

function markdownFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    return entry.name.endsWith(".md") && !/^README\.md$/i.test(entry.name)
      ? [path]
      : [];
  });
}

function dataString(data, key) {
  const value = data[key];
  if (Array.isArray(value)) return value.length ? String(value[0]) : undefined;
  if (value == null || value === "") return undefined;
  return String(value);
}

function routeFor(_sourcePath, doc) {
  return doc.path || "/";
}

function routeFile(route) {
  if (route === "/") return resolve(distRoot, "index.html");
  return resolve(distRoot, route.replace(/^\//, ""), "index.html");
}

function routeUrl(route) {
  return `${siteUrl}${expectedBase}${route === "/" ? "/" : `${route}/`}`;
}

function verifyDocumentShell(route, expectedTitle) {
  const file = routeFile(route);
  if (!existsSync(file)) return;
  const html = readFileSync(file, "utf8");
  const requiredClasses = [
    'class="top-nav docs-header seo-static-header"',
    'class="docs-app seo-static-docs-app"',
    'class="docs-shell"',
    'class="docnav"',
    'class="toc"',
    'class="page-nav"',
  ];
  for (const marker of requiredClasses) {
    if (!html.includes(marker)) {
      failures.push(`静态文档页缺少完整页面壳 ${marker}: ${route}`);
    }
  }
  if ((html.match(new RegExp(`<h1>${expectedTitle}<\\/h1>`, "g")) || []).length !== 1) {
    failures.push(`静态文档页标题重复或缺失: ${route}`);
  }
  if (/\b(?:src|href)="\.\.?\/assets\//.test(html)) {
    failures.push(`深层路由包含相对 assets 地址: ${route}`);
  }
}

const failures = [];
const visibleRoutes = new Set(["/"]);
const docsByRoute = new Map();
for (const file of markdownFiles(pagesRoot)) {
  const sourcePath = relative(pagesRoot, file).replace(/\\/g, "/");
  const doc = parseMiraDoc(sourcePath, readFileSync(file, "utf8"));
  const merge = dataString(doc.data, "merge");
  const mergeIndex = dataString(doc.data, "mergeIndex") === "true";
  if (merge && !mergeIndex) continue;
  const route = routeFor(sourcePath, doc);
  visibleRoutes.add(route);
  docsByRoute.set(route, doc);
}

const legacyDocRoots = [
  "/philosophy",
  "/product",
  "/configuration",
  "/status",
  "/architecture",
  "/engineering",
];
visibleRoutes.add("/guide");
visibleRoutes.add("/api");
visibleRoutes.add("/guide/about/mobile");
visibleRoutes.add("/about");

const legacyMobileMarkdown = resolve(pagesRoot, "guide/about/mobile.md");
if (existsSync(legacyMobileMarkdown)) {
  failures.push("Mira Mobile landing page 不应再由 Markdown 实现");
}

const legacyHrefPattern =
  /href="(?:https:\/\/mira\.tomz\.io)?\/(?:(?:docs\/about)(?:\/|")|about\/|(?:docs\/)?(?:philosophy|product|configuration|status|architecture|engineering)(?:\/|"))/;

for (const route of visibleRoutes) {
  if (
    route.startsWith("/about/") ||
    legacyDocRoots.some((root) => route === root || route.startsWith(`${root}/`))
  ) {
    failures.push(`仍生成旧文档路由: ${route}`);
  }
  const file = routeFile(route);
  if (!existsSync(file)) {
    failures.push(`缺少静态页面: ${route} -> ${file}`);
    continue;
  }
  const html = readFileSync(file, "utf8");
  if (legacyHrefPattern.test(html)) {
    failures.push(`静态页面仍包含旧文档链接: ${route}`);
  }
  const internalHrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
  for (const href of internalHrefs) {
    if (!href.startsWith("/")) continue;
    const [hrefPath] = href.split(/[?#]/, 1);
    const withoutBase =
      expectedBase !== "/" && hrefPath.startsWith(`${expectedBase}/`)
        ? hrefPath.slice(expectedBase.length)
        : hrefPath;
    if (
      withoutBase !== "/" &&
      visibleRoutes.has(withoutBase) &&
      !withoutBase.endsWith("/")
    ) {
      failures.push(`静态页面包含非 canonical 内链: ${route} -> ${withoutBase}`);
    }
  }
}

const indexPath = resolve(distRoot, "index.html");
const notFoundPath = resolve(distRoot, "404.html");
const sitemapPath = resolve(distRoot, "sitemap.xml");
const robotsPath = resolve(distRoot, "robots.txt");
const redirectsPath = resolve(distRoot, "_redirects");
for (const file of [indexPath, notFoundPath, sitemapPath, robotsPath, redirectsPath]) {
  if (!existsSync(file)) failures.push(`缺少构建产物: ${file}`);
}

const aboutLandingPath = routeFile("/about");
if (!existsSync(aboutLandingPath)) {
  failures.push("缺少 Mira Organization 关于页静态页面");
} else {
  const html = readFileSync(aboutLandingPath, "utf8");
  if (!html.includes("我们在做 Mira，也在公开它是怎样被做出来的。")) {
    failures.push("Mira Organization 关于页缺少主标题");
  }
  if (!html.includes("People are not infrastructure.")) {
    failures.push("Mira Organization 关于页缺少公平劳动价值声明");
  }
  if (!html.includes('id="fair-work"')) {
    failures.push("Mira Organization 关于页缺少 fair-work 锚点");
  }
  const blogIndex = html.indexOf(">博客</a>");
  const aboutIndex = html.indexOf(">关于</a>");
  if (blogIndex === -1 || aboutIndex === -1 || aboutIndex < blogIndex) {
    failures.push("顶部导航中的 关于 没有位于 博客 后面");
  }
}

const mobileLandingPath = routeFile("/guide/about/mobile");
if (!existsSync(mobileLandingPath)) {
  failures.push("缺少 Mira Mobile landing page 静态页面");
} else {
  const html = readFileSync(mobileLandingPath, "utf8");
  if (!html.includes("Mira，跟你一起出门。")) {
    failures.push("Mira Mobile landing page 静态页面缺少主标题");
  }
  if (!html.includes('class="mobile-landing-phone"')) {
    failures.push("Mira Mobile landing page 缺少手机界面视觉");
  }
  if (!html.includes("DESKTOP HOST CONNECTED")) {
    failures.push("Mira Mobile landing page 缺少 Desktop Host 连接语义");
  }
}

const requiredHomeAssets = [
  "images/product/mira-hero-desktop-mobile.svg",
];
for (const asset of requiredHomeAssets) {
  const file = resolve(distRoot, asset);
  if (!existsSync(file)) failures.push(`首页静态资源缺失: ${asset}`);
}

for (const retiredAsset of [
  "images/product/mira-fair-work-statement.svg",
  "images/product/mira-fair-work-statement-mobile.svg",
]) {
  if (existsSync(resolve(distRoot, retiredAsset))) {
    failures.push(`已退役的首页公平劳动海报仍存在: ${retiredAsset}`);
  }
}

if (existsSync(indexPath)) {
  const html = readFileSync(indexPath, "utf8");
  if (!html.includes("People are not infrastructure.")) {
    failures.push("首页缺少 Mira Values 主句");
  }
  if (!html.includes("/about/#fair-work")) {
    failures.push("首页 Mira Values 缺少 About fair-work 链接");
  }
  const homeBlogIndex = html.indexOf(">博客</a>");
  const homeAboutIndex = html.indexOf(">关于</a>");
  if (homeBlogIndex === -1 || homeAboutIndex === -1 || homeAboutIndex < homeBlogIndex) {
    failures.push("首页顶部导航中的 关于 没有位于 博客 后面");
  }
  if (!html.includes(`<link rel="canonical" href="${siteUrl}${expectedBase}/">`)) {
    failures.push("首页 canonical 缺失或 base 不正确");
  }
  if (!html.includes('property="og:site_name" content="UIChat Mira"')) {
    failures.push("首页缺少 UIChat Mira Open Graph 站点信息");
  }
  if (!html.includes('type="application/ld+json"')) {
    failures.push("首页缺少 JSON-LD");
  }
  if ((html.match(/name="description"/g) || []).length !== 1) {
    failures.push("首页 description meta 不是唯一值");
  }
  if (html.includes(">视觉</a>") || html.includes(">Design Md</a>")) {
    failures.push("顶部导航仍残留独立视觉入口");
  }
  if (html.includes(">MiraDocs</a>") || html.includes("/mira-docs-api")) {
    failures.push("顶部导航仍残留 MiraDocs 入口");
  }
  if (!html.includes(">指南</a>") || !html.includes(">API</a>")) {
    failures.push("顶部导航缺少指南或 API");
  }
  if (html.includes(">文档</a>")) {
    failures.push("顶部导航仍残留旧文档入口");
  }
}

if (existsSync(notFoundPath)) {
  const html = readFileSync(notFoundPath, "utf8");
  if (!html.includes('content="noindex,nofollow"')) {
    failures.push("404 页面没有 noindex,nofollow");
  }
}

const visualRootRoute = "/design-md";
const visualRootPath = routeFile(visualRootRoute);
if (!existsSync(visualRootPath)) {
  failures.push("缺少视觉文档根页面");
} else {
  const html = readFileSync(visualRootPath, "utf8");
  if (!html.includes("/design-md/视觉/product-design-system")) {
    failures.push("视觉文档根页面缺少产品设计系统入口");
  }
  if (html.includes("MiraDocs") || html.includes("/mira-docs-api")) {
    failures.push("视觉文档根页面仍残留 MiraDocs 迁移内容");
  }
}

const miraDocsAreaPath = routeFile("/mira-docs-api");
if (existsSync(miraDocsAreaPath)) {
  failures.push("MiraDocs 公开区域仍被构建");
}

const designSystemRoute = "/design-md/视觉/product-design-system";
const designSystemPath = routeFile(designSystemRoute);
if (existsSync(designSystemPath)) {
  const html = readFileSync(designSystemPath, "utf8");
  if (html.includes("::: html")) {
    failures.push("产品设计系统静态页泄漏了 ::: html 容器标记");
  }
  if (!html.includes('class="claude-visual"')) {
    failures.push("产品设计系统静态页没有恢复原始 HTML 视觉内容");
  }
  if (!html.includes("Mira 的设计系统")) {
    failures.push("产品设计系统静态页缺少合并后的正文内容");
  }
  const docnav = html.match(/<nav class="docnav">[\s\S]*?<\/nav>/)?.[0] || "";
  if (!docnav.includes(">视觉</a>")) {
    failures.push("视觉文档侧栏缺少视觉根入口");
  }
  if (!docnav.includes("<h5>视觉</h5>")) {
    failures.push("视觉文档侧栏缺少统一视觉分组");
  }
  if (docnav.includes("<h5>主题</h5>") || docnav.includes("<h5>产品设计系统</h5>")) {
    failures.push("视觉文档侧栏仍残留迁移前的拆分目录");
  }
}
verifyDocumentShell(designSystemRoute, "产品设计系统");

const claudeRoute = "/design-md/视觉/theme/claude";
const claudePath = routeFile(claudeRoute);
if (existsSync(claudePath)) {
  const html = readFileSync(claudePath, "utf8");
  if (html.includes("<h1>Claude 的 DESIGN.md</h1>")) {
    failures.push("Claude 静态页仍显示正文中的重复一级标题");
  }
  if (!html.includes("DESIGN.md 原始元数据")) {
    failures.push("Claude 静态页正文信息缺失");
  }
  if (!html.includes("本页目录")) {
    failures.push("Claude 静态页缺少本页目录");
  }
}
verifyDocumentShell(claudeRoute, "Claude");

const mobileRoute = "/mobile";
const mobilePath = routeFile(mobileRoute);
if (existsSync(mobilePath)) {
  const html = readFileSync(mobilePath, "utf8");
  if (!html.includes('class="mobile-product-section"')) {
    failures.push("Mira Mobile 静态页缺少产品 section");
  }
  if (
    html.includes("&lt;section class=&quot;mobile-product-section&quot;") ||
    html.includes("<pre><code>&lt;section class=\"mobile-product-section\"")
  ) {
    failures.push("Mira Mobile 静态页把产品 section 泄漏成了源码代码块");
  }
  if (
    !html.includes('data-mobile-download="android"') ||
    !html.includes('data-mobile-download="ios"')
  ) {
    failures.push("Mira Mobile 静态页缺少动态下载绑定");
  }
  if (
    /https:\/\/assets\.tomz\.io\/mira\/mobile\/[^"']+\.(?:apk|ipa)/i.test(html) ||
    /github\.com\/[^"']+\/releases\/download\/[^"']+\.(?:apk|ipa)/i.test(html)
  ) {
    failures.push("Mira Mobile 静态页重新写死了具体 APK/IPA 下载地址");
  }
}

const blogEntry = [...docsByRoute.entries()].find(([route]) =>
  route.startsWith("/blogs/"),
);
if (blogEntry) {
  const [route, doc] = blogEntry;
  const file = routeFile(route);
  if (existsSync(file)) {
    const html = readFileSync(file, "utf8");
    if (!html.includes('class="article-header"')) {
      failures.push(`博客静态页缺少文章头: ${route}`);
    }
    if (!html.includes("post-meta post-meta-article")) {
      failures.push(`博客静态页缺少作者、日期和分类信息: ${route}`);
    }
    if (!html.includes("author-signature")) {
      failures.push(`博客静态页缺少作者署名区: ${route}`);
    }
    if (!html.includes('class="top-nav docs-header seo-static-header"')) {
      failures.push(`博客静态页缺少站点导航: ${route}`);
    }
    if (doc.date && !html.includes(String(doc.date))) {
      failures.push(`博客静态页缺少发布日期: ${route}`);
    }
    if (doc.group && !html.includes(String(doc.group))) {
      failures.push(`博客静态页缺少文章分类: ${route}`);
    }
  }
}

if (existsSync(sitemapPath)) {
  const sitemap = readFileSync(sitemapPath, "utf8");
  for (const route of visibleRoutes) {
    const url = routeUrl(route);
    if (!sitemap.includes(`<loc>${url}</loc>`)) {
      failures.push(`sitemap 缺少路由: ${route}`);
    }
  }
}

if (existsSync(redirectsPath) && existsSync(sitemapPath)) {
  const redirects = readFileSync(redirectsPath, "utf8");
  const sitemap = readFileSync(sitemapPath, "utf8");
  const canonicalPaths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => new URL(match[1]).pathname)
    .filter((pathname) => pathname !== "/" && pathname.endsWith("/"));
  for (const canonical of canonicalPaths) {
    const source = canonical.replace(/\/$/, "");
    if (!redirects.includes(`${source} ${canonical} 301`)) {
      failures.push(`_redirects 缺少 canonical 跳转: ${source} -> ${canonical}`);
    }
  }
}

try {
  const feed = verifyBlogFeed(distRoot);
  console.log("RSS static output verified: " + feed.count + " blog articles.");
} catch (error) {
  failures.push("博客 RSS feed 校验失败: " + (error instanceof Error ? error.message : String(error)));
}

if (existsSync(robotsPath)) {
  const robots = readFileSync(robotsPath, "utf8");
  const expected = `Sitemap: ${siteUrl}${expectedBase}/sitemap.xml`;
  if (!robots.includes(expected)) failures.push("robots.txt sitemap 地址不正确");
}

if (failures.length) {
  console.error("MiraDocs 静态产物检查失败：");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `MiraDocs static output passed: ${visibleRoutes.size} routes, complete article shells/Markdown rendering/canonical/JSON-LD/404/sitemap/robots/redirects verified.`,
);
