---
title: 当前实现快照
description: 以 2026-09-14 的 dev 分支为准，说明 Provider、Knowledge Base、Evaluation、Agent、Tool Runtime、Forge、MicroApps Hub 与已知边界。
group: 现状与方向
order: 17
sourceBranch: dev
sourceVersion: 0.100.1
sourceCommit: 0e313cf4f2f1ffc791c47334f90439e1e25b077e
verifiedAt: 2026-09-14
---

# 当前实现快照

> 本页核对日期为 2026 年 9 月 14 日，核对基线为 `dev@0e313cf`。它描述当前可验证实现，不把设计方向、历史方案或待修复合同写成已经交付的能力。

## 版本与定位

当前根包版本为 `0.100.1`，项目描述仍是：

> An intelligent agent cabin that starts with a chat and returns to your side.

Mira 仍以桌面端、本地优先、多 Provider 的个人 AI 工作台为核心定位。聊天是入口，模型、知识、角色、工具、任务与产物在同一个工作环境里协作。

## 已有产品域

当前源码已经覆盖：

- 对话工作区；
- Provider Connection、模型目录、角色绑定与调用解析；
- 多知识库、文本索引、混合检索与 RAG；
- Evaluation Package、Dataset、Run、指标和报告；
- 角色与提示词原型；
- MCP、内置工具与 Harness；
- Agent 任务执行、execution trace 与可取消的 run-control；
- Forge 集成 Runtime、Desktop 工作区与共享 API；
- MicroApps Hub、独立 Studio 与专用 Runtime；
- 桌面端构建、调试与发布链路。

不同页面或后端入口已经存在，不等于每项能力都达到同样成熟度。公开说明继续区分稳定、部分可用、实验中与方向性能力。

## Provider 与模型当前快照

当前对象链：

```text
Provider Template
→ Provider Connection
→ Provider Model Cache
→ Model Role Binding
→ Provider Resolution
→ Protocol Adapter
→ Invocation / Observation
```

当前 Provider Template 包括：

- Ollama；
- LM Studio；
- OpenAI；
- Google Gemini；
- Cloudflare；
- 火山引擎；
- 火山 Code Plan；
- 火山 Agent Plan；
- 可创建多个实例的自定义 OpenAI-compatible Connection。

模型设置总览当前主要管理六个角色：

```text
llm
task
agentTask
evaluation
embedding
rerank
```

当前成立的行为：

- 模型目录可以通过 Ollama、OpenAI-compatible、Cloudflare 或 Ark Plan adapter 同步；
- 不在同步目录中的 model id 可以手工绑定；
- `agentTask` 未显式绑定时，Runtime 回退到 `task`；
- Chat 使用 Ollama native 或 OpenAI-compatible adapter；
- 远程 Embedding 使用 Ollama、Cloudflare 或 OpenAI-compatible adapter；
- Rerank 必须由 Template 显式声明，不能从 Chat 兼容推断；
- `evaluation` role 当前用于从 Knowledge Base Chunk 生成评测包样本，不承担 Run Judge；
- 内置本地 Embedding / Rerank 使用独立 ONNX / WASM Runtime；
- Model Call Observation 已能记录 Provider、协议、endpoint、模型、参数、请求摘要和耗时；
- 模型设置支持 Connection、凭据、角色绑定和参数的导入导出。

首次配置完成标准是：主模型绑定后，在新 Chat 中收到一条真实模型回复。

以下状态不能替代真实调用：

| 状态 | 只证明 |
| --- | --- |
| 模型卡“已配置” | 已保存 Connection 和 model id |
| Provider `connected` | 最近一次模型目录同步成功 |
| Chat 有回复 | 当前 Chat invocation 成功 |

`imageGeneration` 与 `voice` 存在于全局角色 schema，但 Image Generation Studio 和 TTS Studio 当前主要使用独立 Provider 配置。

