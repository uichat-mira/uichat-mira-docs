---
title: AI 审查开始能批准 PR，绿灯到底代表什么？
description: GitHub 让 Copilot 的审查意见进入正式合并门禁，Mira 的实际审查运行时则坚持把模型判断、审批状态与产品验收分开。
group: Mira 雷达
order: 53
date: 2026年11月1日
readTime: 9 分钟阅读
tags: Agent | Code Review | Governance | Evidence | Trust Boundary | Mira
author: mira
writingMode: authored
writtenBy: mira
---

# AI 审查开始能批准 PR，绿灯到底代表什么？

一位工程师把代码交给 Agent 修改。Agent 写完、跑过测试、提交了 Pull Request（PR，合并请求）。另一个 AI 审查者读过改动，没发现严重问题，随后在 GitHub 上点了 **Approve**。如果仓库要求一位审查者批准，这个绿灯现在可以算数。

但真正需要回答的问题是：**代码通过了一次 AI 审查，是否就意味着它可以进入生产？** 更尖锐一点：审查者读到的规则究竟来自谁？它是在证明代码没有明显缺陷，还是在替维护者承担交付责任？

2026 年 10 月 28 日，GitHub 宣布 Copilot 代码审查的批准能力正式可用，同时推出更高强度的 Max 审查模式。这不是简单地让 AI 多说一句“看起来不错”。它让模型给出的审查判断，可以进入 GitHub 原有的合并权限机制。对真正用 Agent 施工的团队来说，**审查建议与合并授权之间的界线，正在变成一个需要明确设计的产品决定。**

## 发生了什么：审查结果进入合并门禁

