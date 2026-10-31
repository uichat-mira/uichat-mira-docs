---
title: 应用基础信息
description: UIChat Mira 的产品资料、首次可用条件、运行形态、数据范围与当前边界。
group: 产品能力
order: 10
---

# 应用基础信息

## 文档范围

本页说明 UIChat Mira 当前最基础的产品资料、首次使用条件、运行形态和数据范围。

具体模型配置见：[模型设置](/guide/configuration/model-settings)。版本与能力状态见：[当前实现快照](/guide/status/current)。

## 基本资料

| 项目 | 当前信息 |
| --- | --- |
| 产品名称 | UIChat Mira |
| 产品定位 | 本地优先、桌面优先、多 Provider 的个人 AI 工作台 |
| 正式发布版本 | 以 [GitHub Releases](https://github.com/uichat-mira/mira-desktop/releases/latest) 为准，源码版本见 Desktop `package.json` |
| 当前主要平台 | Windows 桌面端 |
| 桌面运行形态 | Electron 单一桌面壳（Tauri 已从 `dev` 退役；历史版本不受影响） |
| 前端 | React + Vite |
| 本地后端 | Fastify |
| 本地数据 | SQLite + sqlite-vec |
| 模型接入 | 本地模型、云端 Provider、自定义 OpenAI-compatible Connection |
| 核心入口 | Chat、模型、知识库、评测、角色、工具、MCP、微应用、企业集成 |
| 项目口号 | 从聊天出发，最终回到「接住你」 |

![UIChat Mira 设置导航与能力入口](/images/guide/product/mira-settings-navigation.webp)

*设置页集中提供模型、工具、MCP、知识库、评测、角色和微应用入口。*

## 首次可用条件

Mira 安装完成后，不代表已经可以调用模型。

第一次使用至少需要完成：

```text
启动本地模型服务或准备云端 API Key
→ 配置 Provider Connection
→ 绑定主模型
→ 在 Chat 中收到真实回复
```

只保存模型名称、只看到绿点或只完成模型目录同步，都不等于 Chat 已经可用。

推荐顺序：

1. 打开[模型设置](/guide/configuration/model-settings)；
2. 只配置主模型；
3. 新建普通 Chat；
4. 发送最小测试消息；
5. 主模型成功后，再配置 Agent、Embedding、Rerank 和评测模型。

Image Generation 与 TTS 当前主要在各自 Studio 中配置，不是首次聊天的前置条件。

## 本地优先的含义

本地优先不等于强制离线，也不等于拒绝云端模型。

当前主要体现为：

- 桌面应用和本地后端组成主要运行环境；
- 对话、设置、知识、任务状态和本地产物优先保存在用户设备；
- 用户可以选择 Ollama、LM Studio 等本地服务；
- 用户也可以配置云端 Provider；
- 外部服务只接收完成具体请求所需的数据；
- 工具和 MCP 进入 Agent 前仍受 Harness、Policy 和审批治理。

## 运行结构

```text
React / Vite Renderer
→ Electron Desktop Shell
→ Fastify Backend
→ SQLite / Local Runtime / Provider / External Integration
```

| 层 | 职责 |
| --- | --- |
| Renderer | 展示 Chat、设置、任务、Evidence 和 Artifact |
| Desktop Shell | 窗口、生命周期、Preload 与系统桥接 |
| Backend | Provider、知识、Agent、Harness、集成和 MicroApp Service |
| Persistence | 用户配置、线程、消息、知识、任务和连接状态 |
| External Runtime | 模型服务、MCP、企业平台和领域 Provider |

Renderer 不应直接拥有所有操作系统权限。敏感能力通过后端或桌面桥接进入。

## 数据范围

| 数据域 | 示例 | 生命周期说明 |
| --- | --- | --- |
| 账户与偏好 | 用户名、语言、主题、密码 | 与当前用户配置关联 |
| Provider 与模型 | Connection、Base URL、加密 API Key、角色绑定 | 独立于聊天记录 |
| 对话 | Thread、Message、Attachment、AgentRun | 删除线程不自动删除其他产品域 |
| 知识与评测 | Knowledge Base、Document、Chunk、Index、Evaluation Run | 删除文件或索引需单独执行 |
| 角色 | Role、Prompt Field、模型参数 | 可跨线程复用 |
| 工具与 MCP | Server、Tool、Agent Access、审批状态 | 连接存在不等于自动获得权限 |
| MicroApp | Job、Artifact、Studio 配置、领域状态 | 每个 Runtime 有独立生命周期 |
| Workspace | 用户绑定的文件系统范围 | 不等于 Mira 自动拥有全部磁盘访问权 |

删除 Chat 不等于删除知识库、Provider 凭据或工作空间文件。执行清理前应阅读具体确认信息。

## 凭据安全

Provider API Key 在本地数据库中加密保存。

模型设置导出为了支持完整恢复，会在导出的 JSON 中包含明文 API Key。该文件属于敏感凭据备份：

- 不提交 Git；
- 不上传公开 Issue；
- 不通过公开链接分享；
- 不发送给不可信第三方。

## 当前主要产品入口

| 入口 | 主要用途 |
| --- | --- |
| Chat | 普通对话、知识问答、Agent 任务和结果交付 |
| 模型设置 | Provider Connection、模型目录和角色绑定 |
| 知识库 | 文档入库、分段、索引和检索验证 |
| 评测中心 | 检索和生成质量验证 |
| 角色工作台 | 可复用 Prompt 原型与参数 |
| 工具工作台 | 公共工具、Availability 与工具包偏好 |
| MCP | External MCP 连接、Discover 和 Agent Access |
| 微应用 | 独立 Studio、领域 Runtime 和连接入口 |
| 企业集成 | 企业微信等 Platform、Instance、AccessPoint 与业务绑定 |

## 当前不应从入口推断的结论

- 有 Provider 卡片，不等于模型可用；
- Provider `connected`，不等于真实 Chat 成功；
- 有 MicroApp 卡片，不等于 Runtime Ready；
- MCP Server 已连接，不等于 Agent 已获得调用权限；
- 工具出现在 Registry，不等于本轮 Planner 可见；
- 模型模板支持某个角色，不等于具体模型已经验证全部能力。

## 当前不写死的信息

以下内容容易随发行包和环境变化，本页不长期写死：

- 安装包大小；
- 最低硬件配置；
- 所有 Provider 和模型清单；
- 全部文件格式限制；
- 未进入正式发布的路线图功能；
- 未明确发布的商业授权方式。

这些信息应由发行说明、安装文档和具体功能页维护。

## 首次使用验证清单

- [ ] Mira 桌面端和本地后端正常启动；
- [ ] 本地模型服务已启动，或云端 API Key 有效；
- [ ] 主模型已完成真实 Chat 验证；
- [ ] 凭据没有暴露到公开位置；
- [ ] 需要知识库时再检查 Embedding；
- [ ] 需要 Agent 时再检查 AgentTask 和工具 Availability；
- [ ] 需要 Image / TTS 时分别进入对应 Studio 配置。
