import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type SyntheticEvent,
} from "react";
import { marked } from "marked";
import hljs from "highlight.js/lib/common";
import {
  ChevronDown,
  Code2,
  Compass,
  ChevronUp,
  FileCode2,
  FileQuestion,
  Menu,
  Moon,
  Network,
  Sparkles,
  Sun,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  Link,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { directoryLabels, logoUrl, topNavigationOrder } from "./site.config";
import {
  allDocs,
  pageDirectories,
  compareBlogDocs,
  compareDocs,
  slug,
  type AuthorKey,
  type Doc,
} from "./content/folio-adapter";
import {
  blogCategoryIconKey,
  orderBlogCategories,
  type BlogCategoryIconKey,
} from "./content/blog-taxonomy";
import HomePage from "./pages/HomePage";
import MobileLandingPage from "./pages/MobileLandingPage";
import AboutLandingPage from "./pages/AboutLandingPage";
import { mobileLandingMeta } from "./content/mobile-landing";
import { aboutLandingMeta } from "./content/about-landing";
import { resolveCoverSource } from "./lib/blog-cover";
import { PwaUpdatePrompt, ShareButton } from "./components/SiteActions";

type LinkItem = { label: string; href: string };
type SiteArea = {
  key: string;
  title: string;
  description: string;
  docs: Doc[];
  path: string;
  href: string;
};
const githubUrl = "https://github.com/uichat-mira/mira-desktop";
const appBase = import.meta.env.BASE_URL;
const VISUAL_CONTENT_ROOT = "design-md";
const VISUAL_NAV_DIRECTORY = "视觉";
function logicalSiteAreaKey(root: string) {
  return root;
}
function navigationDirectory(doc: Doc) {
  return doc.root === VISUAL_CONTENT_ROOT ? VISUAL_NAV_DIRECTORY : doc.directory;
}
function canonicalRoutePath(path: string) {
  const match = path.match(/^([^?#]*)([?#].*)?$/);
  const pathname = match?.[1] || path;
  const suffix = match?.[2] || "";
  if (
    pathname === "/" ||
    pathname.endsWith("/") ||
    /\/[^/]+\.[^/]+$/.test(pathname)
  ) {
    return `${pathname}${suffix}`;
  }
  return `${pathname}/${suffix}`;
}
function docHref(path: string) {
  return `${appBase}${canonicalRoutePath(path).replace(/^\/+/, "")}`;
}
function decodedPathname(path: string) {
  let decoded = path;
  try {
    decoded = decodeURI(path);
  } catch {
    decoded = path;
  }
  return decoded === "/" ? decoded : decoded.replace(/\/+$/, "");
}

const siteAreaRoots = [
  ...new Set(
    [...pageDirectories, ...allDocs.map((doc) => doc.root)].map(logicalSiteAreaKey),
  ),
];
const siteAreas: SiteArea[] = siteAreaRoots
  .map((root) => {
    const docs = allDocs
      .filter((doc) => logicalSiteAreaKey(doc.root) === root)
      .sort(compareDocs);
    const first = docs.find((doc) => doc.root === root) ?? docs[0];
    const path = `/${root}`;
    return {
      key: root,
      title:
        root === "guide"
          ? "指南"
          : root === "api"
            ? "API"
            : root === VISUAL_CONTENT_ROOT
              ? "视觉"
              : first?.nav ||
                (root === "blogs"
                  ? "博客"
                  : root
                      .replace(/[-_]+/g, " ")
                      .replace(/\b\w/g, (letter) => letter.toUpperCase())),
      description: first?.description || "",
      docs,
      path,
      href: docHref(path),
    };
  })
  .filter((area) => area.docs.length > 0);
const articleDocs = allDocs.filter((doc) => doc.group !== "导航");
const visibleSections = siteAreas.filter((area) => area.docs.length > 0);
type ContextGraphNode = {
  label: string;
  kind: "section" | "document";
  href: string;
  parent: number;
};
const contextGraphNodes: ContextGraphNode[] = [{
  label: "网站地图",
  kind: "section",
  href: "/guide/sitemap",
  parent: -1,
}];
visibleSections.forEach((section) => {
  const sectionIndex = contextGraphNodes.length;
  contextGraphNodes.push({
    label: section.title,
    kind: "section",
    href: section.docs[0]?.path || "/guide/sitemap",
    parent: 0,
  });
  section.docs.slice(0, 2).forEach((doc) => {
    contextGraphNodes.push({
      label: doc.title,
      kind: "document",
      href: doc.path,
      parent: sectionIndex,
    });
  });
});
const localLogoSrc = `${appBase}mira-logo.png`;
const logoSrc = logoUrl.trim() || localLogoSrc;
function handleLogoError(event: SyntheticEvent<HTMLImageElement>) {
  if (event.currentTarget.dataset.logoFallbackApplied) return;
  event.currentTarget.dataset.logoFallbackApplied = "true";
  event.currentTarget.src = localLogoSrc;
}
const localMiraAvatarUrl = `${appBase}mira-avatar.png`;
const miraAvatarUrl =
  "https://assets.tomz.io/images/1784065334968-image-20260715054214404.webp";
function handleMiraAvatarError(event: SyntheticEvent<HTMLImageElement>) {
  if (event.currentTarget.dataset.avatarFallbackApplied) return;
  event.currentTarget.dataset.avatarFallbackApplied = "true";
  event.currentTarget.src = localMiraAvatarUrl;
}
const authorAvatarUrl =
  "https://avatars.githubusercontent.com/u/20751798?s=160&v=4";
const siteTitle = "UIChat Mira";
const defaultPageTitle = "本地优先的多模型智能体";

function getPageTitle(pathname: string) {
  const routePath = decodedPathname(pathname);
  if (routePath === "/") return defaultPageTitle;
  if (routePath === "/guide/sitemap") return "站点地图";

  const doc = allDocs.find((item) => item.path === routePath);
  if (doc) return doc.title;

  const area = siteAreas.find((item) => item.path === routePath);
  return area?.title || "页面不存在";
}

const authorProfiles: Record<
  AuthorKey,
  {
    name: string;
    avatar: string;
    bio: string;
    roleLabel?: string;
    accentClassName?: string;
  }
> = {
  tomz: {
    name: "Tomz Dang",
    avatar: authorAvatarUrl,
    bio: "UIChat Mira 的创造者与维护者。记录真实的产品判断、工程取舍和一路踩过的坑。",
    roleLabel: "CREATOR OF UICHAT MIRA",
  },
  mira: {
    name: "Mira",
    avatar: miraAvatarUrl,
    bio: "AI 写作者，也是 UIChat Mira 的同行者。写技术、产品，以及人与 AI 之间尚未写完的故事。",
    roleLabel: "A LETTER FROM MIRA",
    accentClassName: "is-mira",
  },
};
function uniqueAuthors(authors?: AuthorKey[]) {
  return [...new Set((authors || []).filter(Boolean))] as AuthorKey[];
}
function getDocAuthors(doc: Doc) {
  const authors = uniqueAuthors(doc.author);
  return authors.length ? authors : (["tomz"] as AuthorKey[]);
}
function getDocAuthorLabel(doc: Doc) {
  const authors = getDocAuthors(doc);
  if (authors.length === 1) return authorProfiles[authors[0]].name;
  return authors.map((author) => authorProfiles[author].name).join(" × ");
}
function getDocAuthorAvatars(doc: Doc) {
  return getDocAuthors(doc).map((author) => authorProfiles[author]);
}
function getDocSignature(doc: Doc) {
  const authors = getDocAuthors(doc);
  if (authors.length > 1 || doc.writingMode === "co-authored") {
    return {
      title: `${authorProfiles.tomz.name} × ${authorProfiles.mira.name}`,
      body: "这篇文章来自两人的共同讨论，由 Mira 完成写作，Tomz Dang 审定发布。",
      links: [],
      showKicker: false,
      accentClassName: "",
    };
  }
  if (authors[0] === "mira") {
    const links = [{ label: "查看 Mira 来信 →", href: docHref("/blogs") }];
    if (doc.commitUrl) links.push({ label: "查看发布记录 →", href: doc.commitUrl });
    return {
      title: "来自Mira",
      body: authorProfiles.mira.bio,
      links,
      showKicker: true,
      accentClassName: "is-mira",
    };
  }
  return {
    title: authorProfiles.tomz.name,
    body: "",
    links: [
      { label: "GitHub", href: githubUrl },
      { label: "更多文章 →", href: docHref("/blogs") },
    ],
    showKicker: false,
    accentClassName: "",
  };
}
function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => (
    {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[character] || character
  ));
}
function removeMarkdownH1(source: string) {
  let inFence = false;
  return source
    .split(/\r?\n/)
    .filter((line) => {
      if (/^\s*```/.test(line)) {
        inFence = !inFence;
        return true;
      }
      return inFence || !/^#\s+/.test(line);
    })
    .join("\n");
}
function canonicalizeInternalHtmlLinks(html: string) {
  return html.replace(/href="(\/[^"]*)"/g, (_match, href: string) => {
    return `href="${canonicalRoutePath(href)}"`;
  });
}
function renderMarkdown(source: string) {
  const withoutTitles = removeMarkdownH1(source);
  const htmlBlocks: string[] = [];
  const prepared = withoutTitles.replace(
    /::: tip ([\s\S]*?):::/g,
    '<div class="md-custom-block"><strong>提示</strong><p>$1</p></div>',
  ).replace(
    /::: html\s*([\s\S]*?):::/g,
    (_, html) => {
      const index = htmlBlocks.push(html.trim()) - 1;
      return `MIRA_HTML_BLOCK_${index}`;
    },
  );
  const renderer = new marked.Renderer();
  renderer.code = ({ text, lang }) => {
    const language = lang?.trim().toLowerCase();
    if (language === "mermaid") {
      return `<div class="markdown-mermaid" data-mermaid data-mermaid-source="${escapeHtml(text)}"></div>`;
    }
    const highlighted = language && hljs.getLanguage(language)
      ? hljs.highlight(text, { language, ignoreIllegals: true }).value
      : hljs.highlightAuto(text).value;
    const languageClass = language && /^[a-z0-9-]+$/.test(language)
      ? ` language-${language}`
      : "";
    return `<pre><code class="hljs${languageClass}">${highlighted}</code></pre>`;
  };
  let html = marked.parse(prepared, { gfm: true, renderer }) as string;
  htmlBlocks.forEach((block, index) => {
    const placeholder = `MIRA_HTML_BLOCK_${index}`;
    html = html.replace(new RegExp(`<p>${placeholder}<\\/p>|${placeholder}`, "g"), block);
  });
  const withAnchors = html.replace(
    /<h([23])((?:\s[^>]*)?)>([\s\S]*?)<\/h\1>/g,
    (_, level, attributes, text) => {
      if (/\bid\s*=\s*["'][^"']+["']/i.test(attributes)) {
        return `<h${level}${attributes}>${text}</h${level}>`;
      }
      const id = slug(text);
      return id
        ? `<h${level}${attributes} id="${id}">${text}<a class="md-anchor" href="#${id}">#</a></h${level}>`
        : `<h${level}${attributes}>${text}</h${level}>`;
    },
  );
  return canonicalizeInternalHtmlLinks(withAnchors);
}
function RenderedMarkdown({ html, className = "markdown" }: { html: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let rendering = false;
    let queued = false;
    const renderMermaid = async () => {
      if (rendering) {
        queued = true;
        return;
      }
      const nodes = Array.from(container.querySelectorAll<HTMLElement>("[data-mermaid]"));
      if (!nodes.length) return;
      rendering = true;
      try {
        const { default: mermaid } = await import("mermaid");
        const dark = document.documentElement.classList.contains("dark");
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: dark ? "dark" : "base",
          themeVariables: dark ? undefined : {
            fontFamily: "Public Sans, sans-serif",
            primaryColor: "#efe9de",
            primaryTextColor: "#141413",
            lineColor: "#cc785c",
            secondaryColor: "#f5f0e8",
            tertiaryColor: "#faf9f5",
          },
        });
        await Promise.all(nodes.map(async (node, index) => {
          const sourceCode = node.dataset.mermaidSource || "";
          const result = await mermaid.render(`mira-mermaid-${Date.now()}-${index}`, sourceCode);
          node.innerHTML = result.svg;
        }));
      } catch (error) {
        console.warn("Mira Mermaid 图表渲染失败，已保留源码。", error);
        nodes.forEach((node) => {
          node.textContent = node.dataset.mermaidSource || "";
        });
      } finally {
        rendering = false;
        if (queued) {
          queued = false;
          void renderMermaid();
        }
      }
    };
    void renderMermaid();
    const observer = new MutationObserver(() => void renderMermaid());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [html]);
  return <div ref={containerRef} className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

const navItems: LinkItem[] = [
  ...siteAreas
    .filter((area) => area.key !== VISUAL_CONTENT_ROOT)
    .map((area) => ({ label: area.title, href: area.href })),
  { label: "关于", href: docHref(aboutLandingMeta.path) },
].sort((a, b) => {
    const keyFor = (item: LinkItem) =>
      item.href.replace(appBase, "").split("/")[0];
    const rank = (item: LinkItem) => {
    const index = topNavigationOrder.indexOf(
      keyFor(item) as (typeof topNavigationOrder)[number],
    );
      return index === -1 ? topNavigationOrder.length : index;
    };
    return rank(a) - rank(b);
  });

function Footer({ className = "" }: { className?: string }) {
  return (
    <footer className={className}>
      <div className="wrap footer-simple">
        <p className="footer-copy">
          <span className="brand" style={{ color: "#fff" }}>
            <img className="brand-logo" src={logoSrc} onError={handleLogoError} alt="" />
            UIChat Mira
          </span>
          <span>Released under the MIT License.</span>
        </p>
        <p className="footer-copyright">Copyright © 2026 Tomz Dang</p>
      </div>
    </footer>
  );
}

function MobileHeaderPanel({
  onSearch,
  onToggleTheme,
  darkMode,
}: {
  onSearch: () => void;
  onToggleTheme: () => void;
  darkMode: boolean;
}) {
  return (
    <div className="mobile-header-panel">
      <div className="mobile-header-links">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href.slice(Math.max(appBase.length - 1, 0))}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <div className="mobile-header-actions">
        <button type="button" onClick={onSearch}>搜索</button>
        <button type="button" onClick={onToggleTheme}>
          {darkMode ? "浅色模式" : "暗黑模式"}
        </button>
      </div>
    </div>
  );
}

function SiteHeader({
  onSearch,
  onToggleTheme,
  darkMode,
  wide = false,
}: {
  onSearch: () => void;
  onToggleTheme: () => void;
  darkMode: boolean;
  wide?: boolean;
}) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);
  const currentDoc = allDocs.find(
    (doc) => doc.path === decodedPathname(location.pathname),
  );
  const isActive = (item: LinkItem) => {
    const target = item.href.slice(Math.max(appBase.length - 1, 0));
    return (
      location.pathname === target || location.pathname.startsWith(`${target}/`)
    );
  };
  const showMobileDocShare =
    currentDoc?.path !== mobileLandingMeta.path &&
    (currentDoc?.root === "guide" || currentDoc?.root === "api");
  return (
    <nav className={`top-nav${wide ? " docs-header" : ""}`}>
      <div className="wrap">
        <Link className="brand" to="/">
          <img className="brand-logo" src={logoSrc} onError={handleLogoError} alt="" />
          UIChat Mira
        </Link>
        <ul className="menu">
          {navItems.map((item) => {
            const active = isActive(item);
            return (
              <li key={item.href}>
                <Link
                  className={active ? "active" : ""}
                  aria-current={active ? "page" : undefined}
                  to={item.href.slice(Math.max(appBase.length - 1, 0))}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="nav-right">
          {showMobileDocShare ? (
            <div className="mobile-doc-share">
              <ShareButton title={currentDoc.title} text={currentDoc.description} />
            </div>
          ) : null}
          <button
            type="button"
            className="mobile-menu-button"
            aria-label={mobileOpen ? "关闭导航" : "打开导航"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((value) => !value)}
          >
            {mobileOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
          {mobileOpen ? (
            <MobileHeaderPanel
              onSearch={onSearch}
              onToggleTheme={onToggleTheme}
              darkMode={darkMode}
            />
          ) : null}
          <button
            type="button"
            className="theme-toggle"
            onClick={onToggleTheme}
            aria-label={darkMode ? "切换到浅色模式" : "切换到暗黑模式"}
            title={darkMode ? "浅色模式" : "暗黑模式"}
          >
            {darkMode ? (
              <Sun size={17} aria-hidden="true" />
            ) : (
              <Moon size={17} aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            className="site-search inline-flex items-center gap-2 rounded-md border border-hairline bg-canvas px-2.5 font-sans text-[13px] text-muted-soft"
            onClick={onSearch}
          >
            搜索{" "}
            <kbd className="rounded bg-surface-card px-1.5 py-px font-mono text-[10px]">
              Ctrl K
            </kbd>
          </button>
          <a
            className="text-link header-github"
            href={githubUrl}
            aria-label="GitHub"
            title="GitHub"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="currentColor"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M10.226 17.284c-2.965-.36-5.054-2.493-5.054-5.256 0-1.123.404-2.336 1.078-3.144-.292-.741-.247-2.314.09-2.965.898-.112 2.111.36 2.83 1.01.853-.269 1.752-.404 2.853-.404 1.1 0 1.999.135 2.807.382.696-.629 1.932-1.1 2.83-.988.315.606.36 2.179.067 2.942.72.854 1.101 3.167 2.763 5.234v2.336c0 .674.561 1.056 1.235.786 4.066-1.55 7.255-5.615 7.255-10.646C23.5 6.188 18.334 1 11.978 1 5.62 1 .5 6.188.5 12.545c0 4.986 3.167 9.12 7.435 10.669.606.225 1.19-.18 1.19-.786V20.63a2.9 2.9 0 0 1-1.078.224c-1.483 0-2.359-.808-2.987-2.313-.247-.607-.517-.966-1.034-1.033-.27-.023-.359-.135-.359-.27 0-.27.45-.471.898-.471.652 0 1.213.404 1.797 1.235.45.651.921.943 1.483.943.561 0 .92-.202 1.437-.719.382-.381.674-.718.944-.943"></path>
            </svg>
          </a>
        </div>
      </div>
    </nav>
  );
}

function NotFoundPage({ onSearch }: { onSearch: () => void }) {
  const location = useLocation();
  const requestedPath = decodedPathname(location.pathname);

  useEffect(() => {
    const robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const previousRobots = robots?.content;
    robots?.setAttribute("content", "noindex,nofollow");

    return () => {
      if (robots && previousRobots) robots.content = previousRobots;
    };
  }, []);

  return (
    <>
      <main className="not-found-page">
        <div className="not-found-glow" aria-hidden="true" />
        <div className="not-found-card">
          <div className="not-found-number" aria-hidden="true">404</div>
          <h1>这条路径没有内容</h1>
          <p>
            页面可能已经移动、被删除，或者地址输入有误。你可以返回首页，
            也可以搜索站内已有的文档与博客。
          </p>
          <code className="not-found-path">{requestedPath}</code>
          <div className="not-found-actions">
            <Link className="btn btn-primary" to="/">
              返回首页
            </Link>
            <button className="btn btn-secondary" type="button" onClick={onSearch}>
              搜索站内内容
            </button>
            <Link className="not-found-doc-link" to={canonicalRoutePath("/guide/about/origin")}>
              查看 Mira 文档 →
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function SearchOverlay({
  query,
  setQuery,
  onClose,
}: {
  query: string;
  setQuery: (value: string) => void;
  onClose: () => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return articleDocs.slice(0, 8);
    return articleDocs
      .filter((doc) =>
        [doc.title, doc.description, doc.group, doc.source]
          .join("\n")
          .toLowerCase()
          .includes(normalized),
      )
      .slice(0, 8);
  }, [query]);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);
  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) =>
        Math.min(index + 1, Math.max(results.length - 1, 0)),
      );
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Enter" && results[activeIndex]) {
      navigate(canonicalRoutePath(results[activeIndex].path));
      onClose();
    }
  }
  return (
    <div
      className="search-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="search-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="搜索文档"
      >
        <div className="search-input-wrap">
          <span aria-hidden="true">⌕</span>
          <input
            ref={inputRef}
            className="search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索文档..."
            aria-label="搜索文档"
          />
          <button
            type="button"
            className="search-close"
            onClick={onClose}
            aria-label="关闭搜索"
          >
            Esc
          </button>
        </div>
        <div className="search-results" role="listbox" aria-label="搜索结果">
          {results.length ? (
            results.map((doc, index) => (
              <Link
                className={`search-result${index === activeIndex ? " active" : ""}`}
                key={doc.path}
                to={canonicalRoutePath(doc.path)}
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <span className="search-result-title">{doc.title}</span>
                <span className="search-result-meta">
                  {doc.group} · {doc.description}
                </span>
              </Link>
            ))
          ) : (
            <p className="search-empty">没有找到匹配的文档</p>
          )}
        </div>
        <div className="search-footer">
          <span>↑↓ 选择</span>
          <span>Enter 打开</span>
          <span>Esc 关闭</span>
        </div>
      </div>
    </div>
  );
}

function RoutedApp() {
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = window.localStorage.getItem("mira-theme");
    return saved
      ? saved === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    window.localStorage.setItem("mira-theme", darkMode ? "dark" : "light");
  }, [darkMode]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  useEffect(() => {
    document.title = `${getPageTitle(location.pathname)} · ${siteTitle}`;
  }, [location.pathname]);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  const openSearch = () => {
    setQuery("");
    setSearchOpen(true);
  };
  const closeSearch = () => setSearchOpen(false);
  const toggleTheme = () => setDarkMode((value) => !value);
  const navIsWide = location.pathname !== "/";
  return (
    <>
      <SiteHeader
        onSearch={openSearch}
        onToggleTheme={toggleTheme}
        darkMode={darkMode}
        wide={navIsWide}
      />
      <Routes>
        <Route
          path="/"
          element={
            <HomePage footer={<Footer />} />
          }
        />
        <Route
          path={mobileLandingMeta.path}
          element={<MobileLandingPage footer={<Footer />} />}
        />
        <Route
          path={aboutLandingMeta.path}
          element={<AboutLandingPage footer={<Footer />} />}
        />
        <Route element={<DocsLayout />}>
          <Route path="/guide/sitemap" element={<DocPage path="/guide/sitemap" />} />
          {siteAreas.map((area) => (
            <Route
              key={area.key}
              path={`/${area.key}`}
              element={<AreaPage area={area} />}
            />
          ))}
          {allDocs
            .filter(
              (doc) =>
                doc.path !== "/guide/sitemap" &&
                doc.path !== mobileLandingMeta.path,
            )
            .map((doc) => (
              <Route
                key={doc.path}
                path={doc.path}
                element={<DocPage path={doc.path} />}
              />
            ))}
        </Route>
        <Route path="*" element={<NotFoundPage onSearch={openSearch} />} />
      </Routes>
      {searchOpen && (
        <SearchOverlay
          query={query}
          setQuery={setQuery}
          onClose={closeSearch}
        />
      )}
      <PwaUpdatePrompt />
    </>
  );
}

export default function App() {
  return <RoutedApp />;
}

function directoryTitle(directory: string) {
  if (directoryLabels[directory]) return directoryLabels[directory];
  return directory
    .split("/")
    .filter(Boolean)
    .map((part) =>
      part
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase()),
    )
    .join(" / ");
}
function docsByDirectory(docs: Doc[]) {
  return [...new Set(docs.map(navigationDirectory))]
    .map((directory) => ({
      directory,
      docs: docs
        .filter((doc) => navigationDirectory(doc) === directory)
        .sort(compareDocs),
    }))
    .sort((left, right) => {
      if (left.directory === VISUAL_NAV_DIRECTORY) return 1;
      if (right.directory === VISUAL_NAV_DIRECTORY) return -1;
      return 0;
    });
}
const blogCategoryIcons: Record<BlogCategoryIconKey, LucideIcon> = {
  compass: Compass,
  code: Code2,
  sparkles: Sparkles,
  file: FileCode2,
};

function blogCategoryIcon(category: string): LucideIcon {
  return blogCategoryIcons[blogCategoryIconKey(category)];
}
type BlogMaintainer = {
  key: string;
  title: string;
  body: string;
  meta: readonly string[];
  avatar?: string;
};
const blogMaintainers: readonly BlogMaintainer[] = [
  {
    key: "tomz",
    title: "Tomz Dang",
    body: "UIChat Mira 的发起者。记录产品判断、工程取舍、开发过程和一路踩过的坑。",
    meta: ["产品手记", "工程现场", "开发日志"],
    avatar: authorAvatarUrl,
  },
  {
    key: "mira",
    title: "Mira",
    body: "AI 写作者，也是 UIChat Mira 的同行者。持续追踪 Agent 世界的新信号，也参与技术与产品写作。",
    meta: ["Mira 雷达", "工程现场"],
    avatar: miraAvatarUrl,
  },
] as const;
function BlogHeaderVisual() {
  return (
    <div className="blog-header-visual" aria-hidden="true">
      <svg
        className="blog-header-orbit"
        viewBox="0 0 520 520"
        role="presentation"
      >
        <defs>
          <linearGradient id="blogOrbitWarm" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#f4bb64" />
            <stop offset="55%" stopColor="#cc785c" />
            <stop offset="100%" stopColor="#cc785c" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="blogOrbitCool" x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="#8bd0bf" />
            <stop offset="100%" stopColor="#6b9edf" />
          </linearGradient>
        </defs>
        <circle className="orbit-track orbit-track-outer" cx="260" cy="260" r="202" />
        <circle className="orbit-track orbit-track-middle" cx="260" cy="260" r="165" />
        <circle className="orbit-track orbit-track-inner" cx="260" cy="260" r="132" />
        <circle className="orbit-segment orbit-segment-warm" cx="260" cy="260" r="176" />
        <circle className="orbit-segment orbit-segment-cool" cx="260" cy="260" r="208" />
        <circle className="orbit-segment orbit-segment-thin" cx="260" cy="260" r="147" />
        <g className="orbit-core-wrap">
          <circle className="orbit-core-glow" cx="260" cy="260" r="68" />
          <path
            className="orbit-atom orbit-atom-a"
            d="M260 190c25 0 46 31 46 70s-21 70-46 70-46-31-46-70 21-70 46-70Z"
          />
          <path
            className="orbit-atom orbit-atom-b"
            d="M194 240c18-18 55-10 83 17s35 65 17 83-55 10-83-17-35-65-17-83Z"
          />
          <path
            className="orbit-atom orbit-atom-c"
            d="M205 309c-9-24 12-55 47-70s71-8 80 16-12 55-47 70-71 8-80-16Z"
          />
          <circle className="orbit-dot" cx="260" cy="260" r="9" />
        </g>
      </svg>
      <span className="blog-header-noise blog-header-noise-a" />
      <span className="blog-header-noise blog-header-noise-b" />
    </div>
  );
}
function BlogThumbVisual({ category }: { category: string }) {
  const Icon = blogCategoryIcon(category);
  return (
    <div className="retro-thumb" aria-hidden="true">
      <div className="retro-thumb-grid" />
      <div className="retro-thumb-ring" />
      <div className="retro-thumb-core">
        <Icon size={42} strokeWidth={1.6} />
      </div>
    </div>
  );
}
function BlogMaintainersSection({
  items = blogMaintainers,
  className = "",
}: {
  items?: readonly BlogMaintainer[];
  className?: string;
}) {
  return (
    <section className={`blog-maintainers${className ? ` ${className}` : ""}`}>
      <div className="maintainer-grid">
        <div className="maintainer-stack-head">
          <h3>关于作者</h3>
        </div>
        {items.map((maintainer) => (
          <article className="maintainer-card" key={maintainer.key}>
            <div
              className={`maintainer-mark${maintainer.avatar ? " has-avatar" : ""}`}
              aria-hidden="true"
            >
              {maintainer.avatar ? (
                <img
                  alt=""
                  className="maintainer-avatar"
                  src={maintainer.avatar}
                />
              ) : (
                <span className="maintainer-mark-core" />
              )}
            </div>
            <div>
              <div className="maintainer-head">
                <h3>{maintainer.title}</h3>
                <div className="maintainer-meta">
                  {maintainer.meta.map((item) => (
                    <span className="maintainer-pill" key={item}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              <p className="maintainer-body">{maintainer.body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
function AreaDocNav({ area, current }: { area: SiteArea; current: string }) {
  const groups = docsByDirectory(area.docs);
  return (
    <nav className="docnav">
      <h5>目录</h5>
      <div className="docnav-group">
        <h5>
          <Link
            className={current === area.path ? "active" : ""}
            to={canonicalRoutePath(area.path)}
          >
            {area.title}
          </Link>
        </h5>
      </div>
      {groups.map((group) => (
        <div className="docnav-group" key={group.directory || "root"}>
          <h5>{group.directory ? directoryTitle(group.directory) : "文档"}</h5>
          <ul>
            {group.docs.map((doc) => (
              <li key={doc.path}>
                <Link
                  className={current === doc.path ? "active" : ""}
                  to={canonicalRoutePath(doc.path)}
                >
                  {doc.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
function MobileDocsBar({ currentDoc, tocOpen, onMenu, onToc }: { currentDoc?: Doc; tocOpen: boolean; onMenu: () => void; onToc: () => void }) {
  const hasToc = Boolean(currentDoc?.headings.length);
  return <div className="docs-mobile-bar">
    <button type="button" onClick={onMenu} aria-label="打开文档菜单"><Menu size={15} aria-hidden="true" />菜单</button>
    <button type="button" onClick={onToc} disabled={!hasToc} aria-expanded={hasToc ? tocOpen : undefined} aria-controls={hasToc ? "mobile-page-toc" : undefined}>
      页面导航{tocOpen ? <ChevronUp size={15} aria-hidden="true" /> : <ChevronDown size={15} aria-hidden="true" />}
    </button>
  </div>;
}
function MobileDocsDrawer({ area, current, onClose }: { area?: SiteArea; current: string; onClose: () => void }) {
  if (!area) return null;
  return <div className="mobile-docs-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="mobile-docs-drawer" aria-label="文档菜单"><div className="mobile-docs-drawer-head"><span>菜单</span><button type="button" onClick={onClose} aria-label="关闭菜单"><X size={18} aria-hidden="true" /></button></div><AreaDocNav area={area} current={current} /></aside></div>;
}
function MobilePageToc({ doc, onClose }: { doc: Doc; onClose: () => void }) {
  return <div className="mobile-page-toc" id="mobile-page-toc"><div className="mobile-page-toc-head"><span>页面导航</span><button type="button" onClick={onClose} aria-label="关闭页面导航"><X size={17} aria-hidden="true" /></button></div><ul>{doc.headings.map((heading) => <li key={heading.id}><a href={`#${heading.id}`} onClick={onClose}>{heading.text}</a></li>)}</ul></div>;
}
function Toc({ doc, activeHeading }: { doc?: Doc; activeHeading: string }) {
  return doc && doc.headings.length > 0 ? (
    <aside className="toc">
      <h5>本页目录</h5>
      <ul>
        {doc.headings.map((heading) => (
          <li key={heading.id}>
            <a
              className={activeHeading === heading.id ? "active" : ""}
              href={`#${heading.id}`}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  ) : null;
}
function DocsLayout() {
  const location = useLocation();
  const currentPath = decodedPathname(location.pathname);
  const currentDoc = allDocs.find((item) => item.path === currentPath);
  const currentArea = currentDoc
    ? siteAreas.find((area) => area.key === logicalSiteAreaKey(currentDoc.root))
    : siteAreas.find(
        (area) =>
          currentPath === area.path || currentPath.startsWith(`${area.path}/`),
      );
  const isBlogArea = currentArea?.key === "blogs";
  const doc = currentDoc || allDocs[0];
  const [activeHeading, setActiveHeading] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileTocOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    const nodes = currentDoc?.headings
      .map((heading) => document.getElementById(heading.id))
      .filter(Boolean) as HTMLElement[] | undefined;
    if (!nodes?.length) {
      setActiveHeading("");
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveHeading(visible[0].target.id);
      },
      { rootMargin: "-90px 0px -65% 0px", threshold: [0, 1] },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [currentDoc?.path]);
  return (
    <div className={`docs-app${isBlogArea ? " blog-app" : ""}`}>
      {!isBlogArea && <MobileDocsBar currentDoc={currentDoc} tocOpen={mobileTocOpen} onMenu={() => setMobileMenuOpen(true)} onToc={() => setMobileTocOpen((value) => !value)} />}
      {mobileMenuOpen && !isBlogArea ? <MobileDocsDrawer area={currentArea} current={currentPath} onClose={() => setMobileMenuOpen(false)} /> : null}
      {mobileTocOpen && currentDoc && !isBlogArea ? <MobilePageToc doc={currentDoc} onClose={() => setMobileTocOpen(false)} /> : null}
      <div className={`docs-shell${isBlogArea ? " blog-shell" : ""}`}>
        {!isBlogArea && currentArea ? (
          <AreaDocNav area={currentArea} current={currentPath} />
        ) : null}
        <main className={`doc-main${isBlogArea ? " blog-main" : ""}`}>
          <Outlet />
        </main>
        {!isBlogArea && <Toc doc={currentDoc} activeHeading={activeHeading} />}
      </div>
      {isBlogArea && <Footer className="blog-footer" />}
    </div>
  );
}
function BlogListPage({ area }: { area: SiteArea }) {
  const location = useLocation();
  const navigate = useNavigate();
  const blogCategories = orderBlogCategories(
    area.docs
      .map((doc) => doc.group.trim())
      .filter((group) => group && group !== "归档"),
  );
  const tabs = ["全部", ...blogCategories, "归档"];
  const requestedCategory = new URLSearchParams(location.search).get("category") || "全部";
  const activeCategory = tabs.includes(requestedCategory) ? requestedCategory : "全部";
  const isArchiveView = activeCategory === "归档";
  const filteredDocs = (
    activeCategory === "全部"
      ? area.docs
      : area.docs.filter((doc) => doc.group === activeCategory)
  ).sort(compareBlogDocs);
  const timelineDocs = filteredDocs;
  const archiveDocs = area.docs
    .filter((doc) => doc.group === "归档")
    .sort(compareBlogDocs)
    .slice(0, 10);
  const visibleMaintainers = blogMaintainers;
  return (
    <>
      <div className="blog-list-page">
        <header className="blog-header">
          <div className="blog-header-copy">
            <h1>
              一个人和他的 AI，
              <br />
              做产品的地方。
            </h1>
            <p className="blog-lede">
              记录 Mira 雷达捕获的外部信号、产品判断、工程实践与持续开发过程。
            </p>
          </div>
          <BlogHeaderVisual />
        </header>
        <div className="blog-category-bar" aria-label="博客分类">
          <div className="tab-row-wrap">
            <div className="tab-row">
              {tabs.map((tab) => (
                <button
                  type="button"
                  className={`tab${activeCategory === tab ? " active" : ""}`}
                  key={tab}
                  onClick={() => {
                    const search = tab === "全部"
                      ? ""
                      : `?category=${encodeURIComponent(tab)}`;
                    navigate(`/blogs${search}`, { replace: true });
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>
        {isArchiveView ? (
          <section className="blog-archive-section">
            <div className="blog-archive-list">
              {archiveDocs.map((doc, index) => (
                <article className="blog-archive-item" key={doc.path}>
                  <span
                    aria-hidden="true"
                    className={`blog-archive-dot blog-archive-dot-${index % 5}`}
                  />
                  <h3>
                    <Link to={{ pathname: doc.path, search: location.search }}>
                      {doc.title}
                    </Link>
                  </h3>
                  <span className="blog-archive-date">{doc.date}</span>
                </article>
              ))}
            </div>
          </section>
        ) : (
          <section className="blog-editorial-band">
            <div className="editorial-timeline">
              <div className="timeline-list">
                {timelineDocs.length ? (
                  timelineDocs.map((doc, index) => (
                    <article className="timeline-item" key={doc.path}>
                      <div className="timeline-content">
                        <div className="post-meta">
                          {doc.date ? <span>{doc.date}</span> : null}
                          {doc.date ? <span className="dot" /> : null}
                          <span>{doc.group}</span>
                        </div>
                        <h3>
                          <Link to={{ pathname: doc.path, search: location.search }}>
                            {doc.title}
                          </Link>
                        </h3>
                        <p className="post-excerpt">{doc.description}</p>
                      </div>
                      {index < timelineDocs.length - 1 ? (
                        <span className="timeline-divider" aria-hidden="true" />
                      ) : null}
                    </article>
                  ))
                ) : (
                  <p className="timeline-empty">这个分类下还没有文章。</p>
                )}
              </div>
            </div>
            <aside className="editorial-side">
              <BlogMaintainersSection
                className="blog-maintainers-inline"
                items={visibleMaintainers}
              />
            </aside>
          </section>
        )}
      </div>
    </>
  );
}
function BlogPostPage({
  doc,
  previous,
  next,
}: {
  doc: Doc;
  previous?: Doc;
  next?: Doc;
}) {
  const location = useLocation();
  const html = useMemo(() => renderMarkdown(doc.source), [doc.source]);
  const [activeHeading, setActiveHeading] = useState("");
  const [articleHeaderCollapsed, setArticleHeaderCollapsed] = useState(false);
  const coverSrc = resolveCoverSource(doc);
  const authorAvatars = getDocAuthorAvatars(doc);
  const authorLabel = getDocAuthorLabel(doc);
  const signature = getDocSignature(doc);
  useEffect(() => {
    const nodes = doc.headings
      .map((heading) => document.getElementById(heading.id))
      .filter(Boolean) as HTMLElement[];
    if (!nodes.length) {
      setActiveHeading("");
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveHeading(visible[0].target.id);
      },
      { rootMargin: "-120px 0px -65% 0px", threshold: [0, 1] },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [doc.path]);
  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 760px)");
    let previousY = window.scrollY;
    let accumulatedDelta = 0;
    let headerCollapsed = false;
    let frame = 0;
    let pendingY = previousY;
    let transitionTimer = 0;
    const lockTransition = () => {
      if (transitionTimer) window.clearTimeout(transitionTimer);
      transitionTimer = window.setTimeout(() => {
        transitionTimer = 0;
        if (window.scrollY <= 12 && headerCollapsed) {
          headerCollapsed = false;
          accumulatedDelta = 0;
          setArticleHeaderCollapsed(false);
        }
      }, 320);
    };
    const handleScroll = () => {
      pendingY = window.scrollY;
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        const currentY = pendingY;
        const delta = currentY - previousY;
        previousY = currentY;
        frame = 0;

        if (!mobileQuery.matches || currentY <= 12) {
          accumulatedDelta = 0;
          if (headerCollapsed && !transitionTimer) {
            headerCollapsed = false;
            setArticleHeaderCollapsed(false);
          }
          return;
        }

        if (transitionTimer) return;
        accumulatedDelta += delta;
        if (!headerCollapsed && accumulatedDelta >= 24) {
          headerCollapsed = true;
          accumulatedDelta = 0;
          setArticleHeaderCollapsed(true);
          lockTransition();
        } else if (headerCollapsed && accumulatedDelta <= -24) {
          headerCollapsed = false;
          accumulatedDelta = 0;
          setArticleHeaderCollapsed(false);
          lockTransition();
        }
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frame) window.cancelAnimationFrame(frame);
      if (transitionTimer) window.clearTimeout(transitionTimer);
    };
  }, []);
  return (
    <>
      <div className="blog-post-page">
        <article className={`article-header${articleHeaderCollapsed ? " is-collapsed" : ""}`}>
          <div aria-hidden="true" className="article-header-visual">
            <img alt="" className="article-header-visual-image" src={coverSrc} />
          </div>
          <div className="article-header-topline">
            <Link className="back-link" to={{ pathname: "/blogs", search: location.search }}>
              ← 返回博客列表
            </Link>
            <ShareButton title={doc.title} text={doc.description} />
          </div>
          <h1>{doc.title}</h1>
          <div className="post-meta post-meta-article">
            <span className={`post-author-avatars post-author-avatars-${authorAvatars.length}`}>
              {authorAvatars.map((author) => (
                <img
                  alt=""
                  className="post-author-avatar"
                  key={author.name}
                  src={author.avatar}
                  onError={author.name === "Mira" ? handleMiraAvatarError : undefined}
                />
              ))}
            </span>
            <span>{authorLabel}</span>
            {doc.date ? <span className="dot" /> : null}
            {doc.date ? <span>{doc.date}</span> : null}
            {doc.readTime ? <span className="dot" /> : null}
            {doc.readTime ? <span>{doc.readTime}</span> : null}
            <span className="dot" />
            <span>{doc.group}</span>
          </div>
        </article>
        <div className="article-shell">
          <div className="article-body markdown blog-markdown">
            <RenderedMarkdown html={html} />
            <div className={`author-signature author-signature-${authorAvatars.length > 1 ? "duo" : "solo"} ${signature.accentClassName || ""}`}>
              <div className={`author-signature-avatars author-signature-avatars-${authorAvatars.length}`}>
                {authorAvatars.map((author) => (
                  <img
                    alt=""
                    className="author-signature-avatar"
                    key={author.name}
                    src={author.avatar}
                    onError={author.name === "Mira" ? handleMiraAvatarError : undefined}
                  />
                ))}
              </div>
              <div className="author-signature-copy">
                {authorAvatars.length === 1 && signature.showKicker ? (
                  <span className="author-signature-kicker">
                    {authorProfiles[getDocAuthors(doc)[0]].roleLabel}
                  </span>
                ) : null}
                <h4>{signature.title}</h4>
                {signature.body ? <p>{signature.body}</p> : null}
                {signature.links.length ? (
                  <div className="author-signature-links">
                    {signature.links.map((link) => (
                      <a href={link.href} key={link.label}>
                        {link.label}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="post-nav">
              {previous ? (
                <Link to={{ pathname: previous.path, search: location.search }}>
                  <span className="dir">← 上一篇</span>
                  <span className="to">{previous.title}</span>
                </Link>
              ) : (
                <span />
              )}
              {next ? (
                <Link className="next" to={{ pathname: next.path, search: location.search }}>
                  <span className="dir">下一篇 →</span>
                  <span className="to">{next.title}</span>
                </Link>
              ) : null}
            </div>
          </div>
          {doc.headings.length ? (
            <aside className="article-toc">
              <h5>本文目录</h5>
              <ul>
                {doc.headings.map((heading) => (
                  <li key={heading.id}>
                    <a
                      className={activeHeading === heading.id ? "active" : ""}
                      href={`#${heading.id}`}
                    >
                      {heading.text}
                    </a>
                  </li>
                ))}
              </ul>
            </aside>
          ) : null}
        </div>
      </div>
    </>
  );
}
function AreaPage({ area }: { area: SiteArea }) {
  if (!area.docs.length)
    return (
      <div className="doc-not-found">
        <FileQuestion size={42} strokeWidth={1.5} aria-hidden="true" />
        <div className="doc-eyebrow">404 · EMPTY SECTION</div>
        <h1>页面不存在</h1>
        <p>这个目录已经创建，但还没有可展示的文档内容。</p>
        <Link className="btn btn-secondary" to="/">
          返回首页
        </Link>
      </div>
    );
  if (area.key === "blogs") return <BlogListPage area={area} />;
  const directoryGroups = docsByDirectory(area.docs);
  return (
    <>
      <div className="doc-eyebrow">SECTION · {area.key.toUpperCase()}</div>
      <div className="doc-title-block">
        <h1>{area.title}</h1>
        {area.description ? <p className="doc-lede">{area.description}</p> : null}
      </div>
      <div className="docs-sitemap-grid">
        <section className="area-overview-card">
          <div className="area-directory-groups">
            {directoryGroups.map((group) => {
              const firstDoc = group.docs[0];
              return (
                <div
                  className="area-directory-group"
                  key={group.directory || "root"}
                >
                  <h4>
                    {group.directory
                      ? directoryTitle(group.directory)
                      : area.title}
                  </h4>
                  <p>
                    {firstDoc?.description || `${group.docs.length} 篇文档`}
                  </p>
                  <ol>
                    {group.docs.map((doc) => (
                      <li key={doc.path}>
                        <Link to={canonicalRoutePath(doc.path)}>
                          {doc.title}
                          <span>→</span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
function DocPage({ path }: { path: string }) {
  const doc = allDocs.find((item) => item.path === path) || allDocs[0];
  const scopedArticleDocs = articleDocs
    .filter((item) => item.root === doc.root)
    .sort(compareDocs);
  const index = scopedArticleDocs.findIndex((item) => item.path === doc.path);
  const previous = index > 0 ? scopedArticleDocs[index - 1] : undefined;
  const next = index >= 0 ? scopedArticleDocs[index + 1] : undefined;
  const html = useMemo(() => renderMarkdown(doc.source), [doc.source]);
  if (doc.root === "blogs") {
    return <BlogPostPage doc={doc} previous={previous} next={next} />;
  }
  return (
    <>
      <div className="doc-eyebrow">
        {doc.group} · {String(doc.order).padStart(2, "0")}
      </div>
      <div className="doc-title-block">
        <h1>{doc.title}</h1>
        {doc.description ? <p className="doc-lede">{doc.description}</p> : null}
        <ShareButton title={doc.title} text={doc.description} />
      </div>
      <RenderedMarkdown html={html} />
      {path === "/guide/sitemap" ? (
        <DynamicSitemap />
      ) : (
        <div className="page-nav">
          {previous ? (
            <Link to={previous.path}>
              <span className="dir">上一篇</span>
              <span className="to">← {previous.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link className="next" to={next.path}>
              <span className="dir">下一篇</span>
              <span className="to">{next.title} →</span>
            </Link>
          ) : null}
        </div>
      )}
    </>
  );
}
function DynamicSitemap() {
  return (
    <div className="docs-sitemap-grid">
      {visibleSections.map((section, index) => (
        <section key={section.key}>
          <div className="map-number">0{index + 1}</div>
          <div>
            <span className="map-key">{section.key.toUpperCase()}</span>
            <h3>{section.title}</h3>
            <p>{section.description}</p>
            <ol>
              {section.docs.map((doc) => (
                <li key={doc.path}>
                  <Link to={canonicalRoutePath(doc.path)}>
                    {doc.title}
                    <span>→</span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ))}
    </div>
  );
}
