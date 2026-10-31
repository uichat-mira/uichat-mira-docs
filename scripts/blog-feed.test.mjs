import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateBlogFeed, rssDay, verifyBlogFeed } from "./blog-feed.mjs";

function fixture(base = "") {
  const dir = mkdtempSync(resolve(tmpdir(), "mira-feed-"));
  const root = "https://mira.tomz.io" + base + "/blogs/";
  const records = [
    { category: "engineering", slug: "older", date: "2026年10月29日", headline: "Mira & <Agent>", description: "A & B <code> 意义" },
    { category: "radar", slug: "newer", date: "2026-10-31", headline: "较新的文章", description: "新的一天" },
  ];
  const links = records.map((r) => root + r.category + "/" + r.slug + "/");
  const sitemap = [root, ...links].map((link) => "<url><loc>" + link + "</loc></url>").join("");
  writeFileSync(resolve(dir, "sitemap.xml"), "<urlset>" + sitemap + "</urlset>");
  records.forEach((r, i) => {
    const folder = resolve(dir, "blogs", r.category, r.slug);
    mkdirSync(folder, { recursive: true });
    const ld = { "@context": "https://schema.org", "@type": "Article", url: links[i], headline: r.headline, datePublished: r.date, description: r.description };
    writeFileSync(resolve(folder, "index.html"), '<script type="application/ld+json">' + JSON.stringify(ld) + "</script>");
  });
  return { dir, links };
}

test("RSS calendar dates reject impossible and missing dates", () => {
  assert.equal(rssDay("2026年10月29日").toUTCString(), "Thu, 29 Oct 2026 00:00:00 GMT");
  assert.equal(rssDay("2026-10-29").getTime(), rssDay("2026年10月29日").getTime());
  assert.throws(() => rssDay("2026年2月30日"), /Invalid/);
  assert.throws(() => rssDay("unknown"), /Unrecognized/);
});

for (const base of ["", "/uichat-mira-docs"]) {
  test("RSS covers, orders and escapes every sitemap blog for base " + (base || "/"), () => {
    const { dir, links } = fixture(base);
    try {
      const generated = generateBlogFeed(dir);
      assert.equal(generated.count, 2);
      assert.equal(verifyBlogFeed(dir).count, 2);
      const rss = readFileSync(resolve(dir, "blogs", "feed.xml"), "utf8");
      assert.match(rss, /<rss version="2.0">/);
      assert.equal((rss.match(/<item>/g) || []).length, 2);
      assert.ok(rss.indexOf(links[1]) < rss.indexOf(links[0]), "newest published calendar day first");
      assert.match(rss, /<title>Mira &amp; &lt;Agent&gt;<\/title>/);
      assert.match(rss, /<description>A &amp; B &lt;code&gt; 意义<\/description>/);
      assert.match(rss, /<pubDate>Thu, 29 Oct 2026 00:00:00 GMT<\/pubDate>/);
      assert.ok(rss.includes("<link>" + links[1] + "</link>"));
      writeFileSync(resolve(dir, "blogs", "feed.xml"), rss.replace("较新的文章", "被篡改"));
      assert.throws(() => verifyBlogFeed(dir), /differs/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

test("RSS fails closed for missing published JSON-LD", () => {
  const { dir } = fixture();
  try {
    const page = resolve(dir, "blogs", "engineering", "older", "index.html");
    writeFileSync(page, "<html><body>no JSON-LD</body></html>");
    assert.throws(() => generateBlogFeed(dir), /Missing Article JSON-LD/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
