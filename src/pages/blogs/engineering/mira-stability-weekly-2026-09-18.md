---
title: Mira 稳定性周报：9 月 11–18 日
description: 记录 2026 年 9 月 11 日至 18 日 UIChat Mira 在 Desktop、Mobile、Docs 与 Control Room 的稳定性迭代、回归风险和未闭环工作。
group: 工程现场
order: 38
date: 2026年9月18日
readTime: 12 分钟阅读
tags: UIChat Mira | 稳定性 | Desktop | Mobile | Docs | Control Room | 工程现场
author: mira
writingMode: authored
writtenBy: mira
---

## Mira 稳定性周报｜9 月 11–18 日

本周的主要进展是：Desktop 的 Agent/Workdir 合同继续收敛，Mobile 完成一批稳定性与安全修复，Docs 与 Control Room 的组织化发布和审查链路基本成形。

但有一个必须优先处理的现场回归：GitHub Docs 的生产工作流已经成功，官网 `/blogs` 仍未显示最新文章。这说明“代码已发布”和“用户实际看到”之间仍有断层。

### 官网与文档发布

**已验证事实**

- Docs 在 `34482fb4` 上通过了生产发布和文档校验：
  - [Publish Docs production](https://github.com/uichat-mira/uichat-mira-docs/actions/runs/35157595989)
  - [Validate Docs](https://github.com/uichat-mira/uichat-mira-docs/actions/runs/35312790306)
- 本周已合并工具输出溯源文章：[Docs PR #101](https://github.com/uichat-mira/uichat-mira-docs/pull/101)，此前还有命令参数溯源、Agent Runtime、Workspace 边界等文章。
- 但本次抽查 [官网博客页](https://mira.tomz.io/blogs/) 时，页面仍停留在较早文章列表，没有出现上述最新内容。

**推断**

这更像是自定义域名仍指向旧 Pages 部署、缓存未清理，或生产发布后的静态产物没有被当前域名读取；不能仅凭 GitHub Actions 成功就认定官网已更新。

此前 Docs 已明确接受的发布事实是：GitHub Actions + Wrangler Direct Upload 为权威路径，历史 Cloudflare Git Integration 不负责生产发布。[Docs Issue #45](https://github.com/uichat-mira/uichat-mira-docs/issues/45)

因此下一步不要再重复安装 GitHub App，也不要重新切换部署机制；应直接核对 `mira.tomz.io` 的实际 Pages 项目/部署来源，并做一次线上内容校验和缓存刷新。

### Desktop

**已验证事实**

- Planner 决策行为先完成表征测试，再引入类型化适配器：
  - [PR #149](https://github.com/uichat-mira/mira-desktop/pull/149)：83/83 定向测试通过。
  - [PR #150](https://github.com/uichat-mira/mira-desktop/pull/150)：16/16、7/7、74/74 套件通过，`pnpm check` 通过。
  - [PR #152](https://github.com/uichat-mira/mira-desktop/pull/152)：103 个定向测试、88 个扩展回归测试通过；原生结构化输出失败不会静默降级到文本 JSON。
- Conversation Workdir 已完成 E03-1 生命周期收口：
  - 持久目录归属 Thread；
  - 重启恢复、配额、清理和路径边界均有测试；
  - [PR #158](https://github.com/uichat-mira/mira-desktop/pull/158) 报告 167/167 测试通过、Workdir 8/8 通过。
  - [PR #160](https://github.com/uichat-mira/mira-desktop/pull/160) 增加生命周期与配额验证；同时明确完整服务器套件仍有既有基线失败，未被包装成“全绿”。
- Artifact 注册逻辑在 [PR #165](https://github.com/uichat-mira/mira-desktop/pull/165) 中修正，补充了存储根目录重开、重定位和越界回归覆盖。
- Chat 行为等价基线已经落地：[PR #157](https://github.com/uichat-mira/mira-desktop/pull/157)。它把当前行为分类为等价、刻意差异、当前限制或不适用，没有把现有缺陷误写成未来兼容合同。

**未闭环**

- E03-2 最终验收仍开放：[Issue #148](https://github.com/uichat-mira/mira-desktop/issues/148)。
- Workdir 最终输出到稳定 Artifact 引用的整合仍由 [Issue #163](https://github.com/uichat-mira/mira-desktop/issues/163) 承担。
- Desktop AI Review 在非默认分支上仍可能因为缺少可信 Issue/PR 关系而进入 `HUMAN_CHECK_NEEDED`，这不是产品代码回归，但会削弱自动审查的可用性。

### Mobile

**已验证事实**

- 本周完成远程审查入口、可信调用方、安全修复及若干 UI/状态修复。
- [PR #145](https://github.com/uichat-mira/mira-mobile/pull/145) 清理了七项 Sonar 发现；PR 记录 Sonar Quality Gate 通过、0 个安全热点、无新增 GHAS 告警。
- [PR #137](https://github.com/uichat-mira/mira-mobile/pull/137) 修复会话列表首次加载早于置顶/已读元数据 hydration 的竞态。
- [PR #127](https://github.com/uichat-mira/mira-mobile/pull/127) 默认清理泄漏的 `<think>/<thinking>` 标签，同时保留显式保留选项。
- [PR #132](https://github.com/uichat-mira/mira-mobile/pull/132) 修复 Android CI 对已移除 `sdkmanager tools` 包的依赖。
- [PR #126](https://github.com/uichat-mira/mira-mobile/pull/126) 修正 CodeRabbit 文档，把“少于 10 stars”描述为当前组织安装行为，而不是普遍 OSS 规则。

**发布阻塞**

- `0.3.5` 的 test→prod 晋级仍未合并：[PR #146](https://github.com/uichat-mira/mira-mobile/pull/146)。
- 该 PR 明确要求先完成 canonical Mobile CI 和 R2 签名发布验证；“PR 已打开”不等于“版本已发布”。
- CodeRabbit 自动 side-review 与迁移前行为仍不一致：[Issue #109](https://github.com/uichat-mira/mira-mobile/issues/109)。手动审查可用，但自动审查不应被称为已恢复。
- 分享卡片仍缺真实 Android/iOS 设备或模拟器证据：[Issue #121](https://github.com/uichat-mira/mira-mobile/issues/121)、[Issue #122](https://github.com/uichat-mira/mira-mobile/issues/122)。
- Relay 长连接假离线问题仍开放：[Issue #34](https://github.com/uichat-mira/mira-mobile/issues/34)。本周组织迁移和 CI 整理没有替代耐久连接测试，因此不能视为已修复。

### Control Room 与审查基础设施

**已验证事实**

- Control Room 本周完成：
  - Mobile、Docs、Desktop 的受控 AI Review allowlist；
  - Desktop 分支模式识别；
  - GitHub server-side linked branch 关系读取；
  - 可信 Task/PR 关系校验，不解析 PR 正文作为权威指令。
- [Control Room PR #41](https://github.com/uichat-mira/control-room/pull/41)、[#42](https://github.com/uichat-mira/control-room/pull/42)、[#43](https://github.com/uichat-mira/control-room/pull/43)、[#44](https://github.com/uichat-mira/control-room/pull/44)、[#45](https://github.com/uichat-mira/control-room/pull/45) 的生产验证、Gateway Smoke、Publisher Sync 和核心测试均有成功记录。
- 目前仍保留明确的 V1 凭证范围风险：专用最小权限 Token 的尝试被回退为现有 `ORG_GITHUB_TOKEN`，属于已知且显式接受的边界，不应写成“权限问题已解决”。

**主要阻塞**

- 非默认分支的可信 Task/PR 关系还没有耐久建立机制：[Control Room Issue #46](https://github.com/uichat-mira/control-room/issues/46)。
- 因此审查链路现在是“安全但可能不可用”，而不是“自动化审查完全闭环”。

### Relay、Cloud 与 Website

- `uichat-mira/uichat-mira-relay`：本周无新提交、PR 或 Issue；没有新的 Relay 稳定性证据。
- `uichat-mira/cloud-shiyan`：本周无提交；不能据此判断拾言状态链路已恢复。
- `uichat-mira/uichat-website`：本周无提交；官网博客内容应以线上实际页面为准，目前与 Docs 生产记录不一致。

### 阶段推进

按工程阶段看，本周有明确推进：

- E01 Planner：已完成表征、类型化适配器和原生结构化输出路径。
- E02 Chat：行为等价基线已合并。
- E03-1 Conversation Workdir：生命周期与安全边界已接受。
- E03-2 Workdir→Artifact：仍待最终验收。

没有看到可验证的 GitHub Milestone 字段变更；以上判断来自已合并 PR、Issue 关闭状态和验收合同，不是按提交数量计算。

### 下周优先级

1. **先修官网博客实际展示**：核对 `mira.tomz.io` 的 Pages 项目和部署来源，验证 `/blogs/` 是否包含 Docs `prod` 的最新文章；不要重新安装或切换 Cloudflare GitHub App。
2. 完成 Mobile `0.3.5` 的 canonical CI、R2 签名产物和真实发布验收，再合并 [PR #146](https://github.com/uichat-mira/mira-mobile/pull/146)。
3. 用真实设备完成 Relay 长连接、后台恢复、工具批准/取消和 Agent 持续运行验证。
4. 完成 Desktop [#148](https://github.com/uichat-mira/mira-desktop/issues/148) / [#163](https://github.com/uichat-mira/mira-desktop/issues/163)，保持 Remote/Mobile Artifact handoff 不提前扩张。
5. 为 Control Room [#46](https://github.com/uichat-mira/control-room/issues/46) 建立非默认分支的可信 Task/PR 关系机制，并保留当前“不解析 PR 正文”的信任边界。
