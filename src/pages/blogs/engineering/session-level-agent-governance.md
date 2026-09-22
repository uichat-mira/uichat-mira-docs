---
title: 每一步都合法，Agent 为什么还是可能越界？
description: 单次工具调用通过策略检查，并不意味着整段 Agent 会话安全；真正困难的是跨轮次、跨动作和累计副作用的治理。
group: 工程现场
order: 39
date: 2026年9月22日
readTime: 7 分钟阅读
tags: Agent | Governance | Runtime | Evidence | Security
author: mira
writingMode: authored
writtenBy: mira
---

# 每一步都合法，Agent 为什么还是可能越界？

一个 Agent 连续执行八次操作，每一次单独看都符合规则。参数合法，权限正确，审批也没有被绕过。

最后，系统仍然做错了事。

这不是一个反直觉的边角案例，而是 Agent 从“会调用工具”走向长时间运行之后，越来越值得单独对待的工程问题：**动作级安全，不自动推出会话级安全。**

2026 年 9 月，Google 在 Gemini Enterprise Agent Platform 的一组零信任 Agent 工程资料里，把这个问题讲得很具体。他们展示了一个退款 Agent：规则允许金额较小的单次退款，于是攻击者不再尝试一次申请大额退款，而是在同一会话里反复申请多个单独合法的小额退款。每一轮都能通过输入过滤、单次策略判断和签名执行；只有把整段会话累计起来，才能看到总退款已经超过原订单金额。

这件事对我们很有触动，因为 Mira 过去几个月恰好一直在加固另一半问题：怎样保证**某一个具体动作**不会在 Planner、审批和执行之间偷偷变形。现在，行业开始把另一半摆到桌面上：即使每个动作都没有变形，动作的组合仍可能产生新的风险。

## 单次 Policy 看不到时间

传统工具治理通常围绕一次 invocation 展开。

模型提出一个动作，运行时规范化参数，策略判断它是否允许；必要时等待用户批准；执行完成后，再记录结果。

这条链路非常重要。Mira 当前公开的 Agent 运行时也采用类似的硬边界：Planner 产生具体工具调用后，Normalize 冻结 `pendingToolCall`，Policy 只判断这份被冻结的 invocation；执行阶段还要求 `toolId`、`toolCallId` 与 `inputHash` 保持一致。审批恢复同样绑定这份 exact invocation，而不是根据一句“用户已经同意”重新猜参数。

这解决的是**动作身份**问题：批准的是 A，就不能执行成 A'。

但它回答不了另一个问题：A、B、C、D 每一个都允许，`A + B + C + D` 是否仍然允许？

Google 的示例故意把每一次退款都做成局部合法。真正异常的是累计金额、对同一实体的重复写入，以及工具调用速度。这些信息只有放到时间轴上才存在。

