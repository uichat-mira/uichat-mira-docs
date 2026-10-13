---
title: 更新日志
description: Mira Desktop v0.104.0 已正式发布，了解 Agent 渐进式能力发现、Mira Next 二期和历史版本变化。
group: 现状与方向
order: 19
---

# 更新日志

> 这里是 Mira Desktop 面向用户的发布摘要。正式版本事实以 [Desktop CHANGELOG](https://github.com/uichat-mira/mira-desktop/blob/prod/CHANGELOG.md) 和 [GitHub Releases](https://github.com/uichat-mira/mira-desktop/releases) 为准。

## v0.104.0 · 2026-10-13 · 正式发布

**Mira Next 二期正式交付。** 本次更新的重点不是多出一排按钮，而是让 Agent 更可靠地发现所需能力、执行工具，并保留可追溯的执行证据。

- **渐进式工具发现**：Tool Search / Progressive Resolution 进入运行路径。Capability View 以 Agent 各自的权限和可用性为边界管理候选能力，按需披露工具 Schema，避免把“看到了工具”误当成“调用成功”。
- **运行时可用性治理**：没有就绪或不在授权范围内的工具不会伪装成 Agent 可执行能力，Web Search 也遵循同样的边界。
- **Skills / Resources 按需加载**：先提供简要信息，实际需要时再展开 Skill 正文和 Resource 内容；披露不会自动扩大执行权限。
- **子 Agent 继续任务**：强化 Generic / Skill Child 的能力范围、进度恢复和实际执行证据。子 Agent 可以在同一任务中重新判断是否需要执行工具，主 Planner 继续负责总体任务判断。
- **能力工作台与可观测性**：改进工具状态、诊断信息和回归验证，让“已注册、可用、已披露、已执行”不再混成一个状态。

维护者已在 Mac 开发环境完成一轮真实文件读取和比较烟测。该场景通过，不代表所有模型和任务都已获得相同可靠性保证。

**已知问题**：特定 OpenAI 兼容 Provider 的身份展示问题见 [#347](https://github.com/uichat-mira/mira-desktop/issues/347)；部分模型可能返回不完整的 Planner 决策 JSON；更广的渐进式发现验收矩阵持续跟踪于 [#311](https://github.com/uichat-mira/mira-desktop/issues/311)。

[查看 v0.104.0 GitHub Release](https://github.com/uichat-mira/mira-desktop/releases/tag/v0.104.0) · [查看 0.103.0 → 0.104.0 代码差异](https://github.com/uichat-mira/mira-desktop/compare/v0.103.0...v0.104.0)

### 下载与发布验证

本次正式 Release 已发布。Release Factory V2 的测试、Windows Electron / Tauri 打包、Intel macOS 构建和发布任务均完成成功。

- **Windows**：GitHub Release 提供 Electron Setup 和 Tauri NSIS 安装包。
- **macOS Intel**：GitHub Release 提供独立 DMG；该 DMG 仍未进行 Apple Developer ID 签名和公证。
- **镜像分发**：发布流水线已向 Cloudflare R2 的 `mira/latest/` 与 `mira/macos-intel/latest/` 同步产物。下载入口以 [GitHub Release 资产](https://github.com/uichat-mira/mira-desktop/releases/tag/v0.104.0) 为准。

发布源码为 `prod@dfb1ee18007d`，对应正式 Tag `v0.104.0`。[查看发布流水线](https://github.com/uichat-mira/mira-desktop/actions/runs/38391739003)。

## v0.103.0 · 2026-10-07 · 正式发布

这版打下 Mira Next 二期的工具基础：

- Pi Agent Core 升级至 1.0.2，Tool Core 统一 ToolResult / Harness Evidence，并接入外部 MCP 适配。
- Universal Read、File Mutation、Terminal、Web 和 `apply_patch` 能力进入统一治理的工具体系。
- 新增「扩展」导航，集中呈现能力、Skills 和 MCP 原型入口，能力工作台支持更直观的工具验证。
- Desktop Host Push Broker、通知 outbox 与 FCM / APNs 投递基础链路进入工程基线；完整手机端接收体验仍需单独验收。
- Agent Benchmark 和跨平台发布验证继续完善。

[查看 v0.103.0 GitHub Release](https://github.com/uichat-mira/mira-desktop/releases/tag/v0.103.0) · [查看 0.102.0 → 0.103.0 代码差异](https://github.com/uichat-mira/mira-desktop/compare/v0.102.0...v0.103.0)

## v0.102.0 · 2026-10-02 · 正式发布

此版本完成 `dev → test → prod` 晋级并发布正式安装包。它将默认 Agent、工作空间所有权和应用导航推进到新的稳定基线。

[查看 v0.102.0 GitHub Release](https://github.com/uichat-mira/mira-desktop/releases/tag/v0.102.0)

### 导航从“聊天侧栏”长成应用级工作台

Mira 新增了应用级 Navigation Rail。

知识库、评测中心、开发工具、关于、远程访问与 Forge 等能力开始拥有独立工作区，不再全部挤在聊天侧栏或设置页里。页面骨架、页边距、嵌套路由选中态也一起统一；设备配对弹窗和菜单交互做了相应收紧。

这次变化更接近一次信息架构整理，而不是单纯换皮。

### 新对话默认就是 Agent

Desktop 新建对话现在默认进入现有 Agent Runtime，不再要求用户先手动打开 Agent。

界面也随之收敛：

- 主按钮继续叫“发送”，不再把 Agent 当作一个需要额外理解的发送模式；
- 历史非 Agent 路径明确标记为“兼容 Chat”；
- 既有 Thread 保留自己原来的 `agentEnabled` 状态，不做历史迁移；
- Role 图片动作不再因为默认 Agent 而无条件消失。

换句话说，Agent 开始成为默认运行方式，但旧聊天合同还没有被粗暴删除。

### Agent 的工作空间所有权被重新收口

`v0.101.0` 里的 Conversation Workdir 曾经承担一套独立身份。现在这层所有权已经退休。

当前合同收敛为：

```text
显式 ChatWorkspace
或
隐式 private per-conversation Agent workspace
```

没有显式 Workspace 的 Agent 对话会得到稳定的私有工作空间；选择了 ChatWorkspace 时，显式 Workspace 仍然优先。

AgentRun 现在只冻结并持久化一个 `workspaceRoot`。Artifact 也从这个被冻结的 source root 注册、持久化与读回。旧的 `conversation-workdirs` 磁盘目录名暂时保留，只是为了不搬动现有用户文件，不再代表一套独立运行时身份。

### Agent / SubAgent 的失败边界更稳

这一阶段没有重新发明 Agent Graph，而是继续修稳定性：

- Planner 对一次无效文本 decision 做有限修复，而不是无限重试；
- OpenAI-compatible Provider 的 SubAgent tool schema 会投影为合法 object root；
- approval resume 继续使用被冻结的 workspace root；
- 可恢复的 SubAgent 失败不再让仍在运行的 Parent Agent 提前退出“运行中”UI；
- Agent 运行期间的发送 / 停止状态和线程所有权增加了回归保护。

这些变化大多不会变成新按钮，但会减少“Agent 明明还在跑，界面却先结束了”一类错位。

### Windows 与跨平台测试链补强

Windows PowerShell sandbox 补了一轮比较扎实的运行时修正，包括：

- 退出码归一；
- stdout / stderr 延迟收尾；
- 非交互 PowerShell 进程终止；
- 核心环境变量与 `PSModulePath` 保留。

服务器全量测试也开始在 Linux + Windows CI 上跑，跨平台路径、Office / PDF 外部工具探测、宿主 Python 等差异被纳入自动检查。

### Review 与质量门不再只靠“看起来没问题”

工程侧新增或收紧了几条门：

- Mira AI Review 改由隔离的 OpenCode runner 执行；
- Provider / routing 进入受信配置；
- SonarQube Cloud Quality Gate 接入；
- CodeRabbit review 范围按 Desktop 路径收敛；
- Server Full Test CI 开始承担跨平台全量测试职责。

这些不会直接改变产品功能，但会改变一条修改进入 `dev` 前需要提供的证据。

### Intel Mac 第一次进入正式发布链

Intel macOS Electron 已经在真实 `darwin-x64` 环境完成一轮完整验证：

- Electron app / DMG 可以生成；
- 打包内使用 bundled Node 22；
- 后端 `/health` 成功；
- SQLite、sqlite-vec 与 Forge 初始化成功；
- 重启后复用同一数据库；
- graceful shutdown 后不遗留后台进程。

现在 Intel Mac 已有独立 CI，不再拖住 Windows 的 `Build Desktop Apps` workflow。

对于此发布线的 `v*` Release：

- Intel DMG 会上传到独立 R2 前缀 `mira/macos-intel/latest/`；
- R2 成功后，再把 DMG 附加到同一个 GitHub Release；
- 官网下载菜单检测到该 Release 资产后，会把“macOS Intel · 即将提供”自动切换成真实下载入口。

此发布线上的 Intel DMG **尚未做 Developer ID 签名与公证**；Mira 的 canonical macOS target 仍保持 `darwin-arm64`。

## 更多版本与源码

- [Mira Desktop 完整更新日志](https://github.com/uichat-mira/mira-desktop/blob/prod/CHANGELOG.md)
- [所有正式 GitHub Releases](https://github.com/uichat-mira/mira-desktop/releases)
- [v0.101.0 → v0.102.0 代码差异](https://github.com/uichat-mira/mira-desktop/compare/v0.101.0...v0.102.0)
