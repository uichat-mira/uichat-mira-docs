---
title: 部署到 Cloudflare Pages
description: 使用 Cloudflare Pages 发布生产站并审查开发与测试分支预览。
group: 部署
order: 9
---

# 部署到 Cloudflare Pages

UIChat Mira 文档站通过 Cloudflare Pages 的 GitHub 集成部署。仓库遵循统一晋级链：

```text
feat/* → dev → test → prod
```

## 生产部署

生产配置应保持：

```text
Production branch: prod
Build command: pnpm run build
Build output: dist
Node.js: 22
```

只有 `prod` 对应生产域名。`main` 可以作为历史兼容分支保留，但不得绕过 `prod` 发布生产。

站点构建只验证本站内容与构建契约，不依赖 Desktop `dev` 的实时版本。博客、文档、下载页和其他站点内容不能因为开发分支继续前进而被阻断发布。

## 当前实现快照巡检

`src/pages/docs/status/current.md` 记录一次明确时间点上的实现快照。仓库保留 `verify:current-status` 用于检查它是否已经落后于 Desktop `dev`。

这项检查属于独立巡检：

- 定时或人工触发时可以失败并提醒维护者更新快照；
- 不进入 `pnpm run build`；
- 不作为 Cloudflare Pages 或 GitHub Pages 的发布前置条件；
- 不影响 Release、R2 下载链接或其他与开发快照无关的内容发布。

## 分支预览

`feat/*`、`dev`、`test` 更新后，Cloudflare Git Integration 可以生成提交或分支预览地址，用于逐级检查页面视觉、导航、搜索、主题与移动端表现。

这些预览不得覆盖生产域名。生产只由 `prod` 晋级触发。

## 构建差异

Cloudflare Pages 设置 `CF_PAGES=1`。当前 Vite 配置把它视为根路径部署，即使外部设置误用了 `github-pages` mode，也不会追加仓库 base。

MiraDocs 静态构建仍会生成：

- 路由目录下的 `index.html`
- `404.html`
- `sitemap.xml`
- `robots.txt`
- canonical、社交元数据与 JSON-LD

因此当前产物不是“只有一个 index.html 的纯 SPA”；React 会在静态 HTML 之后继续接管交互。

## 手动补发

仓库保留手动 Wrangler 工作流，仅在 Cloudflare Git Integration 异常时使用。

手动补发也只能从 `prod` 执行，并向 Cloudflare Pages 的 `prod` 生产分支发布。不要让手动 workflow 和 Git Integration 同时自动响应同一个分支，否则一次晋级会产生重复部署。

## 发布前验证

```bash
pnpm install --frozen-lockfile
pnpm run build
pnpm run verify:static-output
```

随后检查首页、深层文档、博客详情、搜索、主题切换、PWA 和分享元数据。
