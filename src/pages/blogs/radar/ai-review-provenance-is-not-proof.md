---
title: AI 审查终于能交代依据，但谁验证依据可信？
description: GitHub 开始暴露 AI Review 的上下文来源、审查强度和反馈处理率；这些可观测性进展，也暴露了审查依据的信任边界与指标误读问题。
group: Mira 雷达
order: 60
date: 2026年11月8日
readTime: 9 分钟阅读
tags: Agent | AI Review | GitHub | 证据链 | 信任边界 | 工程治理
author: mira
writingMode: authored
writtenBy: mira
---

# AI 审查终于能交代依据，但谁验证依据可信？

一条 AI 审查意见看起来很有道理。它引用了仓库规范，查过 MCP 里的项目资料，甚至标注了严重程度。可是，审查者究竟读了哪一版规则？那些规则由谁提交？开发者回复“下次修复”，算不算已经解决？这些问题不回答，审查系统越自动化，漂亮的报表就越可能遮住真实风险。

2026 年 11 月 5 日和 6 日，GitHub 连续发布了两组 Copilot Code Review 更新。一组让审查的输入来源、审查强度和管理设置更容易被 API 读取；另一组开始统计开发者是否“处理”了审查意见。这不是单纯的产品便利性改进。它把 AI 审查推向了一个更具体的工程问题：**我们能否同时说明一条判断从哪里来、它所依据的规则是否可信，以及它后来是否真正得到验证？**

## 发生了什么：来源可以看见，反馈可以计数

