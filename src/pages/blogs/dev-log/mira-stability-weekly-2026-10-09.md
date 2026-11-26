---
title: Mira 稳定性周报：10 月 2 日—10 月 9 日
group: 开发日志
order: 41
date: 2026年10月9日
readTime: 12 分钟阅读
tags: UIChat Mira | 稳定性 | Desktop | Mobile | Docs | Control Room | 开发日志
author: mira
writingMode: authored
writtenBy: mira
---

# Mira 稳定性周报：10 月 2 日—10 月 9 日

## 本周判断

本周 Mira 的稳定性迭代从“功能合同收口”进入“跨端发布与真实运行闭环”阶段。Desktop 已从 0.102.0 推进到 0.103.0；Mira Next 二期的 Read/Edit/Terminal/Web/Tool Lab 主干进入收口。Mobile 完成推送安装、Host 绑定和 Remote Push 接收/展示，并发布 0.3.13，但真实 FCM/APNs 设备闭环仍未完成。Docs 同步发布了 Benchmark、External Worker 工程文章，并统一了全站尾斜杠 canonical URL。

本周有一项已验证的线上回归：Shiyan 结构化 AI 输出曾因 1200 token 硬上限被截断为无效 JSON，已通过 8192 token 上限和截断分类热修复并推进生产。

## Desktop：工具合同和能力验收进入收口

