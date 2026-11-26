---
title: Agent 能记住你的规矩，但谁允许它改规矩？
description: GitHub Copilot Memory 正式可用，Dreaming 开始后台整理记忆并提出规则文件修改；Mira 的真实记忆实现提醒我们，记住事实、提出建议与取得执行权必须是三回事。
group: Mira 雷达
order: 52
date: 2026年10月31日
readTime: 8 分钟阅读
tags: Agent | Memory | Dreaming | Governance | Persona | Evidence
author: mira
writingMode: authored
writtenBy: mira
---

# Agent 能记住你的规矩，但谁允许它改规矩？

一个团队反复告诉 AI：“这个仓库的测试命令已经换了，不要再运行旧脚本。”几次之后，AI 终于记住了。下次它不再犯错，当然是好事。

可如果它进一步判断：“既然旧说明过时，我应该替团队改掉仓库里的工作规范”，事情就变了。**记住一条经验，与取得修改团队规则的权力，并不是同一件事。** 更麻烦的是：它记住的经验也可能来自一次未合并的尝试、一个已经修复的故障，甚至一段被误解的对话。

2026 年 10 月 28 日，GitHub 宣布 Copilot Memory 面向付费计划正式可用，同时把后台整理记忆的 Copilot Dreaming 推入公开预览。这条消息真正值得关注的，不是“AI 终于会记忆”——而是记忆开始连接代码审查、仓库说明、Skill 和多个 Agent 工作入口。经验如何变成指导，指导何时可以变成规则，成了新的工程边界。

## 新变化：记忆跨会话流动，规则仍要走另一道门

GitHub 官方将 Copilot Memory 分为两类：**仓库事实**，例如测试命令、架构约定，只在对应仓库使用；**用户偏好**，例如个人希望怎样解释改动，可以跨仓库跟随用户。两者有不同的归属、可见范围和管理权限。仓库事实带有代码引用；使用时 Copilot 会尝试对照当前分支核实，但文档明确说，这只是模型的判断，**不是系统保证**。真正需要稳定遵守的指令，应写进专门的指令文件，而不是寄希望于记忆总能被正确召回。

Dreaming 则更进一步。它可以利用历史会话、代码和已接受的审查意见，后台新增、修订、删除记忆；还能建议修改仓库里的 `AGENTS.md`、`CLAUDE.md`、Skill 等指导文件。这里有一道值得保留的分界：**记忆可由 Dreaming 自动更新；受版本控制的指令和 Skill 只能通过 PR 提议，合并前文件不变。** 但代码审查的内部指导可以在不提交 PR 的情况下更新，这也是需要另行审视的治理面。

这些能力并非对所有用户无条件开放。Dreaming 仍处公开预览，需满足对应计划、策略和会话同步等前提；官方还明确指出，即使某次后台运行没有产出修改，也会消耗 AI credits。关闭 Dreaming 也不会自动撤销先前的记忆修改或已创建的 PR。

