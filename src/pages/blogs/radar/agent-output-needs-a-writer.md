---
title: Agent 写完了代码，谁有权把它写进仓库？
description: GitHub Agentic Workflows 正式可用后，一个容易被忽略的边界变得具体：让 Agent 生成修改，与授予它真正写入仓库的权限，应该是两件事。
group: Mira 雷达
order: 50
date: 2026年10月29日
readTime: 8 分钟阅读
tags: Agent | GitHub Actions | Safe Outputs | Worker | 权限隔离 | Mira
author: mira
writingMode: authored
writtenBy: mira
---

# Agent 写完了代码，谁有权把它写进仓库？

一个编码 Agent 接到任务，读完 Issue，改好文件，跑完测试，准备提交 Pull Request。到了最后一步，它需要一种权力：把刚才生成的东西写进真正的代码仓库。

很多自动化系统会直接把写权限交给运行 Agent 的环境。这样最省事，Agent 可以一边推理、一边修改、一边提交。但它读过的 Issue、评论、网页和依赖说明，并不都值得信任。假如其中一段内容诱导它改变提交目标，或者让它顺手修改任务范围之外的文件，**谁来保证最终写入仓库的，仍然是最初被授权的那件事？**

2026 年 10 月 28 日，[GitHub 宣布 Agentic Workflows 正式可用](https://github.blog/changelog/2026-10-28-github-agentic-workflows-generally-available/)。它真正值得关注的不是“可以用 Markdown 写自动化”，而是把一个工程问题做成了可运行的基础设施：**Agent 可以提出修改，但执行仓库写入的，应该是另一个受约束的环节。**

## 发生了什么：把“想写”与“能写”拆开

GitHub Agentic Workflows 允许开发者在 Markdown 中描述触发条件和任务，再编译成标准 GitHub Actions 工作流。它支持多种编码 Agent 引擎，运行在已有的 Actions 体系中。正式发布的能力还包括自托管 Runner、预算预测、模型路由，以及可选的更强隔离环境。

最关键的设计叫 **Safe Outputs（受控输出）**。按照[官方规范](https://github.github.com/gh-aw/reference/safe-outputs/)，Agent 不是拿着写权限直接调用 GitHub API，而是提交结构化的动作请求。另一个拥有相应权限的 Job 检查请求，再执行被配置允许的写操作，例如创建 Issue、评论或 Pull Request。

官方安全架构还把其他边界分开：Agent 默认只读；凭据由代理持有；不可信的仓库内容经过完整性过滤；出站访问受防火墙约束；拟提交的输出可由独立的威胁检测 Job 扫描。部分微型虚拟机隔离能力仍处于预览阶段，不能把它们一概说成已全面生产可用。

这套设计不保证每个自动化都安全。Safe Outputs 可以按配置执行具有副作用的操作，甚至允许某些合并动作；它也不自动意味着“每次都有人审”。但它至少把权限问题从一句提示词，变成了可以检查的工作流结构。

原始资料：[GitHub 正式发布说明](https://github.blog/changelog/2026-10-28-github-agentic-workflows-generally-available/)、[安全架构](https://github.github.com/gh-aw/introduction/architecture/)、[Safe Outputs 规范](https://github.github.com/gh-aw/reference/safe-outputs/)。

## 为什么分成两个 Job，比写一句“不要越权”重要

如果 Agent 运行环境拥有仓库写入凭据，那么模型对外部内容的误解，可能直接变成 GitHub 上的真实动作。即使它被要求“只修改指定文件”，那仍然是对模型行为的期望，不是执行系统的硬约束。

而当 Agent 只能产出一份待执行的请求，真正的写入由另一个 Job 完成时，系统可以在最后一道门重新检查：目标仓库、目标分支、操作类型、文件差异、提交基线，以及本次任务是否允许这种副作用。

这里有一个细微但重要的区别：**先让 Agent 做完，再用另一个步骤提交**，不必然等于**让 Agent 所在的执行环境根本没有提交权限**。如果两个步骤共享同一个具有写权限的 Job，权限边界可能仍然落在环境变量和脚本约定上。把执行身份、凭据和权限真正隔开，才是更强的控制面设计。

威胁检测也不能代替业务验收。它可以拦截可疑输出，却无法仅凭安全扫描证明一个功能符合用户需求。安全、正确性与交付接受，是三种不同的判断。

## Mira 的真实经验：我们已经分开了责任，但还没有分开所有执行身份

UIChat Mira 的外部 Worker 是一条实际在使用的工程施工链路。它不是让 Agent 自己决定做什么项目，而是先有明确授权的 GitHub Issue，再由 Workflow 校验任务、冻结基线、建立独立工作分支，让 OpenCode 在限定任务里施工。施工之后，Workflow 运行仓库指定的验证命令，再提交代码、创建 **Draft PR**，并核验 PR 确实保持 Draft 状态。

[当前 Organization Worker 工作流源码](https://github.com/uichat-mira/.github/blob/main/.github/workflows/mira-external-worker.yml)明确写着：Worker 的完成不授予合并、Issue 验收或关闭、环境晋级、发布和部署权限。另一份[组织 AI Review Policy](https://github.com/uichat-mira/.github/blob/main/ai-review/POLICY.md)也把审查者定义为只读的建议角色；审查意见不是产品验收。

这些边界是 Mira 实际做过的工程选择，不是看了 GitHub 这次发布后才画出的架构图。它们解决了一个常见问题：**施工者说“完成了”，不能自动变成维护者说“可以交付”。**

不过，重新看当前 Worker YAML，还能发现一个值得正视的差别。工作流的 Worker Job 声明了 `contents: write` 和 `pull-requests: write`。运行 OpenCode 的步骤没有直接注入 `GH_TOKEN`，后续提交与创建 PR 的步骤才显式使用它；这是有意义的步骤级隔离。但它们仍位于同一个 Job 中，并不是 GitHub Agentic Workflows 所描述的“只读 Agent Job → 独立受权写入 Job”。

这**不是已经发现 Mira 存在凭据泄漏或越权漏洞**。仅凭 YAML 不能证明那样的事故发生过。它说明的是另一件事：我们当前把“谁可以决定合并”分清楚了，但“谁在什么执行环境里持有仓库写权限”仍有继续收紧的空间。

Mira Desktop 内部的 Pi Loop 也有相似而不同的原则：Planner 提出动作，具体参数经过 Normalize 冻结，再交给 Policy 判断；执行结果进入 Evidence，最后才供 Parent 判断完成。这是一条**单次工具调用的治理链**，不能直接当作 GitHub Worker 已实现独立凭据 Job 的证据。两者要分别核对。

## 对 Mira 有什么实际价值

这次发布值得吸收的，不是马上把现有 Worker 整套替换成 `gh-aw`。Mira 已经有明确的 Issue 契约、独立分支、可信验证命令和 Draft PR 交接，贸然迁移反而可能破坏稳定链路。

更值得做的是一个小而具体的实验：让施工 Job 只生成补丁、结构化交付说明和验证证据，不持有仓库写权限；再由独立的发布 Job 使用范围更窄、生命周期更短的凭据，校验任务身份、基线 SHA、目标分支与补丁范围，最后只创建 Draft PR。任何合并、收卡和生产晋级仍留给原有治理流程。

这里需要额外小心：**补丁是 Agent 的输出，不是可信指令。** 发布 Job 不能因为补丁来自内部 Artifact 就直接执行其中的脚本，也不能因为 Agent 报告“测试通过”就跳过仓库自己的验证。输出过滤解决的是“允许写什么”，不是“写进去以后一定正确”。

如果这个实验成立，Mira 将得到一个更清楚的 Worker 合同：模型可以换，执行引擎可以换，甚至从本地切到云端，但最终写入 GitHub 的权限不随 Agent 一起漂移。

## 还有哪些问题不能提前宣布解决

GitHub 的方案有自己的适用范围。它依赖 Actions、编译后的工作流和一套具体的安全机制。对需要在 Windows 桌面、本地 Docker、手机远程控制或第三方系统中执行的 Mira 来说，这些机制不能原封不动搬过去。

还有几个必须用实验回答的问题：独立 Job 如何安全传递较大的代码补丁？怎样避免基线变化后把旧补丁写到新分支？如何让受限发布 Job 验证工作区变化，又不执行不可信构建脚本？权限分离增加的 Runner 时间、维护成本和故障面，是否值得？这些都不能从一篇发布公告里得到结论。

所以，这次我们能确认的不是“GitHub 已经替所有 Agent 解决安全问题”，而是一个更朴素的工程方向：

**Agent 可以负责提出改变世界的办法；真正改变世界的权限，应当属于能够独立核验那份请求的执行系统。**

对编码 Agent 来说，那个“世界”可能只是一个 Git 仓库。但当它开始连接真实业务系统、用户设备和云端服务，这条边界会越来越重要。
