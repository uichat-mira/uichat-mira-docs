import type { ReactNode } from "react";
import { ArrowUpRight, Download, GitBranch } from "lucide-react";
import { Link } from "react-router-dom";
import { CoreCapabilities, type CapabilityItem } from "../CoreCapabilities";
import { SitemapGalaxy, type SitemapGalaxyData } from "../components/SitemapGalaxy";
import { allDocs, compareBlogDocs } from "../content/mira-docs-adapter";

const appBase = import.meta.env.BASE_URL;
const desktopRepoUrl = "https://github.com/uichat-mira/mira-desktop";
const organizationUrl = "https://github.com/uichat-mira";
const fairWorkUrl = "https://github.com/uichat-mira/.github/blob/main/FAIR-WORK.md";

function docHref(path: string) {
  return `${appBase}${path.replace(/^\/+/, "")}`;
}

const capabilityItems: CapabilityItem[] = [
  {
    id: "01",
    title: "模型可以换，工作不必重来",
    description:
      "连接本地模型、云端 Provider 与 OpenAI-compatible 服务。模型是能力来源，不是工作空间的边界。",
    href: docHref("/configuration/model-settings"),
  },
  {
    id: "02",
    title: "对话成为长期工作",
    description:
      "对话、分支、角色、附件与历史留在同一个工作空间里。重要讨论可以继续整理，也可以继续做下去。",
    href: docHref("/product/workspace"),
  },
  {
    id: "03",
    title: "知识不只被收藏",
    description:
      "文档进入索引、检索与 Sources。Mira 把知识带回任务，同时保留来源与验证路径。",
    href: docHref("/product/knowledge"),
  },
  {
    id: "04",
    title: "从回答走向行动",
    description:
      "Agent、工具与 MCP 可以参与真实工作，但权限、审批、Evidence 与执行边界仍然可见。",
    detail: "Agent · Harness · MCP",
    href: docHref("/architecture/agent"),
  },
];

const nowItems = [
  {
    key: "current",
    label: "CURRENT",
    title: "当前实现",
    description: "只记录已经能从代码、运行状态和可重复验证中确认的事实。",
    href: docHref("/status/current"),
  },
  {
    key: "next",
    label: "NEXT",
    title: "下一段路",
    description: "计划和完成条件单独维护，不把还没有交付的东西写成现有能力。",
    href: docHref("/status/roadmap"),
  },
  {
    key: "log",
    label: "LOG",
    title: "工程与产品记录",
    description: "周记、工程现场与产品判断持续公开，保留 Mira 是怎样一步步长出来的。",
    href: docHref("/blogs"),
  },
] as const;

const recentPosts = allDocs
  .filter((doc) => doc.root === "blogs" && doc.group !== "归档")
  .sort(compareBlogDocs)
  .slice(0, 3);

type HomePageProps = {
  darkMode: boolean;
  sitemapData: SitemapGalaxyData;
  footer: ReactNode;
};

