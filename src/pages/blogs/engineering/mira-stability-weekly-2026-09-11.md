---
title: Mira 稳定性周报：从个人仓库走进组织工程
description: 记录 2026 年 9 月 4 日至 11 日 UIChat Mira 的稳定性迭代：Organization 迁移、Mobile 双链路、远程 Agent、Control Room，以及仍未闭环的 Relay 与拾言问题。
group: 工程现场
order: 32
date: 2026年9月11日
readTime: 10 分钟阅读
tags: UIChat Mira | 稳定性 | Mobile | Desktop | Agent | Control Room | 工程现场
author: tomz
---

这一周，Mira 完成了从“几个个人仓库”向 Organization 工程体系的实质迁移，同时 Mobile 双链路与远程 Agent 闭环明显向前走了一步。稳定性风险没有消失，但它们开始被统一的分支、文档、诊断与中控面承接。

这不是一份提交数量统计。下面只记录能够由仓库、PR、Issue 或验收材料支持的变化，并把事实、推断和未完成事项分开。

## 本周结论

Desktop、Mobile、Docs 与 Relay 已经迁入 `uichat-mira` Organization。Desktop 和 Docs 完成了迁移后的生产分支验证；Mobile 本地模型链路补齐了会话、流式协议和凭证编辑的稳定性缺口；Mobile 与 Desktop 之间则完成了远程工具调用、手机审批和 Host 持久 Agent Run 的第一轮合同闭环。

与此同时，Relay 长时间假离线、拾言列表与详情状态分裂仍未解决。新的 Review Gateway 已经具备可信输入和确定性输出基础，但真实模型 Provider 与 GitHub 发布器尚未启用。

## 已验证的进展

### 仓库迁移开始成为真实工程结构