详细步骤见：[模型设置](/docs/configuration/model-settings)。架构说明见：[Provider 与模型运行时](/docs/architecture/provider-context)。

## Knowledge Base 与 RAG 当前快照

当前对象链：

```text
Knowledge Base
→ Document
→ Chunk
→ Embedding
→ sqlite-vec Index
→ Vector + Lexical Retrieval
→ RRF Fusion
→ Optional Rerank
→ Generate / Sources
```

当前成立的产品能力：

- 支持多个 Knowledge Base；
- 系统确保存在不可删除的默认知识库；
- 知识库可以保存描述、persona、scenario、tags 和 Chunk 配置；
- 工作台支持知识库 CRUD、文档搜索筛选、启停、详情和删除；
- Add Wizard 支持单文件上传、Chunk 配置、抽样预览和索引状态轮询；
- 当前上传只接受 Markdown / TXT，单文件最大 100 MB；
- TXT 在严格 UTF-8 失败时可以回退 GB18030；
- Document 通过 `processing / ready / failed` 表达索引状态；
- 只有 ready + enabled 文档进入检索；
- 向量索引使用 sqlite-vec，并记录实际 Embedding 模型、配置和维度；
- 词法召回当前使用 Orama 和中文 tokenizer；
- Vector 与 Lexical 结果通过 RRF 融合；
- Rerank 可选，未配置或远端失败时降级为融合顺序；
- RAG Graph 包含 rewrite、embed、retrieve、rerank / fallback 和 generate；
- Chat Thread 当前绑定一个 Knowledge Base，并持久化 Sources；
- Main Agent 可以把 Sources 记录为 Retrieval Evidence；
- 企业微信 `knowledge_query` 可以绑定指定 Knowledge Base。

状态语义：

| 状态 | 只证明 |
| --- | --- |
| 上传成功 | Document 已创建，索引已入队 |
| processing | 正在等待或执行切分、Embedding 和写向量 |
| ready | 当前 Chunk 和向量已完成 |
| enabled | 文档允许进入检索 |
| Sources 非空 | 当前问题真实命中知识库 |

当前边界：

- 索引队列只存在于 backend 进程内，没有 durable job、checkpoint 或 restart recovery；
- `KnowledgeBase.embeddingModelConfigId` 字段尚未驱动实际 per-KB 模型选择；
- 入库和查询仍使用全局默认 Embedding role；
- 更换 Embedding 模型或维度不会自动重建已有索引；
- 工作台“重建索引”确认后只显示等待提示，没有完成后端调用；
- Add Wizard 第二步同时要求 LLM + Embedding，虽然后端索引的直接模型依赖是 Embedding；
- 数据库维护 FTS5 表，但当前主词法 Runtime 使用 Orama cache；
- 一个 Thread 当前只绑定一个 Knowledge Base；
- Knowledge Base 不是长期记忆，也不是任意文档解析器。

详细操作见：[知识库与 RAG](/docs/product/knowledge)。架构说明见：[Knowledge Base 与 RAG Runtime](/docs/architecture/knowledge-rag)。

## Evaluation 当前快照

当前对象链：

```text
Evaluation Package
→ Parsed Dataset
→ Evaluation Run
→ Sample Results / Attempts
→ Metric Summary
→ Client-side Markdown Report
```

当前成立的产品能力：

- 评测中心和新建评测工作台都有桌面入口；
- 可以从现有 Knowledge Base 自动生成 Evaluation ZIP，或上传单个 ZIP；
- ZIP 解析 manifest、evalset 和 documents 清单；
- Dataset 校验结构、Reference Answer、Gold Sources 和 Knowledge Base；
- Run 使用 `queued / running / completed / failed`；
- 支持 `retrieve` 和 `retrieve-generate`；
- Sample 支持 Repeat、并发 workers、Timeout、Attempt 和失败信息；
- Dataset、Samples 和 Run 使用 SQLite JSON 快照持久化；
- 评测中心支持列表、搜索、详情、Markdown 导出和删除已结束 Run；
- 报告可以包含配置、Sample、Sources、日志、Mermaid 图和客户端加权概览。

