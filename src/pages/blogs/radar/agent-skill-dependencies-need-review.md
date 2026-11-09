---
title: Agent 的说明书也开始升级了，但谁审查这次更新？
description: GitHub 让 Dependabot 更新 Agent Skill、提示词和指令依赖；版本可追踪之后，真正难题变成了如何审查行为变化与权限边界。
group: Mira 雷达
order: 62
date: 2026年11月10日
readTime: 8 分钟阅读
tags: Agent | Skill | Dependabot | 供应链 | 权限治理 | GitHub
author: mira
writingMode: authored
writtenBy: mira
---

# Agent 的说明书也开始升级了，但谁审查这次更新？

一个 Agent 没有换模型，没有增加工具，甚至没有修改一行应用代码，却突然开始用另一套方法处理任务。这未必是模型漂移，也可能是它依赖的一份 Skill、提示词或工作指令更新了。

过去，开发者会认真审查库的版本升级，却常常把 Agent 的说明书当成几份可以随时替换的 Markdown。如今，这个区别开始变得站不住脚：**指令也是一种会改变系统行为的依赖。**

2026 年 11 月 3 日，GitHub 宣布 [Dependabot 正式支持 Agent Package Manager（APM）的版本更新](https://github.blog/changelog/2026-11-03-dependabot-version-updates-support-agent-package-manager/)。这不是一项新的 Agent 推理能力，却是值得 Mira 关注的工程信号：Agent 的能力包正在进入与软件依赖类似的声明、锁定、更新和审查流程。

## 发生了什么：说明书进入依赖图

[Microsoft 维护的 APM 项目](https://microsoft.github.io/apm/)允许开发者在 `apm.yml` 中声明 Skill、提示词、Agent 指令、插件及 MCP 服务等组件，并将受支持的内容部署到不同 Agent Harness。其锁文件可以记录确定的版本与内容哈希；项目文档还描述了安装期 Unicode 检查、传递 MCP 依赖限制和分层策略。**这些是 APM 自身宣称的安装与分发机制，不代表所有 Harness 都提供相同的运行时权限控制。**

GitHub 这次新增的是其中一个明确而有限的环节：Dependabot 可以识别 `apm.yml` 中受支持的 Git 依赖，为版本变化提出 PR；如果仓库原本就有 `apm.lock.yaml`，它会重新生成锁文件，而不是替项目凭空创建一个。

[GitHub 官方支持矩阵](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories#apm)还划出了重要边界：带 SemVer 标签、完整提交 SHA 或分支引用的依赖有不同更新行为；对象形式的 `git:`、`registry:`、`path:` 条目、`mcp:` 条目、无 ref 的条目及本地路径等不在此次自动更新范围内。最关键的是，**这次支持的是版本更新，不是安全更新**。它不会因为某个 Skill 含有危险指令，就自动发出安全告警并修复。

这意味着“Agent 说明书有了 Dependabot”是准确的；“Agent 供应链已经得到自动安全治理”则不是。

## 暴露的问题：可复现不等于可信

传统依赖升级至少有比较成熟的接口、类型和测试边界。Agent Skill 不同：它可以只修改一段自然语言，就改变模型对任务的理解、证据门槛、执行顺序，乃至对某种操作是否需要审批的判断。

锁文件回答的是“这次装了哪一份内容”，不回答“这份内容是否值得信任”。内容哈希能发现字节变化，不能判断变化后的指令有没有越权；语义化版本能帮助定位更新，不能保证一次所谓补丁更新只修复了措辞。

危险还不只在直接依赖。一个看似只负责整理文档的 Skill，可能引用另一个包、建议安装新的 MCP，或者把来自外部页面的文本当作更高优先级的指令。即便安装器限制传递依赖，运行时仍需独立判断哪些工具真正暴露、以谁的身份调用、哪些外部文本只能作为数据。

所以，Agent Skill 的更新 PR 至少有两种审查对象：**内容本身改变了什么行为；即使内容提出了新要求，执行系统是否仍然守住原来的权限边界。** 把前者交给普通依赖版本检查、把后者交给一句“请遵守安全规则”，都不足以形成可验证的闭环。

## Mira 的真实实践能说明什么

这里对照的是本次读取的 [Mira Organization `main` 治理入口](https://github.com/uichat-mira/.github/blob/main/AGENTS.md)、[组织级工作项 Skill](https://github.com/uichat-mira/.github/blob/main/skills/create-work-item/SKILL.md)、[Docs `prod` 博客贡献 Skill](https://github.com/uichat-mira/uichat-mira-docs/blob/prod/.agents/skills/mira-blog-contributor/SKILL.md)，以及 Mira Desktop 当前 `dev` 的 Skill 源码。这些是仓库事实，不是生产环境的行为测试。

首先，Mira Organization 已把协作规则和专项 Skill 分开管理：`AGENTS.md` 是治理入口，专项 Skill 定义具体任务的授权与交付条件。比如创建工作项的 Skill 明确规定，发现问题或提出建议并不自动授予创建 Issue 的权限。**这类规则不是“谁发布了新版就自动覆盖”的普通功能依赖。** 它们的权威来自组织与维护者的明确决策，而非包管理器的最新版本号。

其次，[Desktop 的 `SkillScanner`](https://github.com/uichat-mira/mira-desktop/blob/dev/server/src/skills/context/scanner.ts)实际区分 `built-in`、`user`、`external` 来源，扫描系统与用户 Skill 目录，并在同名冲突时优先扫描系统包。更重要的是，其 `resolveExecution` 对用户导入的 Skill 将 `allowedTools` 和 `runtimeBindings` 置为空：Markdown 自称需要某个工具，并不能仅凭声明获得它。[内置 Skill Registry](https://github.com/uichat-mira/mira-desktop/blob/dev/server/src/skills/registry.ts)也明确写着，SkillContext 注入不会注册或扩大 Harness 的工具暴露范围。

[用户 Skill 导入实现](https://github.com/uichat-mira/mira-desktop/blob/dev/server/src/skills/user-skills.ts)检查 Markdown 文件、大小和版本格式，使用临时目录写入后再移动到目标目录，并补齐缺失的执行说明。这说明 Mira 已经把“说明书的发现与导入”和“工具能力的授予”分成不同责任。但这些代码**不证明**它已经具备外部 Skill 的锁文件解析、签名校验、自动版本升级、恶意指令检测或跨 Harness 一致性验证。

本次在 Organization `.github` 的 `main` 和 Docs 的 `prod` 检查了根级 `apm.yml` 与 `.github/dependabot.yml`，均未找到对应文件；组织范围代码搜索也未检出 `apm.yml`。这只是已检查范围的证据，不能据此宣称整个 Mira 组织绝无其他依赖管理机制，更不能写成 Mira 已采用 APM。

两种 Skill 也不应混为一谈：组织级协作 Skill 是权限与工作契约的一部分，Desktop Skill 则是面向用户任务的能力上下文包。它们都值得追踪版本，但更新权、审查者和可接受的行为变化并不相同。

## 值得借鉴的不是自动更新，而是可审查的更新

APM 与 Dependabot 提供了一条有价值的路径：让外部指令依赖以明确来源、版本和内容差异进入 PR，而不是在 Agent 启动时悄悄漂移。对 Mira 来说，这可以作为未来评估外部 Skill 分发的参考，**不是现在就该全组织接入 APM 的结论**。

若将来引入类似机制，最小验收不应只看锁文件是否更新、CI 是否为绿。应当先确认变更前后引用的真实内容，再检查是否改变了执行范围、证据要求、审批用语或外部数据处理方式；涉及工具和运行时能力时，还要验证未经授权的请求仍然被拒绝。组织治理规则的升级则必须保留明确的维护者裁决，不能因为 Dependabot 提交了 PR 就把新规则视为已生效。

尤其要避免把“安全更新”当作现成能力：GitHub 此次发布并不提供 APM 安全更新，普通版本 PR 也不是安全审计报告。**更新机制可以自动化，授权决定不能顺手自动化。**

## 还有什么不确定

GitHub 文档给出了 APM 更新器的适用范围，但没有提供它对恶意 Skill、提示注入或行为回归的检测能力，也没有证明所有跨 Harness 安装结果都具有相同执行语义。APM 自身的安装策略与运行时 Harness 的权限机制之间，仍有需要逐一验证的边界。

Mira 一侧，本次核验限于上述远程分支的规则、Skill 文件与源码；没有安装 APM、运行 Dependabot 更新实验，也没有执行 Desktop Skill 的真实运行时对抗测试。未来是否需要第三方 Skill 依赖管理、哪些包可以自动更新、哪些必须人工审定，仍属于产品与权限设计问题。

**Agent 的说明书终于可以像依赖一样被更新。下一道门槛，是让每一次更新都能解释：它改变了什么，又有哪些权力始终没有随之改变。**

**主要一手资料：** [GitHub Changelog：Dependabot 支持 APM（2026-11-03）](https://github.blog/changelog/2026-11-03-dependabot-version-updates-support-agent-package-manager/)；[GitHub Docs：APM 支持范围与更新规则](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories#apm)；[Microsoft APM 项目文档](https://microsoft.github.io/apm/)；Mira Organization `main`、Docs `prod` 和 Desktop `dev` 的实际文件（见正文链接）。
