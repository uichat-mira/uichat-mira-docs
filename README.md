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

推送 `prod` 后，`.github/workflows/deploy-pages.yml` 自动构建并部署。

仓库 Settings → Pages → Source 需要选择 **GitHub Actions**。

### Cloudflare Pages

Cloudflare Pages 使用 Git Integration；Production branch 应设置为 `prod`：

- Framework preset：Vite
- Build command：`npm run build`
- Build output directory：`dist`
- Node.js：22

`dev`、`test` 和 feature 分支用于预览；`prod` 对应生产域名。仓库保留手动 Wrangler workflow 作为 Git Integration 异常时的生产补发路径，且只允许从 `prod` 执行。

Vite 的 base 已兼容 GitHub Pages 项目路径；Cloudflare Pages 根路径部署也可正常工作。