Desktop、Mobile、Docs 与 Relay 已迁入新的 Organization。Desktop 在迁移后完成 test 构建验证并推进至 prod，相关分支树保持一致，见 [Desktop PR #131](https://github.com/uichat-mira/mira-desktop/pull/131)。

Docs 建立了 `feat/* → dev → test → prod` 的发布链。GitHub Pages、Cloudflare 生产部署以及生产 URL 提交都被限制在 `prod`，见 [Docs PR #39](https://github.com/uichat-mira/uichat-mira-docs/pull/39) 与 [prod 晋级 PR #41](https://github.com/uichat-mira/uichat-mira-docs/pull/41)。

Relay 的部署也改为仓库自包含，并采用同一套四级环境模型。这减少了迁仓后继续依赖个人仓库上下文的风险，见 [部署整改提交](https://github.com/uichat-mira/uichat-mira-relay/commit/cc0dc57d4772f31f73e4e853b20275c7c1843a5e)。

### Mobile 本地模型链路完成一轮收口

本地会话现在可以被正确删除，且不会误向 Remote Host 发出删除请求；删除失败时仍保留会话并显示错误，见 [Mobile PR #99](https://github.com/uichat-mira/mira-mobile/pull/99)。

OpenAI-compatible 流式链路修复了三类兼容性问题：Base URL 不再重复拼接 `/v1`，`[DONE]` 不再覆盖已有的 `finish_reason`，并行 Tool Call 会按协议中的 `index` 聚合，见 [Mobile PR #100](https://github.com/uichat-mira/mira-mobile/pull/100)。

Provider 凭证编辑也取消了 `********` 哨兵文本。已有 API Key 不会进入可编辑字段，普通配置保存不会覆盖旧凭证，切换 Provider 时过期的异步读取也不能再污染当前状态，见 [Mobile PR #101](https://github.com/uichat-mira/mira-mobile/pull/101)。

### 远程工具与持久 Agent 初步闭环

Host 只向 Mobile 投影 Agent 实际可见的 Harness 工具，不暴露原始 MCP 配置、Provider Key 或 Host 凭证。工具的发现、调用、审批和取消仍由 Host 掌握权威执行，见 [Desktop PR #117](https://github.com/uichat-mira/mira-desktop/pull/117) 与 [Mobile PR #103](https://github.com/uichat-mira/mira-mobile/pull/103)。

Mobile 本地 Agent UI 已经接入原有 ChatScreen，而不是再造第二套聊天界面。它能展示工具运行、等待审批、批准、拒绝、暂停、超时与取消状态，见 [Mobile PR #104](https://github.com/uichat-mira/mira-mobile/pull/104)。

Host Agent Run 也不再依赖手机 SSE 是否一直在线。Host 持久化 `runId`、执行节点与终态，Mobile 回到前台后可以从 canonical message 重新发现并观察运行，见 [Desktop PR #118](https://github.com/uichat-mira/mira-desktop/pull/118) 与 [Mobile PR #105](https://github.com/uichat-mira/mira-mobile/pull/105)。

后续审查又修复了 late cancel、后继消息保护、SubAgent 取消传播与 execution lease 问题，见 [Desktop PR #119](https://github.com/uichat-mira/mira-desktop/pull/119) 和 [PR #120](https://github.com/uichat-mira/mira-desktop/pull/120)。这些属于既有合同内的正确性修补，没有重新打开已经稳定的 T30–T33 主循环。

## 可观测性与 Review 基础设施

新的 [Mira Control Room](https://github.com/uichat-mira/control-room) 已经能够汇集 GitHub 治理、Cloudflare 24 小时流量与错误、运行状态缓存，并通过公开只读 API/MCP 提供这些投影。

它对上游异常采用“保留旧数据并明确标记降级”的策略，不再让一次 GitHub 或 Cloudflare 读取失败把整个组织误判为故障。

AI Review Gateway 已经具备可信快照、确定性渲染、陈旧审查识别、调用凭证隔离以及 Provider 输入/输出预算，见 [Control Room PR #13](https://github.com/uichat-mira/control-room/pull/13) 和 [PR #17](https://github.com/uichat-mira/control-room/pull/17)。

这里需要明确边界：真实模型 Provider 和 GitHub 写入发布器尚未启用，Mobile 试点也仍然开放，见 [Control Room #15](https://github.com/uichat-mira/control-room/issues/15) 与 [Mobile #109](https://github.com/uichat-mira/mira-mobile/issues/109)。因此它目前是可验证的基础设施，还不是完整的自动审查闭环。

## 尚未闭环的问题

### Relay 长时间假离线

[Mobile Issue #34](https://github.com/uichat-mira/mira-mobile/issues/34) 仍然开放。迁仓和部署整理没有替代真实的长连接修复与耐久测试。验收目标依旧应该是：长时间运行不掉线，异常后能够自行恢复，而不是通过增加几次重试掩盖坏状态。

### 拾言状态分裂

[Mobile Issue #95](https://github.com/uichat-mira/mira-mobile/issues/95) 已经恢复为可读的事实源，但对应的 [Shiyan Cloud PR #8](https://github.com/dangjingtao/mira-shiyan-cloud/pull/8) 仍未合并。

已经确认的根因是：保存 Final Draft 时只写入 `drafts`，没有把 `capture_tasks.lifecycle_status` 从 `ready` 推进至 `completed`。Mobile 列表按 lifecycle 渲染，详情则按 Final Draft 是否存在渲染，于是同一个任务同时拥有两张脸。

### Remote 权限语义技术债

[Desktop Issue #82](https://github.com/uichat-mira/mira-desktop/issues/82) 仍然开放。`threads:read` 与 `messages:read` 的隔离并不完整，`messages:write` 与 Agent 执行能力也存在用户理解偏差。

本周新增 `tools:*` 与 `agent:*` 后，这项债务的重要性上升。不过目前没有证据显示已经稳定的 Remote 合同发生回归，因此不应为了“顺便整理”而推翻现有实现。

### 验证缺口

Desktop 的 MOB-043 最后一轮正确性修复明确没有把 CI 作为 merge gate，而是直接审查后合并，见 [PR #120](https://github.com/uichat-mira/mira-desktop/pull/120)。定向回归已经补充，但真实 Mobile → Host 审批、后台恢复、取消竞态仍需要完整真机烟测。

Mobile 迁仓后的 README、AGENTS、CodeRabbit 说明和旧链接清理也仍在 [PR #108](https://github.com/uichat-mira/mira-mobile/pull/108) 中，说明运行时已经搬进新家，门牌和住户手册还没有全部换完。

## 文档准确性

Desktop 的仓库链接、分支指南、包验证与 Windows NSIS-only 产物规则已经同步到 Organization 现实；Docs 也修复了“dev 快照过期阻断官网部署”的错误耦合，并把生产部署真相收束到 `prod`。

本周还发生了一次值得保留的纠错：Control Room Skill 一度被放进 Desktop，随后通过 [回滚 PR #134](https://github.com/uichat-mira/mira-desktop/pull/134) 完整撤回。最终所有权重新明确——Control Room 自己拥有 canonical Skill，Desktop 以后可以消费它，但不拥有它。这次偏差没有留下第二份真相源。

## 下一步

接下来最重要的不是继续铺更多能力，而是让这一周新增的边界经得起真实使用：

1. 为 MOB-041–043 做一次完整双链路验收，覆盖工具发现、批准、拒绝、后台恢复、Host 持续运行和取消竞态。
2. 处理 Relay [Issue #34](https://github.com/uichat-mira/mira-mobile/issues/34)，把耐久连接与自动恢复做成可重复测试。
3. 合并并部署 Shiyan Cloud #8，回填历史任务后关闭 Mobile #95。
4. 合并 Mobile #108，让仓库文档、审查说明与 Organization 现实一致。
5. 完成 Review Gateway 的真实 Provider 烟测后，再开放 GitHub 发布器。先证明预算、超时、fallback 和 stale-review 行为，再让它自动落评论。

Mira 这一周做的事情很多，但真正重要的变化只有一条：工程事实开始有了共同的住址。接下来要证明的，是它们不仅住在一起，也能在出事时找到彼此。
