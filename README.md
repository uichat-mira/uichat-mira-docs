# UIChat Mira 产品文档

面向 [UIChat Mira](https://github.com/uichat-mira/mira-desktop) 的精选产品文档站。内容依据源码 `dev` 分支整理，覆盖品牌、哲学、产品、架构、工程与当前状态。

- Sites：https://uichat-mira-docs.dangjingtao.chatgpt.site
- GitHub Pages：https://uichat-mira.github.io/uichat-mira-docs/

## 文档结构

Markdown 位于 `docs/<section>/*.md`：

- `about`：品牌、作者、产品地图
- `philosophy`：本地优先、可控自主、证据
- `product`：工作区、知识与评测、角色与微应用
- `architecture`：运行时、Agent、Harness、Provider
- `engineering`：源码、文档系统、开发验证
- `status`：当前实现与方向

站点自动从 frontmatter 生成侧栏与 Sitemap，并以 Ctrl/Command + K 搜索标题、描述和 Markdown 全文。

## 本地开发

```bash
npm install
npm run dev
```

构建验证：

```bash
npm run build
```

## 分支与部署

仓库遵循：

```text
feat/* → dev → test → prod
```

`main` 只保留历史兼容，不作为生产发布旁路。

### GitHub Pages

推送 `prod` 后，`.github/workflows/deploy-pages.yml` 自动执行 `build:github-pages` 并部署。

仓库 Settings → Pages → Source 需要选择 **GitHub Actions**。

GitHub Pages 使用仓库路径 base，因此它保留独立构建，不复用 Cloudflare 的根路径产物。

### Cloudflare Pages

Cloudflare 生产发布由仓库 GitHub Actions + Wrangler Direct Upload 驱动。推送 `prod` 后，`.github/workflows/deploy-cloudflare-pages.yml` 会：

1. 用 `pnpm run build` 构建一次根路径生产站；
2. 将同一份 `dist` 发布到 Pages 项目 `uichat-mira-docs`，分支固定为 `prod`；
3. Cloudflare 部署成功后，从同一构建的 sitemap 提交本次变更 URL 到 Baidu。

Cloudflare Pages 的 **Production branch 必须保持为 `prod`**。现有 Git Integration 如果仍在 Cloudflare UI 中显示，仅视为历史连接信息，不是生产部署真相源，也不应作为第二条自动发布链。

生产 workflow 同时保留 `workflow_dispatch`，用于从 `prod` 做受控重发；非 `prod` 分支不会通过这条 workflow 发布生产。

`dev`、`test` 和 feature 分支保持非生产语义，目前不由本仓库自动发布到 Cloudflare Pages。

Vite 的 base 已兼容 GitHub Pages 项目路径；Cloudflare 使用默认生产构建，因此按根路径部署。