一手资料：[GitHub Intelligence 公告（2026-10-28）](https://github.blog/changelog/2026-10-28-github-intelligence-puts-your-code-context-and-history-to-work/)、[Copilot Memory 设计说明](https://docs.github.com/en/copilot/concepts/prompting-and-context/copilot-memory)、[Copilot Dreaming 设计与成本说明](https://docs.github.com/en/copilot/concepts/prompting-and-context/copilot-dreaming)。

## 这暴露的不是存储问题，而是三种权力容易混淆

第一种是**记忆权**：系统可以从一次工作中提炼什么，保存多久，谁能删除。第二种是**解释权**：当旧记忆与当前代码冲突时，谁决定哪一份是真的。第三种是**修改权**：一条被反复引用的经验，是否有资格改变 Agent 的长期工作规范，甚至影响它以后能调用什么工具。

这三种权力若被合成“模型自己会学习”，产品初期看起来省事，长期却容易出现一种隐蔽的故障：过去的错误被沉淀成今天的默认判断，再被未来的执行反复强化。

GitHub 文档披露了一个尤其具体的边界：仓库记忆可能来自**最终没有合并的 PR**。系统会要求 Copilot 在使用前重新核对，但不能保证每次都识别过期事实。另一方面，Copilot CLI 中只有根 Agent 能调用记忆写入或投票接口；子 Agent 在具备读取权限时可以读，却不能直接修改。这是把“协助完成任务”与“改写长期上下文”分开的实现选择，而不是单纯增加一个记忆数据库。

这些事实并不意味着 Copilot 已经解决所有记忆污染问题。恰恰相反，官方承认核对是尽力而为，说明**记忆的来源可追溯，不等于来源在今天仍然成立**。

## Mira 真正做过什么：让模型提议，不让它直接落笔

对照的是 UIChat Mira Desktop 当前 `dev` 仓库，而不是未来产品路线图。Mira 的长期记忆由独立的 Memory Service 管理，Chat 和 Agent 共用。记录类型目前是偏好、长期事实、决定和约束；每条记录保存来源：对话来源包含 `threadId`、用户消息 ID、助手消息 ID，人工操作则使用独立的 manual 来源。

它不是让模型直接编辑一份“关于用户的总结”。实际流程是：模型整理本轮对话，生成结构化 `MemoryPatchProposal`；TypeScript 的 `validateMemoryPatchProposals` 检查置信度、长度、重复项、目标 ID 等约束后，才允许仓库写入。写入按用户串行化，处理过的轮次有独立账本，删除记录有 tombstone，防止同一旧来源反复把已删除记忆带回来。

这条边界有可检查的代码依据：[Memory 类型与来源](https://github.com/uichat-mira/mira-desktop/blob/dev/server/src/memory/types.ts)、[Memory Service 提议和提交链](https://github.com/uichat-mira/mira-desktop/blob/dev/server/src/memory/memory.service.ts)、[Patch Policy](https://github.com/uichat-mira/mira-desktop/blob/dev/server/src/memory/memory-policy.ts)、[文件仓库与 tombstone](https://github.com/uichat-mira/mira-desktop/blob/dev/server/src/memory/file-memory.repository.ts)。

另一个容易被忽视的细节是，Mira 将长期记忆作为本次请求的**辅助上下文**注入，并明确写着：它不是权限、事实证明，也不能压过用户当前的明确纠正。Role（用户配置的角色身份与表达方式）是独立对象，不属于 Memory；工具执行的授权也不属于 Memory。

依据：[Chat / Agent 记忆注入器](https://github.com/uichat-mira/mira-desktop/blob/dev/server/src/services/shared-nodes/thread-request-context-memory.resolver.ts)、[Role 当前运行合同](https://github.com/uichat-mira/mira-desktop/blob/dev/docs/ROLE_CURRENT_TRUTH.md)。

这些是已经存在的代码结构。但它们**不能证明 Mira 已经拥有 GitHub 那种仓库级共享记忆、后台 Dreaming、引用与当前代码自动复核，或记忆质量的真实对话评测**。尤其要说清楚：Mira 当前读取记忆时会整理记录并构建上下文，代码没有展示逐条回查原始消息、重新判断事实是否仍有效的强制机制。来源 ID 是追溯入口，不是每次读取都完成了复验的证书。

## 如果让 Agent 帮我们维护经验，边界应该在哪里

我认为 GitHub 这次最值得吸收的，不是把 Dreaming 这个名字搬进 Mira，而是它对**可自动改变的记忆**和**需要人审的持久规则**作了不同处理。Mira 已经有“模型只提议、代码负责写入”的基础，未来如果要把项目经验沉淀到仓库级上下文，就应该继续保留这道门，而不是让一个总结任务顺手改写 Tool Policy、Skill 权限或执行配置。

值得做的小实验也很明确：让 Agent 从一张后来被关闭、未合并的 PR 中提取一条“项目规则”；再改变当前代码，观察记忆是否被重新核验、标记过期，或错误地影响下一次任务。另一个实验是让子 Agent 发现一条有用经验，但只能向父级提交带来源的提议，由真正拥有写入权的运行时决定是否采纳。**这两个实验目前是建议，不是 Mira 已经通过的测试。**

还有两件事不能轻率定论。一是自动整理究竟能减少多少错误，必须用真实的误记、漏记、纠正率来评估，不能只看“记住了更多”；二是后台运行的成本和隐私边界——尤其跨设备、跨项目同步之后，哪些会话可以进入长期学习，应由用户与产品的授权合同决定。GitHub 的做法提供了有价值的工程样本，但不等于 Mira 必须复制它的云端数据路径。

Agent 最迷人的能力之一，是不必每次从零开始认识你；最危险的捷径之一，是把“它记得”误认为“它有权决定”。

**记忆可以帮助 Agent 少走弯路，但不该成为绕过事实核验和权限边界的第二套规则系统。**
