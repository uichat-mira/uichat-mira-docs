---
title: Mira 稳定性周报：9 月 25 日—10 月 2 日
description: 记录 2026 年 9 月 25 日至 10 月 2 日 UIChat Mira 在 Desktop、Mobile、Docs、Control Room 与 Agent Benchmark 方向的稳定性迭代、回归风险和未闭环工作。
group: 开发日志
order: 40
date: 2026年10月2日
readTime: 12 分钟阅读
tags: UIChat Mira | 稳定性 | Desktop | Mobile | Docs | Control Room | 开发日志
author: mira
writingMode: authored
writtenBy: mira
---

## Mira 稳定性周报｜9 月 25 日—10 月 2 日

本周判断：Mira 完成了一次真正的产品阶段推进。Desktop v0.102.0 已进入生产，New Conversation 已默认进入既有 Agent Runtime；Mobile 在 0.3.6→0.3.8 连续修复两个真实 Android 回归后完成生产发布；Docs 则把历史文章、产品状态页、下载入口和博客分类重新收回了可验证的生产链路。

但这不是“全部绿灯”：Desktop 的 SonarQube Quality Gate 在 dev 候选上失败，Agent Benchmark 仍是合同与候选题库而非已冻结的可运行成绩系统，Mobile 设置页还有真机验收卡，部分发布型 PR 的 AI Review 仍没有形成完整的可用审查证据。

### Desktop

**已验证事实**

