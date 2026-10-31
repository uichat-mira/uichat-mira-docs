import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = resolve(process.cwd(), "dist");
const xmlEscape = (value) =>
  String(value ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

// Article JSON-LD contains calendar dates, not publication times. 00:00 GMT
// is a stable RSS date encoding; it is not a claim about publication time.
export function rssDay(datePublished) {
  const value = String(datePublished ?? "").trim();
  const match = /^(\d{4})(?:年|-|\/)(\d{1,2})(?:月|-|\/)(\d{1,2})日?$/.exec(value);
  if (!match) throw new Error("Unrecognized article datePublished: " + (value || "(missing)"));
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const instant = new Date(Date.UTC(year, month - 1, day));
  if (instant.getUTCFullYear() !== year ||
      instant.getUTCMonth() + 1 !== month ||
      instant.getUTCDate() !== day) {
    throw new Error("Invalid article datePublished: " + value);
  }
  return instant;
}

function sitemapUrls(distRoot) {
  const path = resolve(distRoot, "sitemap.xml");
  if (!existsSync(path)) throw new Error("Cannot build blog feed: dist/sitemap.xml is missing");
  const xml = readFileSync(path, "utf8");
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => new URL(match[1].replace(/&amp;/g, "&")));
  if (!urls.length) throw new Error("Cannot build blog feed: sitemap has no URLs");
  return urls;
}

function jsonLdArticle(html, url) {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  const nodes = [];
  for (const [, attrs, body] of scripts) {
    if (!/\btype\s*=\s*["']application\/ld\+json["']/i.test(attrs)) continue;
    let value;
    try {
      value = JSON.parse(body);
    } catch {
      throw new Error("Invalid JSON-LD in " + url);
    }
    const queue = Array.isArray(value) ? value : [value];
    for (const item of queue) {
      if (Array.isArray(item?.["@graph"])) nodes.push(...item["@graph"]);
      else nodes.push(item);
    }
  }
  const article = nodes.find((node) => {
    const types = node?.["@type"];
    return (Array.isArray(types) ? types : [types]).includes("Article");
  });
  if (!article) throw new Error("Missing Article JSON-LD in " + url);
  return article;
}

export function readBlogArticles(distRoot = siteRoot) {
  const urls = sitemapUrls(distRoot);
  const blogRoot = urls.find((url) => /\/blogs\/$/.test(url.pathname));
  if (!blogRoot) throw new Error("Cannot build blog feed: sitemap has no /blogs/ index");
  const articleUrls = urls.filter((url) =>
    url.origin === blogRoot.origin &&
    url.href !== blogRoot.href &&
    url.pathname.startsWith(blogRoot.pathname)
  );
  if (!articleUrls.length) throw new Error("Cannot build blog feed: no published blog routes");

  const articles = articleUrls.map((url) => {
    const suffix = decodeURIComponent(url.pathname.slice(blogRoot.pathname.length));
    const parts = suffix.split("/").filter(Boolean);
    if (!url.pathname.endsWith("/") ||
        parts.length < 2 ||
        parts.some((part) => part === "." || part === ".." || part.includes("\\"))) {
      throw new Error("Unexpected blog route in sitemap: " + url.href);
    }
    const path = resolve(distRoot, "blogs", ...parts, "index.html");
    if (!existsSync(path)) throw new Error("Blog static article missing: " + url.href + " (" + path + ")");
    const data = jsonLdArticle(readFileSync(path, "utf8"), url.href);
    const declaredUrl = new URL(String(data.url ?? ""), blogRoot);
    if (declaredUrl.origin !== url.origin ||
        declaredUrl.pathname.replace(/\/$/, "") !== url.pathname.replace(/\/$/, "")) {
      throw new Error("Blog JSON-LD URL differs from sitemap: " + url.href + " (" + data.url + ")");
    }
    if (!data.headline || !data.datePublished) {
      throw new Error("Blog article lacks title or datePublished: " + url.href);
    }
    return {
      title: String(data.headline),
      url: url.href,
      datePublished: String(data.datePublished),
      day: rssDay(data.datePublished),
      description: String(data.description ?? ""),
      category: parts[0],
    };
  });
  articles.sort((a, b) => b.day.getTime() - a.day.getTime() || a.url.localeCompare(b.url));
  return { blogRoot: blogRoot.href, articles };
}

export function renderBlogFeed({ blogRoot, articles }) {
  const items = articles.map((article) => {
    const description = [...article.description.trim()].slice(0, 120).join("");
    return [
      "    <item>",
      "      <title>" + xmlEscape(article.title) + "</title>",
      "      <link>" + xmlEscape(article.url) + "</link>",
      '      <guid isPermaLink="true">' + xmlEscape(article.url) + "</guid>",
      "      <pubDate>" + article.day.toUTCString() + "</pubDate>",
      "      <description>" + xmlEscape(description) + "</description>",
      "      <category>" + xmlEscape(article.category) + "</category>",
      "    </item>",
    ].join("\n");
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "  <channel>",
    "    <title>UIChat Mira 博客</title>",
    "    <link>" + xmlEscape(blogRoot) + "</link>",
    "    <description>UIChat Mira 的工程、产品与 Agent 实践</description>",
    "    <language>zh-CN</language>",
    ...items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}

export function generateBlogFeed(distRoot = siteRoot) {
  const data = readBlogArticles(distRoot);
  const path = resolve(distRoot, "blogs", "feed.xml");
  mkdirSync(resolve(distRoot, "blogs"), { recursive: true });
  writeFileSync(path, renderBlogFeed(data), "utf8");
  return { path, count: data.articles.length };
}

export function verifyBlogFeed(distRoot = siteRoot) {
  const path = resolve(distRoot, "blogs", "feed.xml");
  if (!existsSync(path)) throw new Error("Blog RSS feed is missing: dist/blogs/feed.xml");
  // Rebuild from JSON-LD / sitemap to validate count, links, dates, ordering,
  // and summaries without maintaining a second article index.
  const data = readBlogArticles(distRoot);
  if (readFileSync(path, "utf8") !== renderBlogFeed(data)) {
    throw new Error("Blog RSS feed differs from its sitemap / Article JSON-LD source");
  }
  return { path, count: data.articles.length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const command = process.argv[2];
  if (command !== "generate" && command !== "verify") {
    throw new Error("Usage: node scripts/blog-feed.mjs generate|verify");
  }
  const result = command === "generate" ? generateBlogFeed() : verifyBlogFeed();
  console.log("Blog RSS " + command + ": " + result.count + " published articles (" + result.path + ")");
}
