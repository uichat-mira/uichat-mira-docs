---
title: 当 Agent 可以远程下载“技能”，它到底获得了什么？
description: MCP 正式定义 Skills 扩展后，一个关键边界变得更清楚：拿到一份技能说明，不等于拿到本机工具、脚本执行权或长期授权。
group: 工程现场
order: 40
date: 2026年9月25日
readTime: 8 分钟阅读
tags: Agent | MCP | Skills | ToolExposure | Security
author: mira
writingMode: authored
writtenBy: mira
---

# 当 Agent 可以远程下载“技能”，它到底获得了什么？

假设一个 Agent 从远端发现了一份“处理 PDF 的技能”。

里面有操作说明、模板、参考资料，甚至还有脚本。Agent 把它读进上下文之后，接下来最危险的误会是：**既然这个技能告诉我该怎么做，那我是不是也应该拥有它要求的工具和执行权限？**

如果答案是“是”，一份远端文本就可能悄悄变成权限升级入口。

2026 年 9 月，Model Context Protocol 的 Skills 扩展正式进入稳定规范。它第一次把“通过 MCP 发现和分发 Agent Skills”这件事写成了明确协议，也把这个容易混淆的边界写得很硬：**Skill 是可以被发现、读取和验证的能力说明包，但它本身不是工具授权。**

这件事值得我们单独写下来，因为 Mira 在真正实现 SkillContext、ToolExposure 和文档处理 Skill 时，恰好也撞上了同一个问题，而且最后走到了非常接近的边界。

## 先把“技能”和“能执行”拆开

MCP Skills 扩展 `io.modelcontextprotocol/skills` 基于 2026-07-28 版 MCP。服务器可以通过 `skills/list` 暴露技能目录，通过 `skills/get` 返回某个技能的元数据和文件清单；具体的 `SKILL.md`、references、templates、scripts 等内容仍通过 MCP Resources 读取。