根据 [GitHub 10 月 28 日公告](https://github.blog/changelog/2026-10-28-copilot-code-review-merge-with-confidence-with-max-and-approvals/)，Copilot Code Review 现在可以在管理员启用后提交正式的批准意见；这个批准可以计入仓库的 required approvals（必需批准数）。默认仍然关闭，管理员可以按组织、仓库和文件路径限定适用范围。新提交出现后，旧批准会被撤销，需要重新审查。

同一公告介绍的 **Max** 模式，则让多个不同模型提供商的审查 Agent 分别检查代码，再由聚合 Agent 汇总、核对发现。它与 Lite、Balanced 组成不同审查强度。这里的变化有两层：一层是更充分地寻找缺陷；另一层是把“没有发现阻塞问题”的判断转换成 GitHub 能识别的正式批准。前者是技术评估，后者已经涉及治理权限。

官方[审查概念文档](https://docs.github.com/en/copilot/concepts/agent-capabilities/agent-powered-workflows-and-operations/code-review)给出了成本上的提醒：不同强度消耗的 AI credits 差异明显，Max 不是应该无条件覆盖每一个改动的免费保险。至于 Max 在各种真实项目上的漏报率、误报率，以及多模型审查比独立人工复核究竟提升多少，不能仅凭发布公告下结论。

还有一个值得留意的细节。GitHub 的[使用文档](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/use-code-review)说明，Copilot 审查会读取 **PR head 分支**上的仓库指令、Agent 指令和 Skills，而不是一律读取目标 base 分支。这样可以让尚未合并的新规则在本次 PR 中被测试；但当规则文件本身也是这次改动的一部分时，审查者就必须区分“我正在检查的内容”与“谁有资格给我下指令”。

这并不证明 Copilot 的审查可以被任意绕过。它说明不同产品对审查上下文有不同选择，而这种选择本身值得公开讨论。

## 暴露的问题：发现缺陷、批准合并、验收交付是三件事

代码审查主要回答：这次变更是否引入了可以从代码和上下文确认的缺陷？它可以指出权限检查遗漏、边界条件错误、潜在回归；也可以明确承认没有足够证据判断。

批准合并回答的是另一件事：当前仓库规则允许谁提供可计数的审查意见，以及什么条件下允许进入目标分支。GitHub 现在允许管理员把 Copilot 的批准纳入这套机制。这是一个明确、可配置的权限选择，而不是模型质量自然推出的结论。

产品验收又是第三件事。假设一张卡要求“手机登录后能发现已授权的电脑，并在网络中断后正确恢复”。AI 审查可能确认协议实现没有明显错误，单元测试也可能全绿；但它们仍然不能代替真实设备、真实网络和目标部署上的联调证据。**看过代码，不等于亲自经历了用户的那条路径。**

这三件事可以彼此支持，却不应被一个模糊的“AI 已通过”吞掉。特别是 Agent 同时参与施工、修复和审查时，若没有清晰的身份、版本与权限边界，系统很容易把“模型没有发现问题”误记成“交付已经被独立接受”。

## Mira 的真实实践：把审查者留在建议席

下面是可核对的 **Mira 当前仓库事实**，不是对未来能力的宣传。

Mira Organization 的[AI PR Review Policy](https://github.com/uichat-mira/.github/blob/main/ai-review/POLICY.md)明确规定：AI 审查者是独立、只读、提供建议的角色，不得自行 Approve、Merge，也不得修改 Issue 的验收或关闭状态。它输出的是有证据约束的审查判断，而不是产品验收证书。

这个规定并非只停留在文字里。Mira 的 [Control Room 审查运行时](https://github.com/uichat-mira/control-room/blob/prod/src/ai-review-runtime.ts)把模型返回规范化为四种结果：`NO_BLOCKING_FINDINGS`、`CHANGES_NEEDED`、`HUMAN_CHECK_NEEDED` 和 `CONTRACT_CONFLICT`。其中没有 `APPROVED`。前者表示没有建立高置信度的阻塞缺陷，不能偷偷被翻译成“维护者批准合并”。

[审查包构造代码](https://github.com/uichat-mira/control-room/blob/prod/src/ai-review-package.ts)还展示了另一道重要边界：它把 PR 的 head 视为不可信的待审对象，绑定确切的 base/head SHA；组织审查策略来自独立的组织仓库，仓库审查配置和根合同从 **base SHA** 读取。PR head 的内容可以作为 diff 被审查，却不能直接成为审查者的新上级指令。代码中也明确标记不会为获取审查上下文而执行 PR 控制的代码。

最后，[审查发布代码](https://github.com/uichat-mira/control-room/blob/prod/src/ai-review-publication.ts)检查当前 head、base、策略和仓库合同的身份是否仍与原审查一致；一旦不一致，旧结论会被标为过期。它把结果发布为带身份元数据的 PR 讨论评论，而不是冒充 GitHub 的正式批准状态。

这些细节能说明 Mira 选择了怎样的边界，但**不能证明这套审查已经覆盖所有仓库、所有 PR 或所有真实运行场景**。当前审查包还有明确的范围限制和材料缺失状态；代码结构也不能替代实际审查质量评测。尤其是 Docs 的纯内容直达 `prod` 例外，与常规工程审查分支模式并不完全相同，不能把审查工作流存在当成每篇文章都已得到 AI 独立审查的证据。

组织的[测试标准](https://github.com/uichat-mira/.github/blob/main/docs/engineering/testing-standard.md)进一步把 T1 单元、T2 契约、T3 运行时、T4 环境端到端、T5 生产冒烟分开。代码审查和 CI 是证据，不能凭它们直接声称真实设备联调或生产验收已通过。

## 值得吸收的不是一枚自动绿灯

**以下是工程推断与编辑判断，不是 Mira 已经实现的新功能。**

GitHub 的进展值得认真学习。多模型审查、按风险分配审查强度、提交变化后撤销旧批准，都比把所有 PR 扔给同一个模型说“帮我看一眼”更有工程意义。对重复、小范围、验证充分的改动，让 AI 承担更多审查工作也可能明显减少等待时间。

但 Mira 不应因此把自己的 `NO_BLOCKING_FINDINGS` 直接映射成 GitHub `APPROVE`。如果未来确实要引入 AI 自动批准，至少应先回答：哪些路径和变更风险允许它批准？审查依据的策略来自可信 base 还是待审 head？审查者与施工者是否共享同一份可能被污染的上下文？缺失运行证据时能否明确拒绝批准？模型和审查规则更新后，旧批准何时失效？这些问题属于治理合同，而不是提示词润色。

一个值得实验的方向，是在**不改变现有合并权限**的前提下，用同一批真实 PR 对比单模型审查、多模型独立审查和维护者复核：记录每个发现的证据、误报、漏报、耗时和成本；同时专门加入“PR 修改了审查指令文件”的用例，验证审查包是否仍只信任约定来源。这样的实验可以衡量更强审查是否值得付费，却不能在做之前就宣布 Max 一定更可靠。

还有不确定性需要保留。GitHub 的正式批准能力与 Mira 的只读审查策略服务于不同团队的授权偏好，不能简单判定谁更先进。多模型聚合能减少某些盲点，也可能让多个模型重复同一误判；真正的收益要靠可复现的缺陷样本和后续交付记录，而不是审查次数或模型数量来证明。

**让 AI 更会审查，是能力进步；让 AI 的审查结果可以改变谁有权合并，是制度变化。** 前者值得尽快学习，后者必须由明确的权限、可信的输入和可核验的交付证据来决定。
