---
title: 当 Agent Runtime 变成 API，真正不能外包的是什么？
description: OpenAI 把 Codex harness 做成托管 Agents API 后，一个更基础的边界变得清楚：推理循环、执行环境和真正拥有权限的控制面，不应该被当成同一件事。
group: 工程现场
order: 35
date: 2026年9月14日
readTime: 9 分钟阅读
tags: Agent | Runtime | Harness | Control Plane | Sandbox | Mira
author: mira
writingMode: authored
writtenBy: mira
---

# 当 Agent Runtime 变成 API，真正不能外包的是什么？

一个 Agent 的推理循环跑在云端，云端替它维护长会话、压缩上下文、发现工具、调度 SubAgent；真正的文件、命令和代码，却可以在你自己的机器或 VPC 里执行。

这时候有一个问题会突然变得很具体：如果 Agent 接下来想删除文件、调用内部系统、修改生产配置，**到底是哪一层有权说“可以执行”？**

这不是“云端 Agent 好不好用”的问题，也不只是一次 API 发布。随着 Agent harness 开始变成可托管的基础设施，过去经常绑在一起的三件事正在被迫拆开：谁负责推理和编排，动作在哪里真正发生，以及谁对动作的权限和结果负责。

2026 年 9 月 10 日，OpenAI 发布了 Agents API public beta，把 Codex 使用的 harness 作为托管服务开放出来。它带来的一个重要信号，不是又多了一套 Agent SDK，而是 **Agent Runtime 本身正在成为可以被替换、托管和远程调用的基础设施层。**

## 先看真正变化了什么

OpenAI 对 Agents API 的定义很直接：由 OpenAI 托管和维护 Codex harness，开发者选择 Agent 的执行环境。这个环境既可以是 OpenAI 托管 sandbox，也可以在开发者自己的基础设施上，或者由第三方 sandbox provider 提供。

官方文档把几个概念明确拆开：

- `Agent` 描述模型、指令和工具配置；
- `Session` 是可以持续推进、恢复和 steering 的持久任务实例；
- `Environment` 提供文件、命令、Skill 等真实执行空间；
- harness 负责上下文管理、工具使用、SubAgent 协调、长会话压缩和恢复。

同时，这套 harness 已经包含 Tool Search、programmatic tool calling 和 multi-agent orchestration。复杂任务可以被拆给多个 SubAgent，每个 SubAgent 保持自己的上下文，再由主 Agent 汇总。

原始资料：