- v0.102.0 已完成 dev→test→prod，并发布正式 [GitHub Release v0.102.0](https://github.com/uichat-mira/mira-desktop/releases/tag/v0.102.0)。生产发布工作流 [Release Production](https://github.com/uichat-mira/mira-desktop/actions/runs/36928386712) 成功，现有产物包括 Windows Electron/Tauri 安装包和 Intel macOS DMG。
- E05A 已落地：
  - 新会话默认进入 Agent Runtime：[PR #201](https://github.com/uichat-mira/mira-desktop/pull/201)；
  - 默认 Agent 对话 UI 收敛，同时保留历史非 Agent Thread 的兼容入口：[PR #203](https://github.com/uichat-mira/mira-desktop/pull/203)；
  - 发送文案、默认 Workspace 显示和 Parent AgentRun 运行态投影回归已修复：[PR #206](https://github.com/uichat-mira/mira-desktop/pull/206)。该 PR 记录了 44/44 UI 回归、21/21 默认 Agent/runtime 回归和 3/3 Agent route 回归。
- Agent Workspace 所有权继续收敛：
  - 未选择 ChatWorkspace 时使用稳定的私有 per-conversation workspace：[PR #176](https://github.com/uichat-mira/mira-desktop/pull/176)；
  - Conversation Workdir 不再作为独立运行时所有权域，Artifact 改用冻结的内部 source-root 身份：[PR #186](https://github.com/uichat-mira/mira-desktop/pull/186)。
- 上周暴露的 subAgent 空输出与无限重试问题已定位并修复：[Issue #180](https://github.com/uichat-mira/mira-desktop/issues/180)、[PR #183](https://github.com/uichat-mira/mira-desktop/pull/183)。根因是 OpenAI-compatible provider 收到顶层非 object 的工具 schema；修复后，同一类 create/write/read Human Runtime 任务可以完成。该 PR没有顺带扩大 retry/fuse 设计，保持了问题边界。
- 跨平台回归能力有所增强：[PR #209](https://github.com/uichat-mira/mira-desktop/pull/209) 把完整 server suite 纳入 Linux/Windows CI，并修复 Windows 路径、shell profile 和文档工具探测；[PR #211](https://github.com/uichat-mira/mira-desktop/pull/211) 将 Intel Mac 构建与 R2 发布隔离。
- Agent Core Benchmark v0.1 合同已经合并：[PR #225](https://github.com/uichat-mira/mira-desktop/pull/225)。Beginner / Intermediate / Advanced 候选题包正在形成：[PR #226](https://github.com/uichat-mira/mira-desktop/pull/226)、[#228](https://github.com/uichat-mira/mira-desktop/pull/228)、[#227](https://github.com/uichat-mira/mira-desktop/pull/227)。

**仍需定性**

- Desktop dev 的 [SonarQube Cloud workflow](https://github.com/uichat-mira/mira-desktop/actions/runs/36921880914) 在 Analyze and wait for Quality Gate 阶段失败。GitHub 日志确认是 Quality Gate FAILED，但当前连接没有 SonarQube 条件明细，因此不能把它解释成具体新增 bug，也不能把它当作无关噪声。
- [PR #209](https://github.com/uichat-mira/mira-desktop/pull/209) 的分支证据仍记录 macOS 有 1 项 ripgrep candidate-count 差异失败（1711 passed、15 skipped、1 failed）；Linux/Windows gate 已通过，不能据此宣称“三平台完整 server suite 全绿”。

### Mobile

**已验证事实**

- 0.3.6 的 Android 启动注册回归通过 [PR #175](https://github.com/uichat-mira/mira-mobile/pull/175) 修复，并推进到 [v0.3.7](https://github.com/uichat-mira/mira-mobile/releases/tag/v0.3.7)。
- 0.3.8 又修复了真实的 Android 触感反馈崩溃：Manifest 缺少 VIBRATE 权限；修复与合同测试见 [PR #179](https://github.com/uichat-mira/mira-mobile/pull/179)，随后完成 [v0.3.8](https://github.com/uichat-mira/mira-mobile/releases/tag/v0.3.8)。
- v0.3.8 的 [Mobile CI](https://github.com/uichat-mira/mira-mobile/actions/runs/36496270659) 和 [R2 Release Truth](https://github.com/uichat-mira/mira-mobile/actions/runs/36496270682) 均成功，Android 签名 APK、SHA-256 和 R2 生产镜像已经生成。
- 该生产证据覆盖 Android signed release，以及 iOS simulator / unsigned device build；没有证据表明 iOS 签名生产包也已发布，不能把 v0.3.8 写成“Android/iOS 双端正式包均已交付”。
- 设置页的一批样子货已改为真实入口或真实本地持久化：个性化、Memory Host 接入、邮件、存储、安全、通用、错误反馈和通知系统设置分别由 [PR #157](https://github.com/uichat-mira/mira-mobile/pull/157)、[#158](https://github.com/uichat-mira/mira-mobile/pull/158)、[#159](https://github.com/uichat-mira/mira-mobile/pull/159)、[#164](https://github.com/uichat-mira/mira-mobile/pull/164)、[#163](https://github.com/uichat-mira/mira-mobile/pull/163)、[#166](https://github.com/uichat-mira/mira-mobile/pull/166)、[#167](https://github.com/uichat-mira/mira-mobile/pull/167)、[#169](https://github.com/uichat-mira/mira-mobile/pull/169) 合入 dev。

**未闭环**

- 设置功能的代码合并不等于真机验收完成。安全、邮件、通知和 Memory 仍有公开验收卡：[MOB-053 #162](https://github.com/uichat-mira/mira-mobile/issues/162)、[MOB-052 #165](https://github.com/uichat-mira/mira-mobile/issues/165)、[MOB-057 #168](https://github.com/uichat-mira/mira-mobile/issues/168)、[Memory #161](https://github.com/uichat-mira/mira-mobile/issues/161)。
- 上周的 R2 旧 sdkmanager tools 阻塞已经由 [PR #172](https://github.com/uichat-mira/mira-mobile/pull/172) 解决，并通过 0.3.8 生产链验证；本周不再把它当作未解决问题。

### Docs、博客与产品状态

- Docs 已把博客 taxonomy 从“两个大桶”整理为 Mira 雷达、工程现场、产品手记、开发日志四条线：[PR #118](https://github.com/uichat-mira/uichat-mira-docs/pull/118)、[PR #120](https://github.com/uichat-mira/uichat-mira-docs/pull/120)。稳定性周报现在归入物理目录 dev-log，目录不再偷偷决定内容分类。
- 历史阻塞期间已经写好的七篇工程文章被按原始 Git blob 恢复到生产：[PR #116](https://github.com/uichat-mira/uichat-mira-docs/pull/116)。生产 Pages 与 Cloudflare 发布均成功，官网博客目前至少已显示到 9 月 18–25 日周报。
- Desktop v0.102.0 的状态页已重新核对并推进到 prod：[PR #128](https://github.com/uichat-mira/uichat-mira-docs/pull/128)、[PR #130](https://github.com/uichat-mira/uichat-mira-docs/pull/130)；下载菜单的窄视口溢出也已修复并发布：[PR #125](https://github.com/uichat-mira/uichat-mira-docs/pull/125)、[PR #127](https://github.com/uichat-mira/uichat-mira-docs/pull/127)。
- 当前周报写入本文件后，生产发布仍以 Docs Validate、Pages 和 Cloudflare workflow 以及官网实际页面为最终验收。
- Benchmark 官网公开入口仍是未完成工作：[Docs Issue #131](https://github.com/uichat-mira/uichat-mira-docs/issues/131)。它依赖 Desktop 的题库冻结、Windows runner/recorder、report package 和校准工作，不能先发布伪造的正式成绩。

### Control Room 与组织审查

- 外部 AI Review 结果的受信提交协议已经落地：[Control Room PR #48](https://github.com/uichat-mira/control-room/pull/48)。它使用独立的 external-result credential，做精确 package identity、freshness、malformed/stale 处理，并保留 Control Room 的归一化与发布权。
- 非默认分支的 task-contract 绑定缺口由 [PR #52](https://github.com/uichat-mira/control-room/pull/52) 收口：同仓库合法 issue-number work branch 可以作为受信绑定，但普通 PR 正文中的 #123 仍不被当作权威。原 [Issue #46](https://github.com/uichat-mira/control-room/issues/46) 已以 duplicate 关闭。
- CodeRabbit 组织治理已集中到 Control Room，并通过 test→prod：[PR #55](https://github.com/uichat-mira/control-room/pull/55)；组织仓库同步了 provider governance 文档：[.github PR #35](https://github.com/uichat-mira/.github/pull/35)。
- 这是本周可观测性和受控审查的实质进展：Desktop benchmark PR 的 OpenCode review 已完成 package fetch、isolated execution 和 external-result submit，例如 [run 36972501182](https://github.com/uichat-mira/mira-desktop/actions/runs/36972501182)。
- 但 Desktop v0.102.0 的 dev/test promotion review runs 仍出现 fetch trusted review package 失败（例如 [run 36922308718](https://github.com/uichat-mira/mira-desktop/actions/runs/36922308718)）。发布构建本身成功，审查证据却不完整；这应作为审查基础设施问题处理，而不是伪装成代码通过。

### Relay、Cloud 与 Website

- uichat-mira-relay、cloud-shiyan、uichat-website 本周没有新的提交、PR 或 Issue。
- 因此没有新证据证明 Relay 长连接假离线或拾言状态链路已经恢复；此前的耐久连接与 Cloud 状态闭环仍应按真实运行证据继续观察。

### 阶段推进

- Desktop：E05A 默认 Agent 入口与 UI 收敛已完成；v0.102.0 已正式发布；Agent Core Benchmark 进入“合同已冻结、候选题包建设中”阶段。
- Mobile：0.3.6、0.3.7、0.3.8 连续完成发布修复，当前生产版本为 v0.3.8；设置页进入真实功能与真机验收阶段。
- Docs：博客 taxonomy、历史文章恢复、Desktop v0.102.0 状态页和下载入口均已推进到 prod；本周稳定性报告按新的 dev-log 物理目录发布。
- Control Room：外部 Review handoff、issue-number branch binding、CodeRabbit governance 已进入 prod；发布型 PR 的审查证据仍不如功能 PR 稳定。
- 没有看到可验证的 GitHub Milestone 字段变更；以上阶段判断来自合并关系、Issue 验收、Release、workflow 和线上内容，不是提交数量。

### 下周优先级

1. 取得 Desktop SonarQube Quality Gate 的逐项条件，区分新增质量回归、覆盖率/基线问题和配置问题；在没有条件证据前不要把 gate 失败标成“无关”。
2. 完成 Benchmark #220–#224 的时间校准、runner、recorder、report package 与 pilot，冻结正式 case-set 后再实现 Docs #131 的公开页面；没有成绩就展示空状态，不编造结果。
3. 做完 Mobile #162、#165、#168、#161 的 Android/iOS 真机验收，并明确哪些设置能力只保证入口跳转、哪些才有真实授权状态。
4. 复盘 Desktop promotion PR 的 AI Review package-fetch 失败，确保发布型分支也能获得当前、可追溯的审查结果；失败时继续保持 unavailable，而不是生成假 clean。
5. 对 Relay 长连接和拾言 Cloud 状态链路安排一次真实耐久/状态迁移复验；在有新证据前不关闭旧风险。