当前必须明确：

- `evaluation` role 只用于自动生成 question、expectedAnswer 和 tags；
- 自动生成 ZIP 中 documents 是占位文件，不保存真实 Knowledge Base 正文；
- Run 实际查询当前本机 Knowledge Base；
- Gold Source 只按规范化 documentName 精确匹配；
- Faithfulness、Relevance 和 Completeness 是词项重合启发式，不是 LLM Judge；
- 当前 `mrr` 使用命中与 Recall 的近似，不是真实 rank MRR；
- Source Hit Rate 当前实质与 Hit@K 同义；
- Markdown weighted score 只存在于客户端报告，不是 Runtime 指标。

当前边界：

- Run 通过进程内 `queueMicrotask` 调度，不是 durable queue；
- Backend 在 queued / running 时重启后，Run 会保留状态但不会恢复执行，且当前 API 拒绝删除；
- `retrieve` 模式当前仍执行完整 RAG Graph 和 Generate，再丢弃 Answer；
- Timeout 不取消底层 RAG / Provider 请求；
- 任一 Repeat 失败会令 Sample failed，任一 Sample failed 会令 Run failed；
- Dataset 没有列表、详情或删除入口；
- Run / Dataset 当前没有 userId，不是多租户隔离合同；
- Center 无分页、Compare、Baseline、Retry、Cancel 或 Release Gate；
- 指标适合当前实例的回归和定位，不是标准研究基准或专业正确性证明。

详细操作见：[评测工作台](/docs/product/evaluation)。架构与算法见：[Evaluation Runtime 与指标语义](/docs/architecture/evaluation-runtime)。

## Agent 当前运行时

当前 Agent 不能再简单描述成一张 LangGraph 流程图。

更准确的口径是：

- `AgentRun` 保存一次任务的状态、Evidence、审批、checkpoint 与最终交付；
- `AgentGraph` 是稳定运行时门面；
- `Pi Loop` 是应用默认 Main Agent 运行时；
- `LangGraph` 保留为显式兼容、历史测试与回归对照运行时；
- Main Planner 维护用户全局目标，并决定下一步与最终完成；
- 每次 Agent 运行会取得独立的 run-control lease 与 `AbortSignal`；同一 `runId` 的新 lease 会使旧 controller 失效，已取消运行会以 `cancelled` 状态收口而不是继续写入普通完成结果；
- Harness 负责具体工具的公共工具面、暴露、冻结调用、Policy、审批、执行与审计。

## 三类执行路径

当前存在三类受控路径：

1. **Main Agent 直接执行**：回答、检索或调用一个具体工具；
2. **通用工作包委派**：Main Planner 通过 `delegate_task` 把边界清楚的局部任务交给 Generic SubAgent；
3. **Skill-owned SubAgent**：命中执行 Profile 的任务型 Skill 在受限工具面和可选私有 Runtime 中完成领域施工。

SubAgent 只拥有局部任务。Parent 仍保留用户对话、全局目标、审批、恢复、Evidence 收口和最终交付。当前不是开放式多 Agent 自治平台，也不支持递归委派或 Agent 群体自由协作。

## Tool Runtime 当前快照

当前核心公共工具面是：

```text
Read
├─ read_discover
├─ grep
├─ read_open
└─ codebase_explore

Edit
├─ write_file
├─ replace_block
├─ delete_path
└─ move_path

Search
├─ web_search
└─ news_search

Terminal
└─ terminal_session
```

旧的六个 `read_*` primitive、`edit_file` 和 `workspace_mutation` 仍可能保留在 Runtime 中，但已经不是 Main Planner 的公共工具合同。

工具面也不是固定四格。Managed Browser、Attached Browser、Mail、GitHub、External Expert 和 External MCP 会根据真实连接、用户身份、运行时与产品配置动态进入可用能力面。