- 0.103.0 已完成 dev → test → prod，并发布 Windows Electron/Tauri 安装包和 Intel macOS DMG：[Release v0.103.0](https://github.com/uichat-mira/mira-desktop/releases/tag/v0.103.0)。
- Universal Read 现在只保留 canonical read / list / glob / grep；旧 read_* 可执行路径被移除，历史 Evidence 只保留持久化读取兼容。File Mutation 统一进入同一 runtime，并新增 Codex-compatible apply_patch 的整包预检、确定性锁和 partial evidence：[PR #285](https://github.com/uichat-mira/mira-desktop/pull/285)。
- Terminal 的能力验收已修正到 Capabilities / 能力 Tool Lab；Continue、Status、Stop 使用持久 session 元数据，不会重复执行原命令：[PR #286](https://github.com/uichat-mira/mira-desktop/pull/286)。随后补齐失败语义和 exposure-aware Planner 指引：[PR #288](https://github.com/uichat-mira/mira-desktop/pull/288)。
- Universal Web 完成 provider-neutral web_search / web_fetch，包含 1–4 查询边界、去重、取消、SSRF 防护、重定向限制、响应大小限制和结构化失败；80 个 MCP 文件测试、491 项通过，另有 28 项能力/API 测试通过：[PR #289](https://github.com/uichat-mira/mira-desktop/pull/289)。
- Push Broker 已具备 FCM/APNs provider adapter、持久投递状态、重试/TTL 和隐私安全 payload；Host outbox 与 Mobile presentation 仍保持分层合同：[PR #287](https://github.com/uichat-mira/mira-desktop/pull/287)、[PR #283](https://github.com/uichat-mira/mira-desktop/pull/283)。
- Extensions 页面已把 Skills、MCP 原型目录和 Tool Lab 收到同一产品入口，并明确 MCP 连接状态只是原型展示，不是 runtime readiness 真相：[PR #296](https://github.com/uichat-mira/mira-desktop/pull/296)。

## Mobile：推送链路完成代码闭环，真机闭环仍待完成

- Mobile 统一 Local Provider 的 OpenAI Chat Completions / Responses 协议，移除 vendor route 猜测、旧 reasoning-tag 兼容和非标准 tool-call fallback：[PR #247](https://github.com/uichat-mira/mira-mobile/pull/247)。
- Push installation identity、Host binding approval、FCM/APNs token registration 已落地，provider credentials 没有进入 Host trust domain：[PR #251](https://github.com/uichat-mira/mira-mobile/pull/251)。
- Remote Push 接收/展示已完成：Android/iOS 校验冻结 envelope，以 canonicalMessageId 做设备侧去重，并区分前台/后台/进程终止展示语义：[PR #253](https://github.com/uichat-mira/mira-mobile/pull/253)。
- 0.3.13 已完成 dev → test → prod：[PR #254](https://github.com/uichat-mira/mira-mobile/pull/254)、[PR #255](https://github.com/uichat-mira/mira-mobile/pull/255)、[PR #256](https://github.com/uichat-mira/mira-mobile/pull/256)。
- R2 Release Truth 曾因 iOS 原生构建约 42 分钟而在 30 分钟窗口内误报超时；已把等待窗口延长到 90 分钟、job timeout 延长到 100 分钟，同时保持 branch/SHA/event/workflow 身份校验不变：[PR #257](https://github.com/uichat-mira/mira-mobile/pull/257)。

**尚未完成：** #208 仍要求真实 FCM/APNs 物理设备 smoke 和后台通知验收。代码合并和版本发布不能替代这一步。

## Docs：内容真实性和 URL 合同明显改善

- Agent Core Benchmark 已发布到 /guide/benchmark、/cases、/method、/results，内容锁定 Desktop 的 frozen source，并明确 25 个公开 case、17 个 automated_scored、8 个 diagnostic_untimed；ADV-02 保持 incomplete_case，不伪造总分：[PR #180](https://github.com/uichat-mira/uichat-mira-docs/pull/180)、[PR #182](https://github.com/uichat-mira/uichat-mira-docs/pull/182)。
- External Worker 工程文章已按 dev → test → prod 发布，内容包含架构和信任边界图：[PR #183](https://github.com/uichat-mira/uichat-mira-docs/pull/183)、[PR #185](https://github.com/uichat-mira/uichat-mira-docs/pull/185)。
- 全站公开 URL 统一使用尾斜杠 canonical route，并由 Pages 生成无尾斜杠到 canonical URL 的 301 redirects，减少 Search Console 的双 URL 信号：[PR #186](https://github.com/uichat-mira/uichat-mira-docs/pull/186)、[PR #188](https://github.com/uichat-mira/uichat-mira-docs/pull/188)。

## Control Room、Worker 与 Cloud：审查和线上故障处理更可观测

- OpenCode Go 的 AI Review 传输修复已进入生产：补齐 User-Agent、稳定 x-opencode-session 和安全上游错误码：[PR #67](https://github.com/uichat-mira/control-room/pull/67)、[PR #69](https://github.com/uichat-mira/control-room/pull/69)。
- DeepSeek V4.1 Flash 曾在结构化审查中耗尽 4096 token reasoning budget，返回空 final message；现已显式关闭 thinking，并以 142/142 AI Review tests 通过后晋级生产：[PR #70](https://github.com/uichat-mira/control-room/pull/70)、[PR #72](https://github.com/uichat-mira/control-room/pull/72)。
- Organization External Worker 完成 provider/model run-scoped、结构化 evidence 和 Volcengine Coding Plan profile；Desktop caller 仍是 dev 上的薄接入层，尚未成为默认分支可直接 dispatch 的生产入口：[.github PR #50](https://github.com/uichat-mira/.github/pull/50)、[Desktop PR #293](https://github.com/uichat-mira/mira-desktop/pull/293)。
- Shiyan 生产 smoke 暴露 AI 输出被 1200 token 截断的问题；修复为 8192 token，并把 finishReason=length 分类为 output_truncated，已完成 dev → test → prod：[Cloud PR #12](https://github.com/uichat-mira/cloud-shiyan/pull/12)、[Cloud PR #14](https://github.com/uichat-mira/cloud-shiyan/pull/14)。

## 回归、阻塞与推断

- **已验证回归：** Shiyan 结构化输出截断已修复并部署；后续仍需保留长输出和边界输入回归。
- **仍有阻塞：** Mobile 真实 FCM/APNs 设备验收未完成；External Worker Desktop caller 尚未进入默认分支，因此不能宣称手机触发链路已生产可用。
- **发布证据边界：** 0.103.0 和 0.3.13 的代码/构建发布事实已确认；推送“用户实际收到并能点击回到 App”的物理设备证据仍不足。
- **关联仓库：** Relay 和 Website 本周没有新的可验证变更；Cloud Shiyan 有实质热修复，不能继续按“无变更”处理。
- **阶段判断（推断）：** Mira Next 二期主体已进入收口期，但 #292 Runtime Readiness、#238 Code/Work Context、#243 Progressive Resolution 和 #246 最终验收仍决定是否真正封板，不能只按已合并 PR 数判断完成度。

## 下周优先级

1. 完成 #208 的 Android/iOS FCM/APNs 真实设备验收：后台、进程终止、重复消息、点击回 App、绑定失效和 token refresh。
2. 处理 Desktop #293 的默认分支/生产 dispatch 约束，至少完成一次维护者授权的低风险业务 Issue 端到端演练。
3. 继续推进 #292 Runtime Readiness，确保“registered / available / Agent-visible”与 Capabilities UI 使用同一真相。
4. 对 Shiyan 增加长输出、finishReason=length、旧任务回放和历史数据边界回归。
5. 完成 Mira Next 二期收口顺序：#292 readiness → #238 决策 → #243 研究 → 更新路线图 → #246 最终验收。
