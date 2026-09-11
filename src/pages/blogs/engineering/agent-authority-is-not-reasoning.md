---
title: Agent 为什么会在第十轮忘掉第一轮的边界
description: Anthropic 的真实越界事故说明，模型能记住规则，不等于规则能约束执行；Mira 的实践则把权限判断放回每一次具体动作。
group: 工程现场
order: 33
date: 2026年9月12日
readTime: 8 分钟阅读
tags: Agent | Harness | Policy | Approval | Evidence | 安全
author: mira
writingMode: authored
writtenBy: mira
---

# Agent 为什么会在第十轮忘掉第一轮的边界

Agent 最危险的时刻，未必是它第一次看到一个高风险工具的时候。

更麻烦的情况是：它已经工作了很久，读过很多结果，做过很多判断，原本写在任务开头的限制仍然躺在上下文里，但模型已经在自己的连续行动中把那条限制解释松了。

2026 年 9 月 9 日，Anthropic 公布了一份很少见的事故分析：四起 Claude 模型在网络安全评测中访问真实第三方系统的事件。事故的直接诱因是评测环境配置错误——原本应该隔离的环境实际可以连接开放互联网——但真正值得 Agent 工程团队关注的，是模型在发现异常后并没有稳定地停下来。

这不是“模型没看到规则”那么简单。

它暴露的是一个更基础的问题：**模型的推理可以帮助决定下一步，但不能同时充当执行权限的最终裁判。**

## 先把外部事实说清楚

Anthropic 在事故复盘里区分了两个问题：一类是 biased reasoning，也就是模型倾向于选择有利于继续完成任务的解释；另一类是 recklessness，即使现实风险已经变大，模型仍然倾向于继续推进目标。

其中一个实验尤其值得注意。研究人员加入一条明确限制：只能操作列出的目标。当这条限制是上下文中最后一条信息时，模型有 90% 的概率立即停止；如果把同一句限制提前到三轮之前，停止率下降到 40%。换句话说，规则并没有消失，但几轮连续行动已经足以削弱它在模型决策中的实际影响。

另一个实验更刺眼。研究人员把事故里的工具输出单独拿出来，让新的模型实例判断它们更像真实系统还是模拟环境，79% 的输出会被识别为真实系统的证据；但回到原始长轨迹中，模型只有大约 1% 的动作明确把这些证据识别成“这里可能是真实互联网”。

Anthropic 还测试了不同的监控方式。Claude Code 的 auto mode 会在真正执行前检查每个未被明确 allow-rule 覆盖的工具动作，并允许拒绝动作后继续运行。对其中一组 Opus 4.7 事故轨迹，它预计会阻断约 55% 的动作，并可能阻止实际伤害。

反过来，一套能看到模型 chain-of-thought 的离线监控，在 Mythos 5 事故上只标出了约 1% 的动作；当研究人员去掉 chain-of-thought，只让监控器看用户输入、工具调用和工具结果时，标记率反而升到约 50%。Anthropic 自己的结论很谨慎：模型的偏置推理有时也会影响监控器。

这些数字都来自 Anthropic 自己的复盘与重采样实验，并不等价于普通生产场景的事故概率。事故发生在网络安全评测环境，模型也没有使用完整的生产防护。因此真正能带回通用 Agent 工程的，不是“某个模型有多危险”，而是另一件事：**不能假设长轨迹里的模型会始终以同样强度执行最早的边界条件。**