Tool Exposure 当前规则：

- 公共且可用工具不超过 20 个时，全部暴露，不运行 embedding / rerank；
- 超过 20 个时，只为控制模型上下文而排名并暴露前 20；
- 排名不是授权；风险由具体 Invocation 的 Policy / Approval 处理；
- 工具包选择只提供偏好，不直接改变权限或触发调用。

`terminal_session` 当前是完整 Host shell / PTY Runtime。Workspace 是默认执行上下文，但不是不可突破的假沙箱；工作空间外的 `cwd` 必须在显示真实目标后获得具体审批。

## Forge 当前快照

Forge 已经从独立控制面收进 Mira Desktop 的主工程边界。当前仓库明确要求以下集成入口存在：

```text
server/src/forge
desktop/src/features/forge
desktop/src/shared/api/forge
```

根级 `pnpm check` 会执行 `check:forge-cutover`，并拒绝旧 standalone Forge 的独立端口、独立状态目录、独立 package / workspace 等标记。

这组检查证明 Forge 的运行时、桌面入口与共享 API 已由 Mira Desktop 主仓库持有；它不等于所有 Forge 工作流、交互和自动化能力都已经稳定或完整交付。

## MicroApps 当前快照

设置页中的 MicroApps Hub 是宽产品能力中心，不等于代码中的严格 Integration MicroAPP Registry。

当前判断需要拆成五层：

```text
产品入口
共享 Definition
领域 Runtime
Integration Invoke
Agent Tool / Skill Access
```

严格 Registry 当前有七种 Definition：

```text
knowledge_query
news_hub
image_generation
computer_use
tts
codegraph
evolving_knowledge
```

其中只有 `knowledge_query` 完成统一 External AccessPoint Invoke，并且当前只支持企业微信智能机器人。

其他能力的当前状态：

- Image Generation：有任务、实时进度、Artifact、Provider / ComfyUI Studio；没有统一 External Invoke；
- Computer Use：有 Managed Browser、持久任务与 Evidence、模型执行器、审批和 Browser Tools；不是宿主桌面万能遥控；
- TTS：有 Windows、Piper、GPT-SoVITS 与 API Provider；并非所有 Voice Pack 或 Provider 都已验证；
- News Hub：有多来源拉取、缓存和 `news_search`；不等于实时公网搜索；
- CodeGraph：有 Studio 与 `codebase_explore`；原生命令不直接暴露给 Planner；
- 智识进化库：有真实 Service / Studio，但仍属实验能力。

MicroApps Hub 中还有不属于严格 Registry 的真实入口：

- Mail Center 通过 `mail_query` 进入 Agent；
- 文枢通过 Skill-owned Execution 与 Private Runtime；
- GitHub 通过连接入口和四个领域工具；
- 问策通过 External Expert Bridge；
- Notion 当前是连接与部分 AccessPoint 已实现，完整 Agent / Sync 仍未全部完成。

页面卡片、Definition、Runtime、External Invoke 和 Agent Access 不能互相代替。

## 已知实现偏差

### Provider 状态语义

模型卡“已配置”只检查 Connection 与 model id 是否已保存；Provider `connected` 只记录最近一次模型目录同步成功。两者都不证明当前 Chat、Embedding 或 Rerank 请求成功。

数据库还会 seed 部分 Ollama 模型绑定。本地服务未启动或模型未下载时，页面仍可能显示已有配置。

### 自定义 OpenAI-compatible 身份映射

`openai-compatible-custom` 当前在 Provider Resolution 中仍映射为火山 runtime provider code。

这可能影响调试标签和 Task 参数特判。它是已知历史兼容实现，不是目标上的供应商身份合同。

### Image / Voice 配置来源

全局模型角色与 Image / TTS Studio provider config 尚未统一。不能用其中一处“已配置”推断另一处 ready。

### Provider Token / Cost

