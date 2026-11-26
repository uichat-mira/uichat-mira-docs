---
title: 手机和电脑同时控制一个 Agent，究竟谁说了算？
description: 微软开放的 Agent Host Protocol 把多端同步、断线恢复与动作仲裁变成独立的工程问题；Mira 的远程执行实践说明，能连上同一台电脑还不等于共享同一个可靠会话。
group: Mira 雷达
order: 51
date: 2026年10月30日
readTime: 8 分钟阅读
tags: Agent | Agent Host Protocol | Remote Execution | Session | Approval | Mira
author: mira
writingMode: authored
writtenBy: mira
---

# 手机和电脑同时控制一个 Agent，究竟谁说了算？

你在电脑上交给 Agent 一项任务，出门后从手机查看进度。Agent 正准备执行一条需要确认的命令；手机上点了“批准”，电脑上却几乎同时点了“拒绝”。随后手机断网十秒，再次连上。

这时候最重要的问题已经不是模型会不会写代码，而是：**哪一个决定生效？两块屏幕怎样得到同一个结果？断线期间发生的事，手机如何准确补回来？**

很多产品把这件事称为“多端同步”，仿佛只要把聊天消息推送到另一台设备就够了。可 Agent 不只产生文字，还会启动任务、等待审批、修改文件、执行工具，甚至在没有任何界面连接时继续工作。同步一段聊天记录，与协调一个仍在行动的执行者，是两种不同的工程。

## 新变化：Agent 会话不再属于某个窗口

2026 年 10 月 28 日，GitHub 在 VS Code 的新一轮 Agent 更新中，明确展示了同一会话跨编辑器、独立 Agents 窗口、GitHub Mobile、网页与 CLI 的连续使用，以及在自己电脑上运行 Agent、从手机远程操控的路径。

这次变化的技术基础不是简单的聊天云同步。微软此前在 8 月 26 日介绍了 **Agent Host**：一个独立于编辑器窗口的进程，负责持有 Agent 会话，并通过开放的 **Agent Host Protocol（AHP）** 与不同客户端通信。10 月的更新让这种分离更直接地走进用户日常：窗口可以关闭，手机可以接管操作，真正工作的 Host 仍留在原来的执行环境。

但这里有一个必须说清的条件：**客户端离开，不等于执行环境可以关机。** 官方文档说明，本地或自有远程机器上的 Host 必须保持运行；云端会话由托管环境维持。恢复了聊天画面，不代表停机期间 Agent 曾继续执行。

一手资料：