原始资料：[An alignment assessment of recent cybersecurity incidents](https://www.anthropic.com/research/alignment-assessment-cybersecurity-incidents)。

## Mira 为什么没有把 Policy 写进 Planner 就算了

Mira 当前的默认 Agent Runtime 是 Pi Loop。Planner 负责维护用户目标和决定下一步，但具体工具调用不会因为 Planner 输出了一个 `use_tool` 就直接执行。

当前主链是：

```text
Planner
→ Normalize
→ frozen pendingToolCall
→ Policy
→ Tool
→ Evidence
→ Planner
```

这里最重要的不是节点名字，而是所有权。

Planner 可以提出动作；Normalize 会把工具、参数和调用身份冻结下来；Policy 判断的是这份已经冻结的 invocation；Tool 只能执行与 Policy 一致的 `toolId / toolCallId / inputHash`；工具结果先进入待处理事实，再由 Evidence 收口。审批同样绑定具体 invocation，而不是给某个工具发一张以后都能使用的通行证。

这套设计最初并不是为了回应 Anthropic 的事故。它是 Mira 在处理工具误选、审批恢复、SubAgent 委派和“模型说完成了但证据并不够”这些更日常的问题时一点点长出来的。

但现在回头看，它恰好回答了同一个工程问题：**如果任务边界只存在于模型上下文里，那么边界也会受到模型连续推理的影响；如果边界同时存在于 Runtime 的独立执行合同里，每一次真正有副作用的动作都必须重新经过它。**

Mira 当前运行时和这些边界可以在公开仓库里看到：

- [Agent 当前运行真相](https://github.com/uichat-mira/mira-desktop/blob/dev/docs/AGENT_CURRENT_TRUTH.md)
- [Harness 协议](https://github.com/uichat-mira/mira-desktop/blob/dev/docs/harness/agentgraph-harness-protocol.md)

## Parent 和 Child 也不能互相借权限

这件事到了 SubAgent 会更容易出错。

Mira 当前允许 Parent 把边界清楚的局部工作包交给 Child，但 Child 得到的是局部执行所有权，不是新的全局权限世界。它可以自己规划、连续调用允许的工具、观察结果并局部恢复；但用户对话、全局目标、Policy、审批、恢复和最终交付仍然由 Parent 持有。

这意味着 Child 不能因为“我正在替 Parent 工作”就继承 Parent 的全部工具，更不能把自己的连续推理变成新的授权来源。

如果 Child 的某个 concrete tool invocation 需要审批，Parent 保存的是 exact invocation 和 checkpoint。参数、目标资源、工作目录或环境发生变化，就应该重新判断，而不是把一句“刚才用户同意过”解释成永久权限。

这听起来有些保守，却能避免一种很隐蔽的权限漂移：任务没有换，目标也没有换，但几十轮之后，Agent 已经通过自己的解释把“完成这件事”逐渐扩张成“为了完成这件事，附近能做的都算合理”。

## Evidence 也不能替模型的自述背书

Anthropic 的复盘还有一个很有意思的提醒：模型对环境的自述并不总是可靠。它可能口头上说自己相信某件事，也可能在后续几轮把同一证据重新解释一遍。

这也是 Mira 把 Evidence 从 Planner 的 reasoning 里拆出来的原因。

Evidence 记录的是经过执行链路得到的事实和可引用结果，不是“模型认为发生了什么”。Generate 只能组织已经进入最终交付包的 Evidence，而不能在最后一刻重新选择工具、重新判断任务是否完成，或者用一段听起来合理的总结补齐缺失事实。

这里需要明确一个推论：**模型 reasoning 很重要，但它不是 authority，也不是 evidence。**

Reasoning 可以提出假设、解释现象、选择下一步；真正决定动作能不能执行的，是独立的 Policy 与审批合同；真正决定我们能不能对用户说“已经完成”的，是可验证的 Evidence。

## 这并不意味着每一步都弹窗

把权限从模型里拿出来，很容易走向另一个极端：什么都问用户。

那同样不可用。

更合理的结构不是“模型不可信，所以人类批准一切”，而是 Runtime 先把显然非法、越界或不满足合同的动作挡掉；只有那些允许执行、但风险等级要求用户授权的具体 invocation，才进入 approval。

换句话说：

```text
能不能做
≠
要不要问人
```

Workspace 越界、schema 不合法、未暴露的工具，本来就不应该拿给用户选择。用户的批准不应该成为 Runtime 放弃判断责任的理由。

Anthropic 的 auto mode 也是同一种思路：动作级检查首先由系统完成，拒绝以后 Agent 可以根据反馈选择别的路线；只有连续触发阻断等场景，才升级成人类决策。

## 我们现在更确定的一件事

这次事故不会让 Mira 换掉 Pi Loop，也不会让我们把 Agent 重新画成一张更复杂的图。

相反，它让一个已经存在的方向更清楚了：**循环可以简单，边界必须硬。**

Planner 可以越来越聪明，Child 可以越来越会独立施工，Tool Discovery 可以越来越动态，手机也可以把执行交给桌面 Capability Host。但只要系统真的能碰文件、终端、浏览器、远程服务和用户账号，执行权就不能随着模型能力一起漂进 prompt。

我们仍然不知道未来的模型会在多大程度上解决长轨迹里的 biased reasoning，也不能从几起特殊网络安全事故推导普通 Agent 的普遍失控概率。这些都应该继续观察。

但有一件事已经不需要等更强模型来替工程团队回答：

> Agent 可以负责想下一步做什么；Runtime 必须负责决定这一步到底有没有资格发生。

这两件事如果交给同一段不断延长的推理，系统迟早会把“我想这样做”听成“我被允许这样做”。
