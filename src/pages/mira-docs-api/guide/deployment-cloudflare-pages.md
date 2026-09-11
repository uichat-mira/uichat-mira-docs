---
title: 部署到 Cloudflare Pages
description: 使用 GitHub Actions 与 Wrangler Direct Upload 发布 Mira Docs 生产站。
group: 部署
order: 9
---

# 部署到 Cloudflare Pages

UIChat Mira 文档站通过仓库 GitHub Actions 构建，并使用 Wrangler Direct Upload 发布到既有 Cloudflare Pages 项目。仓库遵循统一晋级链：

```text
feat/* → dev → test → prod
```

## 生产部署

生产合同保持：

```text
Source branch: prod
Cloudflare Pages project: uichat-mira-docs
Cloudflare Production branch: prod
Build command: pnpm run build
Build output: dist
Node.js: 22
Publisher: GitHub Actions + Wrangler Direct Upload
```

只有 `prod` 对应生产域名。`main` 可以作为历史兼容分支保留，但不得绕过 `prod` 发布生产。

推送 `prod` 后，`.github/workflows/deploy-cloudflare-pages.yml` 自动执行生产发布。它只构建一次根路径生产产物，然后：

1. 将 `dist` 通过 `wrangler pages deploy ... --project-name=uichat-mira-docs --branch=prod` 发布到 Cloudflare Pages；
2. Cloudflare 发布成功后，使用同一份构建中的 sitemap 生成本次变更 URL，并提交到 Baidu。

workflow 同时保留 `workflow_dispatch`，用于从 `prod` 做受控重发。非 `prod` ref 即使人工触发，也不会执行生产 jobs。

Cloudflare 控制台中的 **Production branch 必须保持为 `prod`**。如果历史 Git Integration 仍显示旧连接，它不是当前生产部署的真相源，也不应重新启用为第二条自动发布链。

站点构建只验证本站内容与构建契约，不依赖 Desktop `dev` 的实时版本。博客、文档、下载页和其他站点内容不能因为开发分支继续前进而被阻断发布。

## 当前实现快照巡检

`src/pages/docs/status/current.md` 记录一次明确时间点上的实现快照。仓库保留 `verify:current-status` 用于检查它是否已经落后于 Desktop `dev`。

这项检查属于独立巡检：

- 定时或人工触发时可以失败并提醒维护者更新快照；
- 不进入 `pnpm run build`；
- 不作为 Cloudflare Pages 或 GitHub Pages 的发布前置条件；
- 不影响 Release、R2 下载链接或其他与开发快照无关的内容发布。

## 非生产分支

`feat/*`、`dev`、`test` 保持各自的变更、集成和验收语义，但当前仓库不依赖 Cloudflare Git Integration 为这些分支自动生成 Pages 预览。

如果以后需要恢复 Cloudflare preview，应单独定义非生产部署合同，不能让 preview 机制重新获得生产域名发布权，也不能与 `prod` 的 Direct Upload 自动发布竞争。

## 构建差异

Cloudflare 生产 workflow 执行默认 `pnpm run build`，因此 Vite 使用根路径产物。GitHub Pages 则独立执行 `build:github-pages`，因为它需要仓库路径 base。

Vite 配置仍保留对 `CF_PAGES=1` 的兼容处理，但该环境变量不是当前 GitHub Actions + Wrangler 生产链的必要条件。

MiraDocs 静态构建仍会生成：

- 路由目录下的 `index.html`
- `404.html`
- `sitemap.xml`
- `robots.txt`
- canonical、社交元数据与 JSON-LD

因此当前产物不是“只有一个 index.html 的纯 SPA”；React 会在静态 HTML 之后继续接管交互。

## 手动重发

需要补发生产时，在 `prod` 上人工触发同一个 **Publish Docs production** workflow。它走与自动生产发布完全相同的 build、Cloudflare project、branch 和 secrets 合同，不维护第二套发布实现。

不要通过重新连接 GitHub App、创建第二个 Pages 项目、切换 DNS 或重新启用旧 Git Integration 来完成普通补发。

## 发布前验证

```bash
pnpm install --frozen-lockfile
pnpm run build
```

GitHub Pages 候选另行使用：

```bash
pnpm run build:github-pages
EXPECTED_BASE=uichat-mira-docs pnpm run verify:static-output
```

生产发布后再检查首页、深层文档、博客详情、搜索、主题切换、PWA 和分享元数据。成功执行 deploy command 只证明发布动作完成，不替代生产 smoke。