- [GitHub：GitHub Copilot in VS Code, Universe releases（2026-10-28）](https://github.blog/changelog/2026-10-28-github-copilot-in-vs-code-universe-releases/)
- [VS Code：Introducing the Agent Host（2026-08-26）](https://code.visualstudio.com/blogs/2026/08/26/agent-host-architecture)
- [VS Code：Agent Host architecture](https://code.visualstudio.com/docs/agents/concepts/agent-host)

## 不是再造一个 Agent 协议，而是给“共同操作”立规矩

AHP 最值得注意的设计取舍，是它**不规定 Agent 怎么思考、用什么模型、怎样选工具**。这些仍由具体 Agent Harness（负责模型循环、上下文与工具调用的运行时）处理。AHP 只把多个客户端共同面对的事情明确下来：谁保存权威状态、谁给动作排序、断线后怎样追上进度、不同屏幕的操作冲突怎样收敛。

它把会话状态组织成可订阅的频道。客户端初次连接先拿到状态快照，再接收按服务端顺序编号的动作；掉线重连后，可以根据上次看到的位置补收动作，必要时重新取得快照。客户端为了让界面响应迅速，可以先乐观地显示自己的操作，但最终仍要服从 Host 接受或拒绝后的状态。

例如两个客户端几乎同时确认同一个工具调用，AHP 的设计说明给出了明确的仲裁原则：**只允许一个确认生效，后来的冲突操作应被拒绝。** 这不意味着任何连上 Host 的客户端都自动拥有批准权限；客户端身份、授权范围与具体执行策略仍然需要由产品自身落实。

这里出现了一个很重要的分层：

```text
手机 / 桌面 / 网页
    ↓ 共享会话、同步、仲裁
Agent Host
    ↓ 具体 Agent 的运行合同
Planner → Policy / Approval → Tool → Evidence
```

上面这一层解决“所有屏幕看到并操作的是不是同一件事”；下面这一层解决“这件事究竟允不允许发生”。

原始规范：[AHP Doctrine](https://github.com/microsoft/agent-host-protocol/blob/main/docs/guide/doctrine.md)、[AHP 与 ACP 的分工](https://github.com/microsoft/agent-host-protocol/blob/main/docs/guide/ahp-and-acp.md)、[AHP Specification Overview](https://github.com/microsoft/agent-host-protocol/blob/main/docs/specification/overview.md)。

## Mira 已经把执行真相留在桌面，但还不能据此宣布多端同步完成

这件事与 UIChat Mira 的实际工程经历有直接关系。Mira 是本地优先的桌面 Agent：界面由 Electron/React 承载，Agent 运行在桌面后端。当前 `dev` 的聊天合同明确区分 **Thread / Message** 与 **AgentRun**：前者保存用户看见的对话，后者保存目标、运行状态、审批、checkpoint（可恢复执行位置）、Evidence（结构化执行证据）和终止信息。

换句话说，Mira 没有把“屏幕上的最后一句话”当作 Agent 是否完成的唯一依据。AgentRun 才是运行真相，UChat 负责把后端状态投影成用户可以理解的界面。

真实源码与合同：

- [Mira Chat 当前运行合同（dev）](https://github.com/uichat-mira/mira-desktop/blob/dev/docs/CHAT_CURRENT_TRUTH.md)
- [Mira Agent 当前运行合同（dev）](https://github.com/uichat-mira/mira-desktop/blob/dev/docs/AGENT_CURRENT_TRUTH.md)
- [AgentRun 持久化入口（dev）](https://github.com/uichat-mira/mira-desktop/blob/dev/server/src/agent/run-store.ts)

远程执行上，Mira 已有另一层重要分工：手机通过 Direct 或 Relay 到达桌面，**Relay 只负责传输，不能变成另一个 Agent 后端或业务权限裁判**。桌面端的 Remote Device Scope 显式区分 `agent:read`、`agent:approve`、`agent:control`；Agent 路由本身则提供运行查询、批准、拒绝与取消。运行中的取消还使用带 lease 身份的控制器，避免旧执行控制器误影响后来接管的同一 Run。

可核验实现：

- [Remote Device Scope 路由映射（dev）](https://github.com/uichat-mira/mira-desktop/blob/dev/server/src/services/remote-device-auth.service.ts)
- [AgentRun 控制路由（dev）](https://github.com/uichat-mira/mira-desktop/blob/dev/server/src/agent/routes.ts)
- [AgentRun 取消与 lease（dev）](https://github.com/uichat-mira/mira-desktop/blob/dev/server/src/agent/run-control.ts)
- [Mira Relay 传输边界（dev）](https://github.com/uichat-mira/mira-desktop/blob/dev/docs/remote-access/relay-transport-v1.md)

这些是当前仓库可以直接看到的事实。但**它们不等于 Mira 已实现 AHP，也不证明 Mira 已拥有多客户端有序动作重放、乐观状态对账或并发审批仲裁的完整合同**。现有 Remote Host 主要提供带设备授权的业务请求、流式响应和远程控制；我们不能把“远程 API 可调用”包装成“多端共同编辑同一个运行会话已经验收”。

## 真正难的是两个“都对”的客户端

AHP 带来的启发不在于让 Mira 立刻替换 Remote Host 协议，而是把几个容易混在一起的问题分开。

**第一，审批必须同时有动作身份和竞争仲裁。** Mira 当前坚持冻结具体工具调用，让批准绑定到特定 invocation；这解决的是“批准 A 不能执行 B”。如果未来手机和桌面同时处理同一个待审批动作，还要证明“两个终端不能各自成功一次”。参数冻结与并发仲裁互相补充，不能互相代替。

**第二，断线恢复不是把副作用重做一遍。** 手机丢失了三条进度更新，可以重放状态事件；但如果它丢失的是“已经发起写文件操作”的确认，恢复时不能因此再执行一次写入。状态重放、命令重试、幂等执行必须有不同语义。Mira 现有 checkpoint 与 Evidence 提供了可用的事实基础，但还需要独立验证跨客户端重连时的事件顺序和副作用边界。

**第三，工具可用性不能靠界面猜。** AHP 官方文档特别指出，有些工具由连接中的客户端贡献；客户端离线，这些工具就不可用。Mira 的 ToolExposure/Harness 同样需要回答：手机看到的工具清单，究竟是 Host 当前真实可执行的能力，还是上一次连接留下的显示缓存？远程发现不应自动提升授权，失联也不能被当作授权继续存在的证据。

**第四，Host 存活和会话持久化不是一回事。** 数据库能恢复一个 AgentRun 的记录，不代表断电后仍有一个进程在执行它；Relay 重连成功，也不代表中断前的工具调用已经完成。产品必须分别报告连接、运行、恢复与最终结果，而不是给用户一个含糊的“在线”。

这些是基于现有实现与 AHP 合同提出的**工程推断和待验证问题**，不是 Mira 已经完成的兼容性测试，也不是对现有系统存在具体并发漏洞的断言。

## 我们更想吸收的是“Host 说了算”

对 Mira 来说，值得立即吸收的是一条边界：**Agent 的状态不属于某个聊天窗口，执行权限也不属于负责显示它的那块屏幕。**

值得实验的是一个小而真实的场景：同一个 AgentRun 同时由桌面和手机观察；一端断线重连；两端对同一审批作出相反决定；再核对 Host 最终状态、工具是否只执行一次、Evidence 是否一致。这样的测试比先移植一套完整协议更能说明我们缺的是什么。

暂时不能下结论的，是 Mira 是否需要直接兼容 AHP、是否应为所有设备引入统一的事件序列，以及怎样把现有 REST/SSE、Relay 和未来 Cloud Account 的设备身份合成一个长期稳定的会话合同。AHP 本身也仍在演进，不能把某个实现的全部细节当作跨平台定律。

Agent 从聊天框里走出来以后，最需要的也许不是另一块更漂亮的屏幕，而是一个不因屏幕切换而改变事实的执行者。

**手机可以发出命令，电脑可以显示进度；但谁真正执行了什么、谁批准了什么、最终发生了什么，必须只有一份可以核对的答案。**
