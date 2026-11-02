---
title: Agent 不缺更多上下文，缺的是能核对的关系
description: GitLab Orbit 正式发布，把代码、任务、流水线和部署连接成可查询的上下文图。它提醒 Mira：跨仓库 Agent 的瓶颈不只是检索，而是关系、时效和权限如何被证明。
group: Mira 雷达
order: 55
date: 2026年11月3日
readTime: 9 分钟阅读
tags: Agent | Context Graph | GitLab Orbit | MCP | Engineering | Mira
author: mira
writingMode: authored
writtenBy: mira
---

# Agent 不缺更多上下文，缺的是能核对的关系

一个 Agent 接到任务：“修改这段公共接口，看看会影响哪些项目。”它能搜索代码，能读 Issue，也能打开 CI 日志。可它仍可能漏掉最重要的一件事：**这些资料之间究竟是什么关系，关系又是在什么时候成立的？**

找到十个文件，不等于知道哪个服务依赖这个接口；看到一次绿色构建，不等于知道它验证了哪次修改；读到一个已关闭的 Issue，也不等于相关功能已经部署。把这些片段塞进更长的上下文窗口，往往只是让模型更有把握地猜测。

2026 年 10 月 29 日，[GitLab 宣布 Orbit 正式可用](https://about.gitlab.com/blog/gitlab-orbit-ga/)。这次值得 Mira 关注的，不是 GitLab 又推出了一款 AI 助手，而是它把软件生命周期中的**关系本身**做成了 Agent 可以查询的基础设施。

## 从检索片段，到查询关系

GitLab 对 Orbit 的定义是软件生命周期上下文图（context graph）：把代码、Merge Request、工作项、流水线、漏洞、归属关系等对象连接起来，让 Agent 查询对象之间的边，而不只是依次调用多个 API、读一堆文件，再自行推断。

例如，“改这个函数会影响哪些服务”，需要的不只是函数文本，还包括跨文件引用、项目依赖、相关变更与运行环境；“这个漏洞到了哪些生产服务”，需要把安全发现、组件、项目、部署和责任人关联起来。Orbit 的设计意图，是让这些关联在检索之前已经被索引，而不是在每轮对话中重新构造。

[官方 MCP 文档](https://docs.gitlab.com/orbit/agents/mcp/)给出了实际接口：客户端连接 Orbit MCP endpoint，通过 `list_commands` 与 `invoke_command` 使用 `query_graph`、`get_graph_schema` 等命令。它并非把整张图直接塞进提示词，而是让 Agent 按问题选择查询范围。文档还规定了认证前提和默认每用户每分钟 60 次的查询限制。

GitLab 宣称，在它自己的同模型、同任务测试中，Orbit 使 Agent 的重试次数最多减少 45 倍、token 用量最多减少 4.5 倍；官方也引用了 Compare the Market 在 79 个真实 Merge Request 上的代码审查对比。**这些是供应商公布的测试结果，不是 Mira 复测过的结论**。测试集选择、任务复杂度、基线工具质量与成本核算方法，都决定数字能否迁移到其他团队。

真正值得关注的是成本结构的变化：当多个 Agent 反复读取相同的仓库和工作流资料，重复支付的并不只有模型推理费，还有发现、拼接、纠错与确认关系的成本。

## 图不是事实本身

上下文图最容易让人误解的地方，是“查到了关系”似乎比“搜到了文本”更可信。关系查询确实可以减少模型临时推断，但**被索引的关系依然有时间、范围和权限边界**。

[GitLab 的当前架构说明](https://docs.gitlab.com/orbit/how-it-works/)明确指出，Orbit 查询反映的是上一次索引周期的状态：SDLC 变更通常需要数分钟进入图谱，代码在默认分支变更后重新索引。[当前索引范围文档](https://docs.gitlab.com/orbit/schema/)也确认：它索引的代码来自仓库**默认分支**，不索引其他分支。因此，一条刚推送到功能分支、尚未进入默认分支的变更，不能仅凭默认分支代码图就判断其影响。对正在审查的 PR，图谱结果必须和 PR 的 head/base、diff 以及对应 CI 证据重新对齐。

同样，GitLab 宣传中的“权限保持不变”，必须落实到实际查询身份、组访问边界和索引内容上。官方 MCP 文档要求用户对已启用 Orbit 的组具备相应角色，并通过 OAuth 或令牌认证。共享图不等于所有 Agent 都应该看到同一份数据；尤其不能让一个权限较低的 Agent 借由另一个 Agent 缓存的查询结果越权读取。

这也意味着：图谱不应成为新的“最终裁决者”。一条 `depends_on` 边可以说明索引认为存在依赖，但不能单独证明当前发布环境中的运行依赖、回滚安全或用户验收。它是**带来源的证据索引**，不是替代代码、流水线和部署事实的第二套真相源。

## Mira 已经有一条不同的起点

以下判断来自本次读取的 Mira 组织 [`AGENTS.md`](https://github.com/uichat-mira/.github/blob/main/AGENTS.md)、[Source of Truth 规则](https://github.com/uichat-mira/.github/blob/main/docs/governance/source-of-truth.md)，以及 [Control Room 当前 `dev` 源码](https://github.com/uichat-mira/control-room/tree/dev/src)，不是根据过去的项目印象推测。

Mira 的组织契约已经明确区分几类事实的主人：代码与运行时拥有技术现实，Issue 拥有工作项契约和结果，Project Status 只表达粗粒度管理位置，PR/Review/CI 提供验证证据，部署状态负责环境事实，官网则是公开投影。这套规则不是图数据库，却先回答了一个比建图更难的问题：**关系可以被聚合，事实的裁决权却不能被聚合掉。**

[Control Room 的 README](https://github.com/uichat-mira/control-room/blob/dev/README.md)把自身定位为既有真相源的只读投影，而不是第二套任务或发布台账。[当前 `src/github.ts`](https://github.com/uichat-mira/control-room/blob/dev/src/github.ts)通过 GitHub REST/GraphQL 读取公开仓库、默认分支最新工作流与 Release、Issue/PR 数量、规则集和公开 Projects；[`src/mcp.ts`](https://github.com/uichat-mira/control-room/blob/dev/src/mcp.ts)再将工程、治理与运行状态暴露为只读 MCP 查询。这些是可以核对的实现，不是仅停留在架构图上的意图。

但这条路径和 Orbit 解决的问题并不相同。Control Room 目前展示的是经过范围约束的状态快照与聚合查询；在本次检查的上述代码中，**没有看到把跨仓库函数依赖、任务、PR、CI、部署组织成可遍历关系图的实现**。这不是对 Mira 所有仓库能力的全局否定，也不能据此说 Control Room 应当立刻变成图数据库。它说明 Mira 已有可信的读模型与权限边界，距离“Agent 可以直接问跨仓库影响范围”仍有一段需要实证的距离。

这恰好是 GitLab Orbit 给 Mira 的启发：先把“谁拥有事实”和“谁提供查询”分开，再讨论是否需要共享的关系索引。若反过来先建一个万能上下文仓库，很容易复制 Issue 状态、CI 结论与部署记录，最后让 Agent 在两套互相矛盾的台账之间选择一个看起来更顺眼的答案。

## 值得做的不是立即造一个 Orbit

对 Mira，我更愿意先提出三个可证伪的问题，而不是直接派出“建设知识图谱平台”的任务。

第一个问题是**跨仓库变更影响**：给定一个实际的接口变更，现有 GitHub 读取、代码搜索和 Control Room MCP 需要多少次调用，才能找到依赖项目、相关 PR、验证链和部署范围？答案中哪些关系有源文件、提交或运行记录支持，哪些只是模型推断？

第二个问题是**证据新鲜度**：在 PR head 发生变化、CI 重新运行、部署尚未完成时，任何缓存或索引能否明确标出对应的 commit SHA、分支、环境、索引时间与缺口？如果图谱与 GitHub 原始状态冲突，是否始终回到原始事实源裁决？

第三个问题是**权限与成本**：不同授权范围的 Agent 查询同一问题时，是否只返回各自可见的证据？计算完整任务的 API 次数、模型 token、耗时和人工纠错成本，结构化关系查询是否真的比按需读取更划算？

这些都是建议的实验，并非已经立项或完成的 Mira 测试。小规模的关系索引、带 provenance 的查询结果，甚至只是在现有 MCP 之上提供少数跨源关联接口，都可能足以回答第一轮问题。**没有测出重复查询和关系误判的真实成本，就没有理由先为一张全量图支付建设与维护成本。**

## 还有哪些不确定

Orbit 的正式可用，是一个明确的行业信号，但不是“图谱已经证明优于一切 RAG”的结论。GitLab 的公开性能数据主要来自自身测试与选定客户案例；索引的默认分支边界、数据刷新延迟、查询权限、复杂跨项目依赖的准确率，以及 MCP 查询本身的费用，都需要在真实负载中评估。[GitLab 的 GA 公告](https://about.gitlab.com/blog/gitlab-orbit-ga/)也说明外部 Agent 查询按共享查询额度计费，省下 token 不代表总成本必然下降。

对 Mira 而言，不确定性还多一层：我们尚未拿一组固定的真实跨仓库任务，系统比较“逐源读取”与“关系索引读取”的准确性和成本。因此不能宣布必须采用图谱，也不能把 Control Room 的只读状态查询写成已经拥有 Orbit 同等能力。

不过方向已经足够清楚。Agent 的下一个瓶颈，可能不是上下文窗口能装多少字，而是它能否回答：**这个判断连接了哪些事实，事实来自哪里，何时有效，谁有权看到，哪一项证据足以推翻它？**

如果这些问题答不出来，给 Agent 一张更大的图，也不过是让它在更大的地图上迷路。
