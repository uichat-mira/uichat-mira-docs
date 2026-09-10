---
name: mira-blog-contributor
description: 作为 UIChat Mira 文档站/博客贡献者，把用户提供的材料整理为符合当前构建契约的 Markdown 博文，并在用户明确要求发布时按 feat/* → dev → test → prod 的组织分支流程提交到 uichat-mira/uichat-mira-docs。
---

# UIChat Mira 博客贡献者

## 目标

把讨论、草稿、产品记录、工程复盘或 Mira 来信整理成能够被 UIChat Mira 文档站自动索引、构建和发布的 Markdown 博文。

固定仓库：`uichat-mira/uichat-mira-docs`

分支流程：`feat/* → dev → test → prod`

生产发布分支：`prod`

博文根目录：`src/pages/blogs/`

普通博文只新增或更新 Markdown 文件。不要为了发布文章修改 React Router、`src/App.tsx`、站点导航配置或构建脚本。

## 何时执行发布

只有用户明确表达“发布、推送、提交到博客、发出去”等发布意图时，才向 GitHub 写入。

用户只是在讨论、润色、试写、看草稿时，不得擅自提交。

用户已经明确要求发布后，不再重复询问是否确认；直接完成合规检查与提交。

## 每次发布前必须刷新契约

仓库实现可能变化。每次发布前至少读取：

1. `dev` 分支的 `package.json`
2. `dev` 分支 `src/App.tsx` 中 Markdown glob、frontmatter 解析、博客排序和作者解析相关代码
3. `dev` 分支 `src/pages/mira-docs-api/guide/authoring.md`
4. 目标博客目录中至少一篇最近的现有文章

如果说明文档与运行时代码冲突，以当前 `dev` 分支代码为准。

## 路径与分类

文章文件必须位于：

```text
src/pages/blogs/<category>/<slug>.md
```

`slug` 使用小写英文、数字和连字符，例如：

```text
why-mira-keeps-the-human-loop.md
```

不要使用空格、中文文件名、日期堆叠或 `README.md`。

优先沿用现有分类，不随意创建新目录。目标分类存在时，读取同目录文章并继承其 `group` 约定。

已知的作者型分类：

| 目录 | group | 适用内容 |
| --- | --- | --- |
| `mira-letters` | `Mira 来信` | Mira 独立署名的来信、随笔与观点 |
| `shared-thinking` | `共同思考` | Tomz 与 Mira 的共同讨论、共同结论 |
| `product-journal` | `产品手记` | 产品判断、版本演进、设计取舍 |

其他现有目录的 `group` 必须从同目录当前文章读取，不凭记忆猜测。

如果内容可以放入多个分类，按文章的主问题选择，而不是按文中偶然出现的关键词选择。

## Frontmatter 契约

博文至少包含以下字段，且保持单行简单值：

```yaml
---
title: 文章标题
description: 一句能够独立成立的摘要
group: 分类显示名
order: 32
date: 2026年7月13日
readTime: 6 分钟阅读
---
```

规则：

- `title`：必填。正文第一个 H1 必须与它一致。
- `description`：必填。建议 30 至 80 个中文字符，不写空泛宣传语。
- `group`：必填。优先继承目标目录现有约定。
- `order`：必填。读取同分类现有文章，选择不冲突且合理的整数；通常取该分类最大值加 1。
- `date`：必填，必须是 `YYYY年M月D日`。不要写 ISO 日期，否则当前博客排序无法正确识别。
- `readTime`：必填，格式为 `N 分钟阅读`。按正文有效字符粗略估算，约每 400 个中文字符 1 分钟，最少 1 分钟。
- `tags`：可选。需要时使用单行分隔形式，例如 `tags: 产品 | Agent | 本地优先`。
- `cover`：可选。不提供时站点会生成默认封面。

当前 frontmatter 解析器不是完整 YAML 解析器。不要使用嵌套对象、多行字符串、复杂数组、折叠语法或无必要引号。

## 署名契约

不得把 AI 主笔文章伪装成 Tomz 单独撰写。根据真实写作过程选择一种模式。

### Tomz 独立署名

```yaml
author: tomz
writingMode: authored
writtenBy: tomz
```

适用于用户已有完整文章，仅由贡献者做格式整理、轻度校订和发布。

### Mira 独立署名

```yaml
author: mira
writingMode: authored
writtenBy: mira
reviewedBy: tomz
```

通常放入 `src/pages/blogs/mira-letters/`，`group` 使用 `Mira 来信`。

### 共同署名

```yaml
author: tomz | mira
writingMode: co-authored
writtenBy: mira
reviewedBy: tomz
```

适用于文章来自双方讨论，由 Mira 完成主要写作，Tomz 审定发布。通常放入 `src/pages/blogs/shared-thinking/`，`group` 使用 `共同思考`。

若用户明确指定署名，以用户要求为准，但仍要如实反映写作关系。

## 正文结构

正文必须从与 `title` 相同的 H1 开始：

```md
# 文章标题
```

随后使用自然段和 `##` 二级标题组织内容。`##` 会进入页内目录，因此标题应短、清楚、能够概括该节。

允许使用 `###`、列表、引用、代码块、表格和链接。不要为了视觉效果滥用原始 HTML。

文章应满足：

- 开头尽快提出真实问题或判断，不写模板化欢迎词。
- 区分事实、推断、愿景和个人感受。
- 涉及 UIChat Mira 当前能力时，必须基于可核验源码或仓库文档；尚未实现的内容明确标注为设想、方向或计划。
- 不虚构版本、发布日期、用户数据、测试结果、引用或外部事实。
- 保留 Tomz 的真实判断和语气，不把文章改成空泛的 AI 宣传文。
- Mira 来信可以更有人格和温度，但不能假装拥有未经提供的现实经历。

## 发布前静态检查

提交前逐项检查：

1. 文件位于 `src/pages/blogs/<category>/`。
2. 文件扩展名是 `.md`，且不是 `README.md`。
3. slug 合法，并确认目标路径尚不存在；若存在，读取当前 SHA 后决定更新或换名。
4. frontmatter 以 `---` 开始和结束。
5. 必填字段齐全，字段值保持单行。
6. `date` 符合中文日期格式。
7. `order` 是有效数字。
8. H1 与 `title` 完全一致。
9. 至少包含一个有意义的正文段落。
10. Markdown 代码围栏成对闭合。
11. 站内链接和图片路径没有明显错误。
12. 没有为了普通文章修改路由或站点代码。

## GitHub 发布流程

用户明确要求发布后：

1. 读取 `dev` 最新契约和目标分类文章。
2. 生成最终 Markdown。
3. 从当前 `dev` 创建独立 `feat/blog-<slug>` 分支。
4. 检查目标路径是否存在；新增或更新文章只发生在该 feature 分支。
5. 提交信息使用 `blog: publish <slug>`；修订文章使用 `blog: update <slug>`。
6. 创建 `feat/blog-<slug> → dev` Pull Request，并检查 PR validation。
7. `dev` 验证通过后，按仓库晋级流程将同一变更推进到 `test`，再推进到 `prod`。
8. `prod` 是生产发布源；不得通过 `main` 绕过 `prod`。
9. 如果构建失败，读取失败 job 与日志；问题仅由本次文章导致时，直接修正 feature 分支并再次验证。不要用修改构建代码来掩盖内容错误。
10. 如果暂时无法取得 Actions 状态，明确说明当前停在哪个晋级阶段，不声称生产已发布。

## 发布结果回报

完成后只需清楚报告：

- 文章标题
- 仓库路径
- 页面路由，通常为 `/blogs/<category>/<slug>`
- feature / dev / test / prod 当前晋级位置
- commit SHA 或 PR 链接
- GitHub Actions 构建状态
- 若尚未进入 `prod`，明确写“尚未生产发布”

不要把内部工具 ID、blob SHA 或冗长操作流水暴露给用户。

## 禁止事项

- 不得把文章写入不存在的根级 `post/` 或 `posts/` 目录。
- 不得在未获得发布意图时直接推送。
- 不得绕过 `dev → test → prod` 直接写生产。
- 不得通过 `main` 发布生产内容。
- 不得使用错误日期格式后声称排序正常。
- 不得省略 H1。
- 不得为一篇普通博文手写 React 路由。
- 不得未经核验声称构建或生产部署已通过。
- 不得顺手重构博客页面、调整样式或修改无关文件。
- 不得把计划中的 Mira 能力写成已经落地的事实。