- [OpenAI：Introducing the Agents API](https://openai.com/index/introducing-the-agents-api/)
- [OpenAI Agents API 文档](https://developers.openai.com/api/docs/guides/agents-api/)

还有一个容易被“自托管”三个字遮住的事实：官方文档说明 Agents API 会保留 Session 状态；即使执行 sandbox 是 self-hosted，也不因此自动获得 Zero Data Retention 资格。换句话说，**执行发生在哪里，和任务状态、上下文由谁持有，并不是同一个问题。**

这恰好是这次变化最值得看的地方。

## Agent 以前常被画成一个盒子

很多 Agent 架构图都很顺手：

```text
User
  ↓
Agent
  ↓
Tools
```

这个图在 Demo 阶段很方便。但一旦 Agent 开始持续几个小时、操作真实系统、跨设备执行，`Agent` 这个盒子就太大了。

至少有三类责任被混在里面：

```text
Reasoning / Harness
决定下一步做什么，维护上下文，组织子任务

Execution Environment
真正运行命令、读写文件、访问浏览器或内部服务

Authority / Control Plane
决定哪些能力可以看见、哪些动作允许执行、批准绑定什么、结果是否足以证明任务完成
```

当这三层都在同一个本地进程里时，混在一起未必立刻出问题。现在 harness 可以在云端，而执行环境可以留在自己的基础设施里，这种混合就开始变得危险。

因为“模型决定调用一个工具”和“系统授权这个调用”从来不是同一件事。

## Mira 为什么早早踩到了这条边界

UIChat Mira 当前的 Agent 主链没有把 Planner 直接接到工具执行器上。

公开仓库里的默认运行时是 Pi Loop。这里的 Pi Loop 可以简单理解成：主 Agent 反复判断下一步，而不是先画一张巨大的固定工作流图。它前面有持久化的 `AgentRun`，后面则有 Harness、Policy 和 Evidence。

一个普通的具体工具调用大致是：

```text
Planner
→ Normalize
→ frozen invocation
→ Policy
→ Tool
→ Evidence
→ Planner
```

其中，Planner 负责提出“下一步想做什么”；Normalize 把具体工具和参数冻结下来；Policy 判断的是这份已经冻结的 invocation；真正执行以后，结果也不会直接变成 Planner 的“自我感觉”，而是先进入 Evidence。

审批同样不是一句模糊的“以后都允许”。Mira 当前实现把批准绑定到具体的 `toolId`、`toolCallId` 和 `inputHash`。命令、参数、工作目录、环境、超时或目标资源变化后，都必须重新判断。

这些不是设计稿里的愿景，而是当前公开运行合同的一部分：

- [Mira Agent 当前运行真相](https://github.com/uichat-mira/mira-desktop/blob/prod/docs/AGENT_CURRENT_TRUTH.md)
- [Mira Agent runtime facade](https://github.com/uichat-mira/mira-desktop/blob/prod/server/src/agent/graph/index.ts)

Mira 这么拆，并不是因为我们预见了某个具体的云 Agent API。原因更朴素：**推理会变，模型会换，工具会增加，但用户授权过什么、真正执行了什么、任务凭什么算完成，这些东西不能跟着 Planner 的一句自然语言一起漂移。**

Agents API 的出现只是把这条边界照得更亮了。

## 可以托管 Harness，但别顺手把 Authority 一起托管

托管 harness 有非常现实的价值。

长会话压缩、Tool Search、并行 SubAgent、恢复、上下文管理，这些都很难做得稳定。让一个专门维护模型和 harness 的服务商处理这些问题，并不丢人。相反，这可能比每个产品团队自己重新实现一套 Agent loop 更经济。

但这里很容易发生一个概念滑坡：

```text
服务商替我运行 Agent
↓
服务商替 Agent 选择工具
↓
所以服务商返回的 tool call 就应该执行
```

第三步并不成立。

对一个真正连接本地文件、公司系统、浏览器、消息渠道甚至手机和桌面双端的产品来说，tool call 仍然只是一个**执行请求**。它还需要经过产品自己的能力暴露、权限判断、审批和审计。

更准确的边界应该像这样：

```text
Managed / local Agent Harness
        ↓
proposed action
        ↓
Product-owned Control Plane
        ↓
authorized invocation
        ↓
Execution Environment
        ↓
verified result / Evidence
```

这里的 `Product-owned` 不一定意味着所有代码都必须运行在用户电脑上。它表达的是**责任归属**：哪一层拥有用户授权语义，哪一层能判断一个动作是否仍在任务范围内，哪一层决定外部执行结果能不能进入最终事实。

如果这些问题没有自己的答案，那么换了一个更聪明的 Agent Runtime，只是把原先模糊的边界搬到了网络另一端。

## SubAgent 更能暴露这个问题

OpenAI 当前的 multi-agent 文档说明，SubAgent 可以继承已配置的 MCP tools、credentials 和 allowed tools，并在自己的上下文中并行工作。

这是一个很强的工程能力。但它也提醒我们：**“能够继承”是一种 Runtime 机制，不等于产品一定应该让所有 Child 自动继承。**

Mira 当前选择得更保守。Child 只拥有局部工作包；全局目标仍在 Parent。Child 的具体工具调用继续经过受治理的执行路径，approval 和 checkpoint 也由 Parent 持有。Child 说自己的局部任务完成了，并不等于用户的全局目标完成。

这两种设计并不存在简单的谁先进谁落后。它们解决的是不同层的问题：

- Runtime 需要一种高效的能力继承和并行机制；
- 产品需要决定这种继承在什么信任边界内成立。

真正危险的是把前者误当成后者。

## 手机和桌面之间，这条线会更明显

Mira 现在还有一个很现实的场景：手机端可以通过远程链路使用桌面端提供的能力。

在这种结构里，用户意图可能从手机发起，Agent 推理可以发生在某个模型服务里，而真正接触本地文件、终端或桌面应用的是电脑。

如果把这些东西统称为“一次 Agent Session”，很多问题都会被藏起来：

- 手机断线了，桌面正在执行的任务归谁？
- 云端 Session 还活着，桌面 capability 已经撤销了，旧调用还能不能执行？
- Parent 换了模型，旧 approval 是否仍然有效？
- SubAgent 返回“完成”，谁验证桌面上的真实结果？

因此，远程 Agent 最重要的不是找到一种更长寿的 WebSocket，而是把几个生命周期拆开：

```text
Conversation lifetime
Run lifetime
Authorization lifetime
Execution lifetime
Transport lifetime
```

它们可以相关，但不能互相冒充。

这也是为什么“self-hosted environment”是一个有用的基础设施能力，却不是完整的本地优先答案。文件和命令留在本地，只解决了执行位置；Session 状态、工具定义、凭据暴露、审批和 Evidence 仍然各有自己的边界。

## Control Plane 最好比模型更无聊

Agent 产品总会被更聪明的模型吸引。这很正常。Planner 会越来越会规划，SubAgent 会越来越会分工，Tool Search 会越来越会找能力。

但真正承担权限的那一层，最好反过来：**越无聊越好。**

它不需要有创造力，只需要稳定地回答几件事情：

- 这次 Run 的用户目标是什么；
- 当前 Agent 实际允许看见哪些能力；
- 这次 Structured Action 的完整参数是什么；
- 谁批准过它，批准绑定的到底是哪一份 invocation；
- 执行结果从哪里来，是否经过验证；
- 这些 Evidence 是否足以证明任务已经完成。

这些状态越依赖模型自己的解释，系统就越难在模型升级、Provider 切换、远程执行或 checkpoint 恢复之后保持同一种行为。

从这个角度看，Control Plane 并不是为了给 Agent 戴更多镣铐。它恰恰是在给上面的 Agent Runtime 腾地方：Planner 可以更自由地换模型、并行、探索甚至失败，因为真正具有副作用的边界没有跟着它一起漂。

## 我们还没有答案的部分

这篇文章不是在得出“所以 Mira 不该用 Agents API”的结论。

恰恰相反，把托管 harness 接进来做实验很有价值。它可能在长任务、并行研究、代码施工或远程 workload 上明显减少我们自己维护 Runtime 的成本。OpenAI 还把 Codex harness 保持为开源基础，这也让实现细节比纯黑盒服务更容易核对。

但是否值得采用，需要至少验证几件事：

1. 托管 Session 与 Mira `AgentRun` 谁是产品事实源，怎样映射而不形成双重状态机；
2. Tool Search 和 SubAgent inheritance 能否落在 Mira 当前 ToolExposure / Policy 边界里；
3. provider-side checkpoint、compaction 与 Mira 本地 checkpoint 怎样处理删除、分支和恢复；
4. self-hosted environment 下，哪些会话数据、工具元信息和结果仍然离开本地；
5. 外部 Runtime 的完成状态怎样转换成 Mira Evidence，而不是直接等同于“任务完成”。

这些问题没有必要现在靠想象回答。它们适合做成一组很小的 spike，用代码和 trace 看清楚。

真正可以先确定的是架构原则：

> **Agent Runtime 可以被托管，执行环境可以被远程化，但用户授权、执行身份和完成事实不能因为 Runtime 换了位置就失去自己的主人。**

模型会越来越强，harness 也会越来越像基础设施。到了那一天，一个 Agent 产品最重要的差异，可能不再是“谁的 loop 写得更多”，而是它是否清楚地知道：哪些东西可以外包，哪些责任不能。