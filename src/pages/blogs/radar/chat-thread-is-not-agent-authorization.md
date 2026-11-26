---
title: 群聊可以派工了，但一段对话不是授权书
description: GitHub 将 Slack 与 Teams 中的 Agent 协作推向正式可用；真正的工程问题是群聊上下文、执行身份、仓库权限与成果归属不能混为一谈。
group: Mira 雷达
order: 61
date: 2026年11月9日
readTime: 9 分钟阅读
tags: Agent | GitHub | Slack | 飞书 | 身份授权 | 协作
author: mira
writingMode: authored
writtenBy: mira
---

# 群聊可以派工了，但一段对话不是授权书

群里有人说“这个 Bug 你去修一下”，Agent 真的去修了。十分钟后，一条 PR 出现在仓库里。问题似乎解决了；但这句话是谁说的，谁有权让 Agent 修改仓库，群里其他人的意见又以什么身份进入执行过程？

当 Agent 从个人对话框走进团队群聊，**能够读懂讨论**和**有权代表团队行动**就成了两件必须分开的事。

2026 年 11 月 6 日，GitHub 宣布 [`@GitHub` 在 Slack 与 Microsoft Teams 中正式可用](https://github.blog/changelog/2026-11-06-github-copilot-in-slack-and-teams-is-generally-available/)。用户可以从消息中发起问题调查、Issue 创建、代码修改和 PR；Teams 的 Canvas 允许团队在讨论中查看计划、代码与预览。更新还特别强调：从聊天生成的 Issue、PR 会注明它来自 Slack/Teams 对话及触发者。值得关注的不是“机器人终于能写代码”，而是**聊天被正式提升为工程任务的来源，而任务来源与执行权之间出现了新的信任边界**。

## 一段聊天如何变成工程执行

[GitHub 的 Slack 集成文档](https://docs.github.com/en/copilot/how-tos/copilot-integrations/integrate-cloud-agent-with-slack)给出了比发布公告更具体的行为契约。

在私聊中，Copilot 使用发起者关联的个人 GitHub 账户权限行动；在共享频道或群线程中，产出的 Issue、PR 等工件则以应用身份创建。发起或操控会修改仓库的会话，要求操作者对所选的每个仓库都有写权限；但其他参与讨论的人仍可以贡献上下文。对话中的意见可以影响工作，**贡献意见并不等于拥有修改仓库的权限**。

更关键的是，GitHub 明确提醒：在 Slack 线程中 @GitHub 时，Agent 会把**整条线程**纳入上下文，并将相关上下文保存在它生成的工件中。GitHub 还为任务建立独立的 Slack Code 频道，用来集中引导会话，显示仓库、分支、状态和关联 PR；一个任务对应一个这样的协作空间。共享上下文生成的 PR 在已有至少一人批准要求的仓库中，默认还会多要求一次批准，以补偿工件不归属于具体个人的情况。

这些是 GitHub 公开的 **Slack** 行为；不能据此假定 Teams 的权限、上下文采集与审批细节逐项完全相同。11 月 6 日公告确认了两种 IM 入口的正式可用，却没有在公告里展开所有平台的同等契约。

## 真正暴露的问题：讨论、授权和责任并不重合

一条群聊线程可能包含任务发起者的明确要求、同事的补充、错误的猜测、被转发的外部文本，甚至互相矛盾的决定。Agent 把它们读作上下文是合理的；**把所有上下文都当成可以执行的命令，就不合理了**。

第一层是**发起权**。谁能让 Agent 开始一个会消耗预算、触碰仓库或外部服务的任务？群成员能看到机器人，不代表群成员有权选择任何仓库、使用任何工具。GitHub 的写权限门槛把“参与讨论”和“操控修改”分开，但这仍然需要每个集成自行实现，不能靠提示词提醒模型“请遵守权限”。

第二层是**执行身份**。共享频道产出的 PR 以应用身份创建，这有利于识别自动化行为，却也使“谁说了算”不能仅从 GitHub 工件的作者字段得知。公告新增的来源标注能帮助追溯发起者，但**来源标注不是授权凭证**，更不是对群里每句话的共同背书。额外审批是一种防护，而不是证明所有上游讨论都可信。

第三层是**上下文的可见性**。完整线程进入 Agent 工件，意味着原本只在一个群里出现的内容，可能随着 Issue、PR、日志或协作工件进入另一套可见性体系。即使不涉及密钥，也可能包含内部争论、个人信息或未审定的产品判断。将对话带进代码仓库，不只是提高模型理解力，还涉及信息最小化与保留期限。

第四层是**任务生命周期**。聊天消息、Agent 会话、代码分支、PR、审查和部署具有不同的完成条件。机器人回复“已经修好”，既不等于 PR 已合并，也不等于真实功能已验收。让这些状态各自可追踪，比在群里生成一条漂亮的总结更重要。

## Mira 的真实实践能说明什么

这里对照的是本次读取的 [Cloud Pi 当前 `dev` 源码](https://github.com/uichat-mira/cloud-pi/tree/dev/src)、[产品设计 v0.2](https://github.com/uichat-mira/cloud-pi/blob/dev/docs/product-design.md)及 [AGT-039 Issue #50](https://github.com/uichat-mira/cloud-pi/issues/50)。**这些不是 Mira 已实现“群聊改代码”的证明。**

Cloud Pi 的飞书入口 [`channel.mjs`](https://github.com/uichat-mira/cloud-pi/blob/dev/src/channels/feishu/channel.mjs)把普通聊天和显式的 `/research <主题>` 分开：普通文本只进入单轮 Agent，只有命令前缀匹配才触发已有研究执行；每个聊天有队列，事件先去重，`/stop` 会取消活动运行并丢弃停止前排队的工作。回复绑定原消息。这样的边界不复杂，却让“聊天内容”不能随意升级为高成本研究任务。

当前 [飞书路由策略](https://github.com/uichat-mira/cloud-pi/blob/dev/src/channels/feishu/policy.mjs)允许平台可投递的私聊；群聊必须验证确实 @ 了机器人，且不再使用本地群白名单作为普通聊天准入。这符合产品设计中“平台负责接触机器人，私有工具另行授权”的方向。[`runtime.mjs`](https://github.com/uichat-mira/cloud-pi/blob/dev/src/channels/feishu/runtime.mjs)对普通聊天明确传入空的工具列表，使用私有临时工作目录；公开研究与拥有者私有 Guanlan 凭证也被区分。当前实现采取保守策略：当研究运行环境配置了私有 Guanlan MCP URL 时，飞书公开研究会拒绝执行，而不是声称已完成细粒度凭证隔离。这是一种可见的能力限制，不应包装成完整的身份委托系统。

对企业微信也不能照搬“已经全部开放”的结论。本次读取的 [WeCom 路由源码](https://github.com/uichat-mira/cloud-pi/blob/dev/src/channels/wecom/policy.mjs)仍包含本地用户/群白名单判定；[AGT-039](https://github.com/uichat-mira/cloud-pi/issues/50) 明确把修正公开聊天准入、接通安全临时研究列为待完成工作。产品决策与当前代码并非完全一致，这个差距必须写出来。

Cloud Pi 当前有消息路由、运行取消、研究报告和投递接缝，却**没有从这些代码证明：飞书或企业微信群消息能够创建工程 Issue、修改仓库或启动写代码的 Agent**。更不应把 Cloud Pi 的 IM 入口，与 Mira Organization 的工程派工和审查权限合并成一套“群里谁都能派工”的事实。

反过来，这个小而清楚的运行时恰好说明：即使不做代码 Agent，聊天入口也已经需要区分**谁能说话、什么命令能触发昂贵工作、工作使用哪套工具、结果回到哪里、失败与取消如何留痕**。将来如果接入工程执行，新增的不是一个 `createIssue` 工具那么简单，而是要让仓库写权限、任务合同、来源身份与审查结果分别成立。

## Mira 可以借鉴什么，不必复制什么

GitHub 的设计有一个值得保留的原则：**讨论是任务来源，受信任的执行主体才是权限来源，PR 是交付工件而不是聊天记录的延长线**。对于 Mira，若未来真的把 IM 接入工程施工，最小的工程问题应是：能否在执行前绑定可信发起身份、明确仓库与任务范围、冻结必要的上下文引用、限制工具和预算，并让成果回链到同一条可审查的任务记录。

但这仍是一个**可能的设计方向**，不是 Cloud Pi 已立项的功能，更不是要求它复制 Slack Code、建立通用任务平台或绕过 Mira Organization 的 Issue 授权规则。Cloud Pi V1 的主目标仍是安全研究、定时投递和 IM 协作。不能因为外部产品把聊天接到了 PR，就把 Mira 当前明确的产品边界改写掉。

真正值得现在检查的，是既有 IM 研究链路的上下文与身份是否始终隔离：来自群里的主题能否污染私有研究，群里其他人的话是否会被误当成拥有者指令，运行记录能否把请求、工具能力、结果与投递目标关联起来。它们不需要“群聊写代码”才有价值。

## 还有什么不确定

GitHub 的公开文档说明了权限门槛、应用身份、完整线程上下文和额外审批规则，但没有因此证明每种复杂群聊都能正确判断授权意图，也没有提供这些机制降低事故率的可比较数据。不同组织的仓库规则、IM 管理策略和数据保留方式会改变实际风险；Slack 的详细行为不能自动外推到 Teams。

Mira 一侧，本次核验的是 `dev` 代码、产品合同与开放 Issue，没有进行真实飞书/企业微信 Live 测试，也没有验证生产部署。公开研究与私有凭证在不同配置组合下的行为，还需要对应测试和运行证据。是否允许团队聊天触发工程变更，涉及产品边界与权限裁决，不能由一篇雷达文章代替。

**群聊可以是 Agent 工作的起点，却不应该成为授权的终点。** 当一句“你去做”开始真的产生代码、报告和外部副作用，系统必须说清楚：是谁委托的、依据什么权限、哪些话只是背景，以及谁来证明它做对了。

**主要一手资料：** [GitHub：@GitHub 在 Slack 与 Teams 正式可用（2026-11-06）](https://github.blog/changelog/2026-11-06-github-copilot-in-slack-and-teams-is-generally-available/)；[GitHub Docs：Integrating Copilot cloud agent with Slack](https://docs.github.com/en/copilot/how-tos/copilot-integrations/integrate-cloud-agent-with-slack)；[GitHub：跨入口 Cloud Agent 体验（2026-10-28）](https://github.blog/changelog/2026-10-28-work-from-anywhere-with-a-new-connected-copilot-cloud-experience/)；Cloud Pi `dev` 源码、产品设计与 AGT-039 Issue（见正文链接）。