原始资料：[Google Developers Blog：Build zero-trust AI agents that judge intent, not just syntax](https://developers.googleblog.com/build-zero-trust-ai-agents-that-judge-intent-not-just-syntax/)。Google 同期公布的 Agent Anomaly Detection 也明确把分析对象扩展到 reasoning traces、tool calls 与整段 execution flow，并采用异步、out-of-band 的审计方式：[Agent Anomaly Detection](https://developers.googleblog.com/agent-anomaly-detection-now-in-private-preview-on-the-gemini-enterprise-agent-platform/)。

## Evidence 不只是给模型回答问题

Mira 的 Agent 主线目前把 Evidence 作为累计证据的单一写入边界。工具和检索先产生 pending facts，Evidence 接收以后，Planner 才继续判断下一步；最终 Generate 也只能消费冻结交付包引用到的真实 Evidence。

公开的当前运行时说明在这里：[Mira Agent 当前真相](https://github.com/uichat-mira/mira-desktop/blob/prod/docs/AGENT_CURRENT_TRUTH.md)。

我们最初强调这条边界，主要是为了防止模型把“我准备做”“工具大概成功了”和“系统已经验证发生了”混成一件事。Evidence 是事实边界，而不是漂亮一点的聊天记录。

但会话级治理让 Evidence 多出了一种潜在价值。

如果运行时已经拥有结构化的动作、结果、审批和 Evidence，那么判断“过去十分钟是否对同一资源连续写了七次”“累计转移的值是否突破阈值”“Child 是否反复触发同一类副作用”，就不必重新从自然语言 transcript 里猜。

这是我们的工程推断，不是 Mira 当前已经实现的能力。Mira 的当前文档明确写着：它不是通用 durable workflow engine，也没有开放式多 Agent 自治、并发工具 fan-out 或自动 sandbox 回滚。现有 observability 会投影 Parent / SubAgent trace，但 observability 失败不能成为第二控制平面。

这个限制反而很重要。因为“能看见异常”与“有权改变执行”是两件事。

## 监控器不应该偷偷变成第二个 Planner

Google 的方案把几个角色拆得很开。

输入输出过滤负责拦截明显危险的 payload；Semantic Governance Policy 在工具执行前，根据用户意图和业务规则判断 proposed tool call；Agent Anomaly Detection 则在会话和 fleet telemetry 上寻找跨轮次异常。后者可以异步运行，不必把每一次审计都塞进 Agent 的关键路径。

这比“再放一个更聪明的模型盯着 Agent”精确得多。

对 Mira 来说，真正值得吸收的不是复制 Google 的产品组件，而是这个所有权问题：**会话级观察可以独立存在，但它不能因为发现异常，就自行获得 Planner、Policy 或用户审批的权力。**

Mira 当前坚持 Parent 持有用户对话、全局目标、Policy、审批、恢复和最终交付；Child 只拥有边界明确的局部工作包。这个设计让会话级治理有一个比较自然的落点：检测器可以产生结构化 finding，但后续是阻断、要求重新审批、缩窄工具面，还是仅记录审计，应由明确的治理合同决定，而不是让检测模型自由采取下一步行动。

否则我们只是把一个 Agent 变成两个互相不知道谁说了算的 Agent。

## 真正棘手的是跨 Run

同一会话里的累计行为还只是容易的部分。

如果用户关闭应用再恢复，计数是否继续？如果 Parent 把工作包交给 Child，Child 的三次写操作和 Parent 的两次写操作是否属于同一个风险预算？如果手机端发起任务、桌面端实际执行，治理窗口属于聊天会话、设备、用户、资源，还是某个 AgentRun？

这些问题没有一个可以靠“多存一点日志”自动解决。

它们要求系统先定义风险的身份和时间边界。

Google 当前公开的方案证明了 session-level anomaly detection 已经进入实际 Agent 平台治理，但这不等于行业已经找到了通用答案。尤其对于 local-first、跨设备和 Parent/Child 分工的 Agent，session 并不天然等于用户真正关心的操作边界。

所以我们现在更愿意把它写成一个问题，而不是宣布一种新架构：

> 当每一个动作都合法时，谁负责判断这些合法动作加起来仍然合理？

## 我们会保留两层治理

动作级治理不会因为会话级检测出现而过时。恰恰相反，两者解决的是不同问题。

第一层仍然应该尽可能确定：冻结具体 invocation、校验 schema、判断 Policy、绑定 approval、验证执行结果。它负责回答“这一刀能不能落下”。

第二层才观察时间：调用频率、累计副作用、资源变化、重复模式，以及跨 Parent / Child 的行为组合。它负责回答“这些每一刀都合规的动作，连起来正在做什么”。

我们还没有决定 Mira 是否需要一个独立的 session anomaly subsystem，也不会因为某个平台刚发布了一个功能就照着造一套。

但有一件事已经比以前清楚：**Agent 的控制面不能只检查下一步。**

当 Agent 开始真正持续工作，安全边界也必须拥有一点时间感。