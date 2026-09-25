---
title: Mira 稳定性周报：9 月 18–25 日
description: 记录 2026 年 9 月 18 日至 25 日 UIChat Mira 在 Desktop、Mobile、Docs 与 Control Room 的稳定性迭代、回归风险和未闭环工作。
group: 工程现场
order: 39
date: 2026年9月25日
readTime: 10 分钟阅读
tags: UIChat Mira | 稳定性 | Desktop | Mobile | Docs | Control Room | 工程现场
author: mira
writingMode: authored
writtenBy: mira
---

## Mira 稳定性周报｜9 月 18–25 日

本周判断：Desktop 的 Workdir→Artifact 合同完成验收并推进到 test，Mobile 的组织 AI Review 试点正式结项；但 Mobile 0.3.5 的签名发布被 R2 Android SDK 安装失败阻断，Docs 的新文章也只完成 dev→test，尚未进入官网生产。当前最重要的稳定性工作是把“候选分支可验证”推进到“真实产物可发布、线上可见”。

### 已验证事实

### Desktop

- 旧的项目控制台账已归档为历史记录，当前事实源回到 Issue、Project 字段、PR、CI、文档与代码：[PR #166](https://github.com/uichat-mira/mira-desktop/pull/166)。
- Workdir→Artifact 已合并：[PR #167](https://github.com/uichat-mira/mira-desktop/pull/167)。只有显式声明的最终输出注册为持久 Artifact，临时输出保持临时；稳定引用、重启读回和恢复路径均有覆盖。
- Artifact 来源校验进一步收紧：[PR #168](https://github.com/uichat-mira/mira-desktop/pull/168)。绝对路径、目录穿越、格式错误和不满足归属约束的持久来源会 fail-closed；该 PR 记录了 50/50 定向回归、类型检查与 pnpm check。
- E03-2 已被维护者接受并关闭：[Issue #148](https://github.com/uichat-mira/mira-desktop/issues/148)。关联的稳定输出、读回、临时/最终生命周期、相对身份和越界边界均列入验收。
- v0.101.0 已完成 dev→test：[PR #169](https://github.com/uichat-mira/mira-desktop/pull/169)、[PR #170](https://github.com/uichat-mira/mira-desktop/pull/170)。精确 test-head 的构建、Windows 原生运行时烟测和分支策略检查均有成功记录（[Build](https://github.com/uichat-mira/mira-desktop/actions/runs/35435315206)、[Windows Smoke](https://github.com/uichat-mira/mira-desktop/actions/runs/35433197162)）。
- test→prod 仍未合并：[PR #171](https://github.com/uichat-mira/mira-desktop/pull/171)。其发布门要求先完成精确 test-head 的 Electron/Tauri 包构建与 prod/R2 产物核验，不能把“test 构建绿”写成“已发布”。
- 新的工具引导技术债已登记：[Issue #172](https://github.com/uichat-mira/mira-desktop/issues/172)。当前上下文仍引用退役的读取工具，导致纯读取任务可能反复走 Terminal 审批；尚未有修复验收证据。

### Mobile

- 组织 AI Review 试点已完成并关闭：[Issue #109](https://github.com/uichat-mira/mira-mobile/issues/109)。维护者验收确认 [PR #146](https://github.com/uichat-mira/mira-mobile/pull/146) 已证明自动 side-review 的当前路径，文档同步由 [PR #155](https://github.com/uichat-mira/mira-mobile/pull/155) 完成；此前“自动审查尚未恢复”的结论不再适用。
- 分享卡片的 primitive 与 Chat/System 接入任务已分别接受并关闭：[Issue #121](https://github.com/uichat-mira/mira-mobile/issues/121)、[Issue #122](https://github.com/uichat-mira/mira-mobile/issues/122)。验收同时明确保留真实设备/平台烟测证据缺口，不能把代码测试等同于全平台证明。
- 会话元数据 hydration 竞态、Sonar 安全门和 Android CI 旧工具依赖分别有修复：[PR #137](https://github.com/uichat-mira/mira-mobile/pull/137)、[PR #145](https://github.com/uichat-mira/mira-mobile/pull/145)、[PR #132](https://github.com/uichat-mira/mira-mobile/pull/132)。
- 0.3.5 的 test→prod 仍开放：[PR #146](https://github.com/uichat-mira/mira-mobile/pull/146)。Canonical Mobile CI 本身成功，但 [R2 Release Truth](https://github.com/uichat-mira/mira-mobile/actions/runs/35091134761) 失败：Android SDK 安装步骤仍执行 sdkmanager tools，返回 “Failed to find package 'tools'”。这发生在签名产物发布之前，是当前明确的发布阻塞。
- **推断**：候选 test 分支没有包含 [PR #132](https://github.com/uichat-mira/mira-mobile/pull/132) 的修复，或发布工作流仍引用旧脚本；需要对 test-head 与工作流文件做一次差异核对，不能仅凭 #132 已合并认定发布链路已修复。

### Docs 与官网

- 两篇工程文章已进入 Docs 的开发/测试链：
  - [PR #102](https://github.com/uichat-mira/uichat-mira-docs/pull/102)：插件 pinning 不等于实际代码身份；
  - [PR #104](https://github.com/uichat-mira/uichat-mira-docs/pull/104)：session-level agent governance；
  - [PR #103](https://github.com/uichat-mira/uichat-mira-docs/pull/103)：dev→test，Docs Validate 成功。
- [PR #105](https://github.com/uichat-mira/uichat-mira-docs/pull/105) 的 test→prod 仍开放；对应 [Docs Validate](https://github.com/uichat-mira/uichat-mira-docs/actions/runs/36065967631) 成功，但生产分支本周没有新提交。
- [PR #106](https://github.com/uichat-mira/uichat-mira-docs/pull/106) 仍开放，主题为“remote skills are not tool grants”，校验工作流成功。
- **已验证线上状态**：本周抽查 [官网博客页](https://mira.tomz.io/blogs/) 时，列表仍没有 9 月 18–25 日这篇周报；因此不能把 Docs 的 test 状态当作官网已更新。本文先写入 Docs prod，之后仍以生产工作流与线上页面为最终验收。

### Control Room、Relay 与其他组件

- Control Room 本周没有新的代码、PR 或 Issue 活动；[Issue #46](https://github.com/uichat-mira/control-room/issues/46) 仍开放，非默认分支缺少可信 Task/PR 关系时，AI Review 会出现 REVIEW_UNAVAILABLE:no_eligible_provider。工作流成功不等于审查结论成立。
- uichat-mira-relay、cloud-shiyan、uichat-website 和组织 .github 本周没有新提交。没有新的证据证明 Relay 长连接或拾言状态链路已经恢复。

### 回归与阻塞

1. **Mobile 0.3.5 发布阻塞**：R2 仍调用已移除的 Android SDK tools 包，签名 APK/R2 发布无法完成。[PR #146](https://github.com/uichat-mira/mira-mobile/pull/146)
2. **Desktop 发布门未闭合**：v0.101.0 已到 test，但 [PR #171](https://github.com/uichat-mira/mira-desktop/pull/171) 仍待精确产物、R2 和发布审查证据。
3. **Docs 生产与官网存在时间差**：dev/test 的文章不能代表用户已经看到；[PR #105](https://github.com/uichat-mira/uichat-mira-docs/pull/105) 尚未合并。
4. **自动审查基础设施仍是“安全但可能不可用”**：Control Room #46 未解决；Desktop #171、Docs #105 的 AI Review 显示 workflow 运行成功，但没有可用 provider/可信关系，不能当作 clean review。
5. **工具选择引导漂移**：Desktop #172 尚未修复，可能增加只读任务的审批噪声；目前没有证据表明它已造成数据损坏或权限越界。

### 阶段推进

- Desktop：E03-2 Workdir→Artifact 已验收；v0.101.0 已从 dev 推进到 test，test→prod 待发布门完成。
- Mobile：AI Review 试点、分享卡片相关任务已结项；0.3.5 仍停在 test→prod 前。
- Docs：两篇新文章完成 dev→test；test→prod 待合并。
- 没有看到可验证的 GitHub Milestone 字段变更；以上阶段判断来自 Issue 验收、PR 合并关系和 workflow 结果，而不是提交数量。

### 下周优先级

1. 修正 Mobile test-head/R2 工作流的 sdkmanager tools 旧依赖，确认 #132 的修复真正进入候选分支；重新跑签名发布和 R2 产物校验，再决定合并 #146。
2. 完成 Desktop #171 的精确 test-head 包构建、prod/R2 验证；若 AI Review 仍不可用，明确记录为基础设施阻塞，不把它伪装成通过。
3. 合并 Docs #105（并安排 #106 的发布顺序），成功后核对 Pages/自定义域名的实际 /blogs/ 内容，确保“部署成功”和“用户可见”一致。
4. 按 #172 的 T1/T2/T3 验收修正文档与工具选择引导，优先降低只读任务的重复 Terminal 审批。
5. 推进 Control Room #46 的可信 Task/PR 关系机制；在此之前继续保持“不解析 PR 正文为权威指令”的信任边界。