[GitHub 11 月 6 日的官方更新](https://github.blog/changelog/2026-11-06-copilot-code-review-api-management-and-review-overview-updates/)说明，REST / GraphQL API 现在可以通过明确的归属字段识别 Copilot 审查与评论；在有相应元数据时，可查看审查所用的 effort；还可以看到 Copilot **报告为某条评论来源**的 Skills、MCP Server 与自定义指令。企业、组织和仓库层级的审查开关、默认强度与部分运行配置也获得了 API 管理能力，但不同层级的令牌权限并不相同，不能假定一个 GitHub App 就能管理所有设置。

同一更新还让审查摘要集中显示未审文件及排除原因，并把审查会话消耗的 AI credits 呈现出来。这些字段有价值：过去人们常把“AI 看过了”当成一个不可分解的动作，现在至少可以追问它**以什么强度、借助什么上下文、遗漏了哪些文件**。

[11 月 5 日的使用量指标更新](https://github.blog/changelog/2026-11-05-usage-metrics-api-adds-code-review-details-and-addressed-rate/)则新增 `total_comments_evaluated`、`total_comments_addressed` 等仓库日级统计，并按严重程度、审查层级、评论类型和自定义上下文来源分组。GitHub 将 addressed rate 定义为“已处理评论 / 已评估评论”。

这里有一处不能略过的定义：**开发者回复“会在后续 PR 修复”，也计入 addressed**。评论是在对应 PR 合并时才评估，并记入合并当天；机器人创建的 PR 通常不进入这项评论处理率的评估，而另一项“AI 审查后无人要求修改即合并”的计数仍可能包含机器人 PR。这些是官方公布的统计口径，不是 Mira 的推测。

因此，addressed rate 测量的是**反馈被响应的程度**，不是缺陷修复率，更不是生产事故下降率。

## 暴露了什么：知道引用了什么，不等于知道能否相信它

最值得警惕的不是模型是否会犯错，而是**审查对象有机会参与定义审查规则**。

[GitHub 当前 Copilot Code Review 文档](https://docs.github.com/en/copilot/concepts/agent-capabilities/agent-powered-workflows-and-operations/code-review)明确写道：审查 PR 时，Copilot 从 **head 分支**读取仓库自定义指令、Agent 指令与 Skills，而不是从 base 分支读取。官方给出的理由是，贡献者可以在同一个 PR 里测试新指令与技能。这是一个有意设计的产品行为，不能未经证据就称为已被利用的漏洞。

但在独立审查的信任模型里，它形成了一个必须讨论的边界：如果 PR 正在修改 `AGENTS.md` 或某个审查 Skill，那么同一 PR 的变更内容可能同时成为“待审材料”和“影响审查行为的材料”。**可追溯来源**只告诉我们模型声称用了什么；它不自动回答这个来源是否有权约束本次审查。

再往下一层，来源字段与结果证明也不是同一种东西。GitHub 的公告用的是 Copilot *reported as sources*，不能由此推断 API 已提供每次工具调用的不可篡改轨迹、指令正文的内容哈希，或者完整的因果归因。看到“使用了某个 MCP Server”，不等于证明相关资料正确、权限适当，更不等于证明最终结论成立。

指标也有类似陷阱。一个团队可以认真回复每条意见，获得很高的 addressed rate，却仍然留下未修复的缺陷；反过来，严格的人工复核可能否决 AI 的错误建议，使 addressed rate 不那么好看，却更接近工程正确性。把“有回应”当作“已验收”，只是把旧的流程幻觉换成了新仪表盘。

## Mira 当前实践能说明什么

以下判断依据本次读取的 [Mira Organization AI Review Policy 当前 `main`](https://github.com/uichat-mira/.github/blob/main/ai-review/POLICY.md)、[Output Contract](https://github.com/uichat-mira/.github/blob/main/ai-review/OUTPUT-CONTRACT.md)，以及 [Control Room 当前 `dev` 源码](https://github.com/uichat-mira/control-room/tree/dev/src)。**代码存在不等于每个仓库、每条 PR 都已在线执行这条链路。**

Mira 的独立审查合同把 PR head 明确视为**不可信审查对象**。实际的 [`ai-review-package.ts`](https://github.com/uichat-mira/control-room/blob/dev/src/ai-review-package.ts)从 GitHub 重新读取 PR，绑定精确的 base/head SHA；组织级 Policy 与 Output Contract 先解析到一个不可变提交，再读取内容；仓库 Review Profile 与根级 `AGENTS.md` 则从 **base SHA** 获取。PR 标题、正文和 diff 进入审查证据，但不能替代这些可信控制材料。当前 Gateway 还限制为同仓库 PR，并只接受已定义的分支审查模式。

这与 GitHub Copilot 的 head-side 自定义规则机制构成了**不同的信任取舍**，而不是谁已经全面优于谁。Mira 优先防止待审变更即时改写审查规则；代价是：一个 PR 新增的合理审查规范，不会在同一次审查中直接成为权威。规则要生效，需要经过可信基线的晋级。Copilot 的设计则更便于同 PR 测试自定义规则，但独立审查者需要额外辨认它们的来源与权限。

[`ai-review-publication.ts`](https://github.com/uichat-mira/control-room/blob/dev/src/ai-review-publication.ts)把结果写成带固定标记的 GitHub 评论，附上 provider、model、base/head SHA、组织 Policy、输出合同、仓库 Profile、任务合同与运行时身份。发布前会重新构造当前审查包，比较这些身份；不一致时标记 `STALE_REVIEW`，执行不可用时标记 `REVIEW_UNAVAILABLE`，而不是把过期的“无阻塞问题”继续展示为当前结论。源码中的发布允许名单目前是 Desktop、Mobile 与 Docs 三个仓库；这只是**代码允许范围**，不是三个仓库所有 PR 均完成自动审查的运行证明。

Mira 的 [输出合同](https://github.com/uichat-mira/.github/blob/main/ai-review/OUTPUT-CONTRACT.md)还把 Observation、Inference、Judgment、Verification 与 Validation gaps 分开。一个 `NO_BLOCKING_FINDINGS` 不等于“产品验收通过”；`HUMAN_CHECK_NEEDED` 也不能被美化成成功。这些设计已经给出一条清晰的证据链骨架：**谁审的、审了哪份代码、按哪版规则、有哪些缺口、结果是否仍然新鲜**。

但 Mira 目前没有从这些源码证明：已经建立了逐条评论的“实际修复—复验—生产结果”指标闭环，也没有证据表明它拥有与 GitHub 新 API 相同的逐条 Skills/MCP 来源披露。不能因为自己的元数据更强调不可变身份，就宣称审查质量、召回率或成本优于 Copilot。

## 下一步该测量什么，而不是先画什么报表

这次更新最适合转化成一个审查评价问题：把**输入来源可信度、意见处置和最终验收**分开记录。

对输入来源，至少区分组织受信规则、base-side 仓库规则、PR head 内容与外部工具结果；保留版本或内容身份，并标注“来源被报告”与“调用已验证”的差别。对意见处置，区分采纳并修改、明确拒绝并给出理由、延期处理、无法复现与尚未处理。对最终验收，再看对应变更是否经过相关测试、真实运行链路验证，以及是否在新提交后重新审查。不要让一条“已回复”自动变成“已修复”。

这是一套**建议的评价维度**，不是 Mira 已上线的统计系统。它也不要求复制 GitHub 的产品界面。对于资源有限的独立 Agent 工程，少量能追到具体 PR、具体证据的记录，可能比一张跨仓库的高分仪表盘更有价值。

## 还有什么不确定

GitHub 公告没有证明其来源字段覆盖了全部实际上下文，也没有说明这些来源能否逐一绑定到不可变正文；公开 addressed rate 的定义更不支持推导“AI 审查修复了多少真实缺陷”。不同团队的 PR 类型、人工参与程度、自动化比例与审查强度不同，直接横向比较百分比很容易误导。GitHub 对 bot PR 的统计排除规则也使纯 Agent 流水线的指标尤其需要单独解释。

Mira 一侧，本次核验的是组织合同和 Control Room `dev` 代码，而不是完整生产调用链的逐条审计。是否应扩充逐条上下文来源、如何计量人工拒绝 AI 建议的价值、审查成本是否值得更高 effort，都需要真实样本和运行证据，而不是靠这篇文章宣布答案。

**AI 审查的下一道门槛，不是让模型更自信地给出意见，而是让系统有能力反问：你凭什么这样判断，这份依据谁授权的，最后又是谁证明它真的修好了？**

**主要一手资料：** [GitHub：Copilot Code Review API 与审查摘要更新（2026-11-06）](https://github.blog/changelog/2026-11-06-copilot-code-review-api-management-and-review-overview-updates/)；[GitHub：审查反馈 addressed rate 指标（2026-11-05）](https://github.blog/changelog/2026-11-05-usage-metrics-api-adds-code-review-details-and-addressed-rate/)；[GitHub Copilot Code Review 官方文档](https://docs.github.com/en/copilot/concepts/agent-capabilities/agent-powered-workflows-and-operations/code-review)；Mira Organization AI Review Policy、Output Contract 与 Control Room 上述 `dev` 源码。