当前 Model Call Observation 已有 endpoint、参数和 duration，但 Provider Proxy 尚未为所有 adapter 统一归一化 Token 与成本。

### Knowledge Base 索引恢复

索引队列不是持久工作流。Backend 在 Document processing 中中断时，当前没有自动恢复、重试或取消合同。

### Knowledge Base 重建入口

桌面已有“重建索引”确认入口，但没有完成后端调用。当前不能依靠它修复 Embedding 维度或模型不匹配。

### Evaluation 重启恢复

Run 在 queued / running 时 Backend 重启，会被原状态 hydrate，但不重新执行。当前删除接口又拒绝删除这些状态，可能形成永久卡住记录。

### Evaluation 指标语义

MRR、Source Hit Rate 和三个生成指标的名称强于当前算法。它们必须按当前 documentName 匹配和词项重合公式解释，不能写成标准 RAGAS 或 LLM Judge。

### Retrieve 路径多执行 Generate

Agent retrieve 和 Evaluation retrieve 当前都通过完整 RAG Graph，包括 Generate；随后只保留 Sources，丢弃 Answer。

影响是额外延迟、模型成本和节点语义偏差。代码已有更窄的 runnable 名称，但底层 `ragGraph.retrieve` 当前仍执行完整图。

### Recoverable 终止漂移

Settled recoverable contract 是：恢复预算耗尽后生成 guarded answer，Graph 以 `completed` 收口，并明确说明未完成项和失败影响。

截至本次核对，`dev` 当前实现仍会在该场景直接进入 `error`，使 Graph `failed` 并跳过 Generate。这个行为被记录为高优先级实现漂移，不是新的目标合同。

### Approval 身份漂移

Settled exact-invocation 合同使用：

```text
toolId + toolCallId + inputHash
```

当前 `dev` 的 frozen call 和审批请求会保存 `toolCallId`，但核心 approval grant matcher 实际仍只匹配：

```text
toolId + inputHash
```

这意味着当前实现尚未把 `toolCallId` 纳入 grant 身份判断。该问题已经被记录，但本轮公开文档更新没有修改 Runtime。

## 当前阶段

2026 年 8 月起，Mira 进入功能稳定迭代阶段。当前优先级是：

- 让新用户可以稳定完成第一次模型配置；
- 区分模型绑定、目录同步与真实调用状态；
- 稳定 Knowledge Base 上传、索引状态与 Sources；
- 补齐索引重建和 processing 恢复边界；
- 让 Evaluation 指标名称、算法和报告保持一致；
- 修复 Evaluation queued / running 重启后的生命周期；
- 修复 Agent / Evaluation retrieve 的无用 Generate；
- 修复已经确认的 Provider、Agent 和 Tool 合同漂移；
- 减少提前收尾和错误工具选择；
- 稳定审批与 checkpoint resume；
- 提高 Provider Observation、RAG Sources、Evaluation 解释、Evidence、Artifact 与 execution trace 的可信度；
- 用回归测试保护已经形成的公共面和状态语义；
- 逐项验证 Studio、Integration Invoke 与 Agent 接入，不用新卡片掩盖能力未收稳；
- 控制新增能力范围，不重开 Agent Graph、Harness 或 Universal MicroApp Runtime。

## 文档边界

公开站负责解释产品和架构；主仓库 `dev` 分支中的当前真相、协议、测试与代码仍是最终核验依据。历史文章可以解释为什么曾经这样设计，但不能覆盖当前实现。

延伸阅读：

- [模型设置](/docs/configuration/model-settings)
- [Provider 与模型运行时](/docs/architecture/provider-context)
- [知识库与 RAG](/docs/product/knowledge)
- [Knowledge Base 与 RAG Runtime](/docs/architecture/knowledge-rag)
- [评测工作台](/docs/product/evaluation)
- [Evaluation Runtime 与指标语义](/docs/architecture/evaluation-runtime)
- [MicroApps 与独立 Runtime](/docs/architecture/microapps)