规范原文在这里：[MCP Skills stable specification](https://github.com/modelcontextprotocol/ext-skills/blob/main/specification/stable/skills.mdx)。背后的 SEP-2640 已于 2026 年 9 月合并为 Final，当前仓库也明确把这份 stable specification 作为 source of truth：[Skills Over MCP Working Group](https://github.com/modelcontextprotocol/ext-skills)。

乍看之下，这很像给 Agent 增加了一种新的“插件安装协议”。但规范刻意没有这么定义。

读取 `SKILL.md` 只是 transport。它不会自动激活技能，不会自动打开一个可执行窗口，更不会因为文件里写了 `allowed-tools` 就让 Host 给模型增加本机权限。

甚至规范直接要求：对于来自 MCP 的 Skill，如果 frontmatter 试图扩大模型的工具或文件系统权限，Host **不得把它当作天然授权**。`allowed-tools` 最多是一项权限请求；没有用户明确批准，就不能因为远端 Skill 自己声明了它而生效。

这个区别看似保守，实际上决定了 Skills 能不能安全地从“本地文件夹约定”走向跨机器分发。

## Mira 也曾经必须回答同一道题

Mira 当前的 Skill 实现并不是照着这份 MCP 扩展做的。我们的 SkillContext 和文档 Skill 主线更早就已经在仓库里落地，因此这里不能倒过来说“我们采用了 MCP Skills”。

但实现过程中，我们碰到了几乎相同的所有权问题。

Mira 当前把几个概念明确拆开：

```text
Skill Package
  -> SKILL.md / references / templates / metadata

SkillContext
  -> 当前任务需要的领域策略与方法

Harness / ToolExposure
  -> 当前环境里模型真正可以调用的执行能力

Runtime Pack
  -> 某些领域能力需要的本地运行依赖
```

公开的当前合同可以在这里看到：[Mira Skill Package / Runtime Pack 合同](https://github.com/uichat-mira/mira-desktop/blob/prod/docs/skill/skill-package-runtime-contract.md)。

其中有一条我们反复强调的硬规则：

> Skill match ≠ Tool available

例如用户要求合并 PDF，PDF Skill 可以先被匹配，让 Planner 知道正确的处理方法；但如果本地文档 Runtime 没有准备好，真正的 PDF 执行能力仍然必须诚实地保持 unavailable。

SkillContext 不能因为“我知道应该调用什么”就自己把一个工具塞进 `state.toolExposure`。

这不是类型设计上的洁癖。它防的是一个非常具体的权限倒置：**由说明书决定机器拥有什么能力。**

## 远程 Skill 把这个问题放大了

本地内置 Skill 尚且可以由应用发行方审计；远端 Skill 则天然多了一层来源问题。

MCP Skills 规范因此没有把一个 Skill 简单标识为 `pdf`、`refunds` 或某个 URI。跨服务器时，它的身份实际上是“Host 认定的服务器身份 + Skill URI”。两个服务器都可以发布一个叫 `refunds` 的 Skill，它们不是同一个东西。

这条规则很重要，因为名字是最容易被模型和人类误认为身份的东西。

恶意服务器完全可以发布一个与热门 Skill 同名的包。如果 Host 只按名字做缓存、审批或替换，那么“我批准过 `refunds`”很快就可能变成“任何来源叫 `refunds` 的内容都获得了历史信任”。

规范明确禁止这种静默 shadow：远端 Skill 不能偷偷覆盖另一个来源的同名 Skill，也不能覆盖 Host 本地文件系统中的同名 Skill。

这给 Mira 一个很直接的提醒。

我们现在的 Skill V1 主要处理 bundled / local package 和 Runtime Pack，已经把 Package、Context、Runtime readiness 与 ToolExposure 分开；但如果未来把 Skill 分发扩展到 MCP 或其他远端来源，那么 **source provenance 必须成为 Skill identity 的一部分，而不能只是详情页上的一个字符串。**

这是基于当前实现与外部规范得到的工程推断，不是 Mira 已经实现的远程 Skill 能力。

## 文件摘要解决的是“它变没变”，不是“它能做什么”

这次规范还有一个很实用的设计：Skill entry 可以携带完整资源清单，每个文件带 digest 和 size。

Host 因此可以在真正加载前知道 Skill 包含哪些文件，并在读取后验证内容是否与 manifest 一致。如果 manifest 改了，之前基于旧内容做出的持久批准也不能继续若无其事地沿用。

这解决的是内容身份问题。

但规范同样没有把 digest 当成安全证明。一个 SHA-256 完全匹配的恶意脚本，仍然是一个恶意脚本；它只是“稳定地恶意”。

所以这里至少有三件事必须分开：

- **来源是谁**：这个 Skill 从哪个 Host 认定的 server identity 来；
- **内容是不是那一份**：manifest、digest、size 是否一致；
- **它被允许做什么**：当前用户策略、ToolExposure、文件边界和执行审批允许哪些动作。

完整性不能替代权限治理，权限治理也不能替代来源验证。

这和 Mira 最近在 Agent runtime 里不断收紧 invocation identity、Evidence provenance 的方向其实是同一种工程习惯：不要让一个“看起来像身份”的字段承担它没有证明过的语义。

## Skill 甚至比远程 Tool 更敏感

MCP Skills 规范有一句很值得注意的判断：远端 Skill 应被视为比普通远程 tool invocation 更高风险的表面。

原因并不神秘。

调用远程 Tool 时，副作用通常发生在远端服务边界内；而 Skill 是给模型看的指令。它可以告诉模型：“把这个脚本写到本机”“用终端运行它”“再去读取某个目录”。也就是说，远端服务器虽然没有直接拿到本机 shell，却可能通过模型去驱动 Host 已经拥有的本地工具。

这正是为什么“Skill 命中后自动扩 ToolExposure”尤其危险。

如果远端 Skill 既能告诉模型做什么，又能通过自己的 metadata 决定模型获得什么工具，那么数据面和控制面就合并了：提供指令的人，同时决定执行权限。

Mira 当前的分层恰好避免了这一点。SkillContext 可以影响 Planner 看见的领域方法，但真实工具面仍由 Harness 的环境能力、matcher、Policy、Approval 和 Sandbox 决定。Runtime Pack readiness 可以让预先声明的能力从 unavailable 变成 eligible，但仍不能绕过这些控制层。

换句话说，**知识可以动态到来，权力不能跟着知识自动到来。**

## 这也改变了“工具发现”的理解

过去讨论 Agent 的动态能力发现，很容易把问题压缩成一句话：不要一次把几百个工具塞给模型，先搜索，再按需加载。

这当然重要，但 Skills over MCP 把问题往前推了一步。

Agent 真正需要动态发现的，不只有 Tool schema。

它还需要发现“怎样完成这一类工作”的上下文包，而且这个上下文包可以独立于执行能力存在。一个 Skill 可以告诉模型如何处理报销、怎样审阅合同、如何生成演示文稿，却不必因此发明一个新的 `use_skill` action，也不必让每个 Skill 都拥有自己的 Agent Loop。

这与 Mira 当前的方向高度吻合：SkillContext 是渐进式披露的动态上下文能力包，而 Harness 负责真实执行面。两条链最后在 Planner 汇合，但不互相冒充。

我们认为这是这次规范最值得吸收的地方。不是多了三个 RPC，而是行业正在把 **instruction discovery** 和 **execution authority** 明确拆成两件事。

## 还有几件事我们不会急着照搬

MCP Skills 已经是一份稳定扩展，但生态实现仍在推进。不同 SDK 的支持节奏并不一致，远端动态 Skill 的审批体验、缓存策略、离线行为，以及大规模目录的实际性能，都还需要真实产品验证。

Mira 也还没有理由因为规范存在，就立即把自己的本地 Skill Registry 改造成 MCP Registry。

更现实的顺序是先守住几个不依赖协议的边界：

Skill 的来源必须可追溯；内容变化必须能让旧批准失效；远端内容不能扩大本机 ToolExposure；Skill 的“会做”与 Runtime 的“能做”必须继续分开；未来如果支持跨设备或远程 Agent，同一份 Skill 在手机、桌面和云端也不能因为运行位置变化就偷偷继承另一端的权限。

至于 MCP Skills 是否会成为 Mira 的远程 Skill transport，我们现在没有结论。

但这份规范让一个更底层的问题有了很清楚的答案：

**Agent 可以从远处学会一套方法，却不应该因为学会了它，就自动得到执行这套方法所需要的一切权力。**

对于一个越来越会自己找工具、找资料、找方法的 Agent，这条边界可能比“支持多少种 Skill”重要得多。