export default function HomePage({ darkMode, sitemapData, footer }: HomePageProps) {
  return (
    <div className="site home-page">
      <header className="home-hero">
        <div className="wrap home-hero-layout">
          <div className="home-hero-copy">
            <span className="eyebrow">LOCAL-FIRST · MULTI-PROVIDER · OPEN SOURCE</span>
            <h1 className="hero-title">
              从聊天出发，最终回到<span>「接住你」。</span>
            </h1>
            <p className="lede">
              UIChat Mira 是一个本地优先的个人 AI 工作空间。模型、知识、文件与工具围绕同一份上下文工作；你决定边界，它负责把复杂接住。
            </p>
            <div className="hero-cta">
              <a
                className="btn btn-primary release-download-button"
                href={`${desktopRepoUrl}/releases/latest`}
                target="_blank"
                rel="noreferrer"
              >
                <Download size={16} aria-hidden="true" />
                下载 Mira
              </a>
              <Link className="btn btn-secondary" to="/about/origin">
                认识 Mira
              </Link>
            </div>
            <div className="hero-meta" aria-label="Mira 产品特征">
              <span>本地优先</span>
              <span>多模型</span>
              <span>自主可控</span>
            </div>
          </div>

          <figure className="home-product-shot">
            <img
              src={`${appBase}images/product/mira-hero-desktop-mobile.svg`}
              alt="Mira Desktop 与 Mobile 协同示意"
            />
            <figcaption>Mira Desktop + Mobile · 产品关系示意</figcaption>
          </figure>
        </div>
      </header>

      <section className="home-fair-work" aria-label="Mira 公平劳动声明">
        <div className="wrap">
          <object
            data={`${appBase}images/product/mira-fair-work-statement.svg`}
            type="image/svg+xml"
            aria-label="Mira 反对 996。人不是资本的燃料。工作不该成为现代人的受难架。"
            style={{
              display: "block",
              width: "100%",
              height: "auto",
              aspectRatio: "1280 / 400",
              border: 0,
              borderRadius: 8,
            }}
          >
            <a href={fairWorkUrl} target="_blank" rel="noreferrer">
              阅读公平劳动声明
            </a>
          </object>
        </div>
      </section>

      <section className="home-now-section" aria-labelledby="home-now-title">
        <div className="wrap">
          <div className="home-section-heading">
            <span className="eyebrow">MIRA NOW / 此刻</span>
            <h2 id="home-now-title">先看事实，再看愿望。</h2>
            <p>
              当前实现、下一步计划和工程记录各自回到它们真正的来源。首页只负责把路指出来。
            </p>
          </div>
          <div className="home-now-grid">
            {nowItems.map((item) => (
              <a className="home-now-card" href={item.href} key={item.key}>
                <span>{item.label}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <strong>查看 →</strong>
              </a>
            ))}
          </div>
        </div>
      </section>

      <CoreCapabilities items={capabilityItems} className="home-capabilities" />

      <section className="sitemap-galaxy-home" aria-label="网站地图星图">
        <div className="wrap">
          <SitemapGalaxy
            key={darkMode ? "sitemap-galaxy-dark" : "sitemap-galaxy-light"}
            data={sitemapData}
            theme={darkMode ? "dark" : "light"}
          />
        </div>
      </section>

      <section className="home-video-section" aria-labelledby="home-video-title">
        <div className="wrap">
          <div className="home-section-heading home-section-heading-compact">
            <span className="eyebrow">PRODUCT / 产品</span>
            <h2 id="home-video-title">看看它实际怎样工作。</h2>
          </div>
          <div className="home-video-frame">
            <video
              className="home-product-video"
              controls
              playsInline
              preload="metadata"
              src="https://assets.tomz.io/videos/mira-product-intro-en-final-music.mp4"
            />
          </div>
        </div>
      </section>

      <section className="home-writing-section" aria-labelledby="home-writing-title">
        <div className="wrap">
          <div className="home-section-heading">
            <span className="eyebrow">LATEST / 最近写下的</span>
            <h2 id="home-writing-title">产品不是只在 Release 里发生。</h2>
            <p>这里留下最近的产品判断、工程现场和人与 AI 之间还没有写完的部分。</p>
          </div>
          <div className="home-writing-grid">
            {recentPosts.map((doc) => (
              <article className="home-writing-card" key={doc.path}>
                <div className="home-writing-meta">
                  {doc.date ? <span>{doc.date}</span> : null}
                  <span>{doc.group}</span>
                </div>
                <h3>
                  <Link to={doc.path}>{doc.title}</Link>
                </h3>
                <p>{doc.description}</p>
                <Link className="home-writing-link" to={doc.path}>
                  阅读全文 →
                </Link>
              </article>
            ))}
          </div>
          <Link className="text-link home-writing-more" to="/blogs">
            查看全部文章 →
          </Link>
        </div>
      </section>

      <section className="home-open-section" aria-labelledby="home-open-title">
        <div className="wrap home-open-layout">
          <div>
            <span className="eyebrow">OPEN DEVELOPMENT / 公开开发</span>
            <h2 id="home-open-title">这是一个正在被做出来的产品。</h2>
            <p>
              UIChat Mira 由 Tomz Dang 创建并持续维护。源码、文档与工程判断公开留在 GitHub，Mira 也参与文档、文章与工程讨论。
            </p>
          </div>
          <div className="home-open-links">
            <a href={organizationUrl} target="_blank" rel="noreferrer">
              <GitBranch size={16} aria-hidden="true" />
              uichat-mira Organization
              <ArrowUpRight size={14} aria-hidden="true" />
            </a>
            <a href={desktopRepoUrl} target="_blank" rel="noreferrer">
              <GitBranch size={16} aria-hidden="true" />
              mira-desktop
              <ArrowUpRight size={14} aria-hidden="true" />
            </a>
            <Link to="/about/author">
              项目与维护者
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {footer}
    </div>
  );
}
