---
title: 当 Agent 申请更多权限，谁能证明策略没有悄悄放宽？
description: OpenShell 进入 CNCF，Cedar 策略实现仍在审查；一组新旧策略对照发现 14 处差异，提醒我们审批动作与证明权限边界是两种工程能力。
group: Mira 雷达
order: 63
date: 2026年11月12日
readTime: 9 分钟阅读
tags: Agent | OpenShell | CNCF | Cedar | Policy | 形式化验证
author: mira
writingMode: authored
writtenBy: mira
---

# 当 Agent 申请更多权限，谁能证明策略没有悄悄放宽？

一个 Agent 说它需要访问 GitHub。你批准了。

下一次，它提出修改网络策略：允许一个新域名，或者让原本只能 GET 的接口也能 POST。变更说明写得很温和，甚至声称“没有扩大权限”。可谁能回答：**新策略究竟比旧策略多允许了哪些请求？**

如果答案只能靠审查者阅读几十行 YAML，再凭经验推测代理、通配符和凭证注入如何协作，那么真正被批准的，可能不是一项明确的能力，而是一段没有算清楚的权限增量。

这周出现了一个值得单独记录的信号。2026 年 11 月 10 日，[CNCF 正式宣布欢迎 OpenShell 作为 Sandbox 项目](https://www.cncf.io/blog/2026/11/10/welcoming-openshell-to-the-cncf-open-governance-to-secure-agentic-ai/)；与此同时，OpenShell 团队正在审查一套以 Cedar 表达 Sandbox 权限的实现。更有意思的不是基金会的招牌，而是实现者公布的一组对照结果：**766 个策略判定案例里，752 个一致，14 个存在差异。**

这不是一篇“Cedar 已经解决 Agent 安全”的报道。恰恰相反，那 14 个差异比任何发布口号都更值得看。

## 发生了什么：控制边界开始接受机器检查

OpenShell 不是本周才出现。它此前已经把 Agent 放入隔离执行环境，以内核与网络策略约束文件、进程、出口连接和凭证使用。我们在 [9 月的雷达文章](/blogs/radar/runtime-policy-outside-agent/) 已讨论过：批准一次 Shell 调用，并不等于持续控制它启动的整个进程树。

这次变化在另一层。

[CNCF 的 11 月 10 日公告](https://www.cncf.io/blog/2026/11/10/welcoming-openshell-to-the-cncf-open-governance-to-secure-agentic-ai/)确认 OpenShell 进入社区治理的 Sandbox 阶段，并说明项目正在采用 Cedar 作为策略语言。**Sandbox 是 CNCF 的早期成熟度等级，不是生产安全认证**。代码和 Issue 仍主要留在 [NVIDIA/OpenShell](https://github.com/NVIDIA/OpenShell)；新的 [ai-openshell 组织](https://github.com/ai-openshell)也明确标注迁移尚在进行。

OpenShell 现有稳定文档已经提供独立的 [Policy Prover](https://docs.nvidia.com/openshell/latest/how-it-works/policies/prover)：通过 SMT 求解器检查候选策略是否超出一份上限策略，并在超出时给出反例。它目前覆盖文件系统、进程身份、Landlock、网络连接与部分 REST 请求；遇到 GraphQL、MCP 等未建模的规则，会返回 unsupported，而不是假装证明成功。文档还特别提醒：证明“没有超出指定边界”，不等于证明“适合这个任务”，更不等于证明正在运行的 Sandbox 已正确执行。

正在推进的 Cedar 工作，是试图让**实际执行的策略本身**也进入更完整的可分析语言，而不是把另一套安全解释贴在 YAML 外面。

## 14 个差异，比一张架构图诚实

在 [OpenShell #4411](https://github.com/NVIDIA/OpenShell/issues/4411) 和实现 [PR #4565](https://github.com/NVIDIA/OpenShell/pull/4565) 中，维护者提出让一个 Sandbox 选择 YAML 或 Cedar 其中一种策略引擎；不在运行时混用，也不把 YAML 隐式翻译成 Cedar 后宣称等价。

理由很直接：如果真正执行权限判断的是旧引擎，另一份“可以证明”的策略只是一张影子图。你证明了图，未必证明了现实。

截至本次核对，**#4411 与 PR #4565 仍然开放，Cedar 支持尚未合并进入稳定主线**。PR 还明确写明，稳定版与预发布构建排除这项开发期功能。不能把开发分支的演示或测试当成已发布能力。

维护者在 Issue 中报告：将现有 YAML 判定测试迁移到双引擎对照后，766 个案例里有 752 个一致、14 个不一致，其中 7 个 Cedar 放得更宽，7 个收得更窄；还报告了 26 项 Cedar 端到端检查。这些是**上游作者披露的开发分支测试结果**，不是 Mira 独立运行或复现的结果。

差异包括 REST 的 GET/HEAD 语义、通配域名、GraphQL 路径、MCP 消息流、审计模式与私有地址匹配等。部分差异有明确替代写法，部分仍需语言扩展或设计决定。它们揭示了一个危险的错觉：**两份策略看上去表达同一件事，不意味着两套执行器放行同一组动作。**

即使最后所有对照测试都变绿，也不能由此推导“所有未来的策略都等价”。有限测试集、求解模型、协议覆盖范围和实际执行器之间，仍然存在需要明确标注的边界。

## Mira 的真实实践：我们能证明调用没有被偷换，但还不能证明策略没有被放宽

本次重新读取的是 [Mira Organization 当前治理入口](https://github.com/uichat-mira/.github/blob/main/AGENTS.md)及 [Mira Desktop 当前 dev 源码](https://github.com/uichat-mira/mira-desktop/tree/dev/server/src/agent)，而不是沿用以前文章对实现的描述。

Mira 的 [approval fingerprint](https://github.com/uichat-mira/mira-desktop/blob/dev/server/src/agent/approval-fingerprint.ts)会对结构化 invocation 输入排序、序列化并计算 SHA-256。结合 AgentRun 的冻结调用和审批恢复合同，这使系统有条件判断：**用户批准的输入，与后来准备执行的输入是否仍为同一份。**

[当前 Agent Policy](https://github.com/uichat-mira/mira-desktop/blob/dev/server/src/agent/policy.ts)则按工具的 sideEffect、domain 和 requiresApproval 等元信息决定允许、拒绝或要求审批。这是动作级治理，不能误写成通用、可形式化分析的文件与网络访问策略。

更关键的是，[当前 Terminal 工具](https://github.com/uichat-mira/mira-desktop/blob/dev/server/src/mcp/tools/terminal-session.tool.ts)仍明确面向真实 Host Shell：允许脚本、包管理器、持久 PTY，要求审批，但定义里的 sandboxRequired 为 false。它不是一个默认强制 OpenShell 式隔离的进程树。当前代码也没有证明 Mira 已接入 Cedar、OpenShell Policy Prover，或者实现跨执行节点的策略包含关系检查。

所以两种问题必须分开：

- **Invocation identity**：批准的是否还是那一次具体调用？Mira 已有结构化输入哈希与审批合同。
- **Policy inclusion**：执行环境更新策略后，实际允许的文件、网络、API 方法和凭证目的地是否超出原授权？本次检查没有发现可据以宣称已实现的通用证明机制。

这并不构成 Mira 已存在某条可利用漏洞的证据。它说明的是**安全保证覆盖到哪里，哪里仍然需要另一层机制**。

## 真正值得学的是拒绝“无法证明也算通过”

假设未来 Mira Mobile 将一个开发任务交给 Desktop，或者 Cloud 将任务派给受控远程节点。用户可以批准“读取某仓库并运行测试”，而远程执行器需要临时访问包仓库、GitHub API 和模型服务。

执行节点若要求追加权限，不能只返回一句“这是完成任务必需的”。至少应有机会比较：

1. 原来的执行边界；
2. 本次请求的新增权限；
3. 新策略是否仍落在用户或组织设定的上限之内；
4. 哪些协议、路径或运行环境细节无法被当前检查器覆盖。

这里的第四项很重要。OpenShell 的稳定版 Prover 已经采用明确的 unsupported / inconclusive 结果，而不是把未知当作安全。对 Agent 系统来说，这种不讨喜的拒绝，比一句模糊的“安全扫描通过”更可靠。

这仍然只是 Mira 可以考虑的工程方向，并非已经决定要接入 OpenShell，更不是要在本地优先桌面应用中引入一整套 Kubernetes 安全基础设施。Windows、macOS、PTY、开发服务器、用户自己的 Git 凭证和跨设备恢复，都会影响实际可行性与成本。

## 还有什么不确定

OpenShell 的 Cedar 实现仍在 PR 审查中；作者披露的对照测试尚不能替代独立验证。它依赖的部分 Cedar 语言扩展也仍处在开发状态。CNCF 的社区治理能改善开放审查的条件，却不能自动证明某个版本安全。

稳定版 Policy Prover 的保证只覆盖它明确建模的规则；不支持或无法判定的策略不能靠人工把结果改成绿色。即使形式化模型完整，也还需要证明实际执行器、内核限制、代理行为和模型一致。

Mira 一侧，我们没有安装 OpenShell，没有执行 Cedar 对照测试，也没有测量额外策略检查对本地开发任务的延迟、兼容性和维护成本。跨设备策略如何签发、撤销和关联 Evidence，仍是待设计与实验的问题。

但这次变化已经给出一个值得保留的工程标准：

**一次审批回答“是否同意这件事”；一次策略证明回答“这次变更究竟让执行者多做了什么”。**

当 Agent 能够自己请求放宽权限，后一个问题不应该只靠它自己解释。

**主要一手资料：** [CNCF：Welcoming OpenShell（2026-11-10）](https://www.cncf.io/blog/2026/11/10/welcoming-openshell-to-the-cncf-open-governance-to-secure-agentic-ai/)；[OpenShell Policy Prover 稳定文档](https://docs.nvidia.com/openshell/latest/how-it-works/policies/prover)；[Cedar 设计 Issue #4411](https://github.com/NVIDIA/OpenShell/issues/4411)；[Cedar 实现 PR #4565](https://github.com/NVIDIA/OpenShell/pull/4565)；Mira Desktop dev 当前源码（正文链接）。
