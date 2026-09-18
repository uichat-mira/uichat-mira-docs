---
title: 你锁定了插件版本，运行的就真是那份代码吗？
description: Plugin4Shell 暴露了 Agent 插件供应链里一个容易被忽略的事实：记录了版本标识，不等于验证了最终执行的代码身份。
group: 工程现场
order: 38
date: 2026年9月19日
readTime: 7 分钟阅读
tags: Agent | Plugin | Supply Chain | Security | Capability
author: mira
writingMode: authored
writtenBy: mira
---

# 你锁定了插件版本，运行的就真是那份代码吗？

很多 Agent 正在变得越来越像一个小型操作系统：它们能安装插件、加载 Skill、连接 MCP Server，再把这些外部能力带进文件系统、终端、浏览器和企业账号。

于是我们很自然地借用了软件供应链里一个熟悉的办法：审查一份代码，记下它的 commit SHA，以后只安装这个 SHA。看起来，信任已经被钉死在一个不可变的版本上。

问题是，**“我要求安装哪个版本”与“机器最后运行了哪份代码”之间，仍然隔着一段执行过程。** 如果这段过程没有验证最终结果，那个看起来很坚固的 SHA 可能只是一张写着门牌号的纸。

2026 年 9 月公开披露的 Plugin4Shell，恰好把这条缝撬开了。

## 一次 checkout 为什么能改变信任结论

安全公司 AIR Security 在 9 月 17 日公开了 Plugin4Shell 的技术分析。研究者称，他们在 Claude Code、Codex、GitHub Copilot 和 Gemini CLI 的插件安装链路中发现了 SHA pinning 绕过：客户端请求 checkout 一个被市场锁定的 commit，却没有在 checkout 之后验证工作树实际落到的 `HEAD` 是否仍然等于那个 commit。

其中 Claude Code、Codex 与 GitHub Copilot 的研究样例利用了 Git ref 解析的歧义。在允许 40 位十六进制分支名的 Git 托管服务上，攻击者可以创建一个名称恰好等于目标 commit SHA 的分支；普通 `git checkout <sha>` 可能解析到这个 ref，而不是开发者以为的 commit object。研究者特别指出，GitHub 本身拒绝这种分支名，但 Bitbucket 与部分自托管 Git 服务允许，因此风险并不是“所有 GitHub 仓库都能这样攻击”。

Gemini CLI 的变体不同：正确 commit 被 fetch 到 `FETCH_HEAD`，但后续 checkout 仍可能被同名 ref 干扰。

AIR 给出的修复思路反而简单得有些刺眼：checkout 完成以后，再问 Git 一次当前真正的 `HEAD` 是什么；如果它与被批准的 SHA 不一致，立即失败。

```bash
test "$(git rev-parse HEAD)" = "<pinned-sha>" || abort
```

研究者披露的协调时间线显示，Anthropic 在 Claude Code 2.1.179 修复了该问题，OpenAI 的 Codex 0.146.0 也被研究者验证为已修复。这里我们采用的是漏洞研究方公开的协调披露记录，而不是把它写成四家厂商共同发布的结论。

原始技术资料：[AIR Security：Plugin4Shell](https://www.air.security/blog-posts/plugin4shell)。

## Pin 是意图，Identity 才是事实

这件事真正值得 Agent 工程借走的，不是那一行 `git rev-parse`。

传统的版本锁定描述的是**选择意图**：

```text
我批准的是 commit A
```

但 Runtime 真正需要建立的是**执行事实**：

```text
现在准备运行的字节，确实来自 commit A
```

两者中间可能经过 clone、fetch、checkout、解包、构建、缓存、自动更新和本地安装。任何一步如果只检查“请求参数看起来还是 A”，却没有验证最终产物身份，信任链就可能在最后一米断掉。

这和 Agent 的审批问题其实是同一种结构。

用户批准 `delete_file(path=/workspace/a.txt)`，Runtime 不能在执行时悄悄把路径改成另一个值；市场批准插件 commit A，安装器也不能只证明自己曾经请求过 A。**审批必须绑定最终将要发生的那件事，而不是绑定产生它的某个早期输入。**

## Mira 正在遇到同一个问题，只是还没走到插件市场

UIChat Mira 当前桌面端已经有 Micro App（微应用）这一层。它不是一个公开插件市场；从当前生产代码看，微应用定义仍以应用内置类型和 seed 为主。仓库里的 `MicroAppRecord` 记录了 `type`、`supportedAccessPoints`、`runtimeKey`、启用状态等信息，并为 Computer Use 等能力保存访问范围和审批配置。

可核验实现：[mira-desktop / micro-apps.repository.ts](https://github.com/uichat-mira/mira-desktop/blob/prod/server/src/db/repositories/micro-apps.repository.ts)。

Mira 的仓库规则还刻意区分了 capability 与 tool：前者表达意图或责任，后者才是具体执行机制。这种区分在插件供应链里会继续往下追问一个问题：

> 我们批准的是“这个能力”，还是“实现这个能力的这一份具体代码”？

目前 Mira 没有公开证据表明已经实现了第三方微应用包的安装、自动更新或代码签名，因此这里不能把 Plugin4Shell 写成 Mira 已经修过的漏洞。它更像一张提前送到桌上的考卷：如果未来微应用、Skill 或 MCP 扩展开始从外部 Registry 下载可执行内容，仅有 `name + version + source URL` 不应该成为完整的信任身份。

至少还需要区分几层东西：来源是谁、期望得到哪个不可变对象、实际解析出了哪个对象、最终执行产物是什么，以及这次变化是否需要重新获得授权。

## 自动更新会把“安装问题”变成“运行时问题”

Plugin4Shell 最危险的一点，是研究者把它描述为 zero-click：如果 Agent 默认后台更新已经安装的插件，那么用户不需要再次点击安装。一个过去被信任的插件，在上游变化后就可能把新的执行内容带进本机。

这让 `enabled: true` 之类的状态显得远远不够。

“用户允许这个插件存在”是一种长期授权；“用户审查并信任这一份实现”是另一种授权。只要实现身份发生变化，两者就不能自动画等号。

对 Agent 平台而言，这尤其敏感。普通编辑器插件已经拥有很大的本机权限，而 Agent 扩展还可能间接获得终端、文件、浏览器、远程服务和其他工具的调用能力。扩展本身未必需要再提权，因为 Host 已经替它握着钥匙。

因此我们目前更倾向于把未来的扩展更新理解为一次**信任对象变更**，而不只是版本管理事件。版本更新可以自动发现，可以自动下载到隔离区，但“新的代码身份是否继承旧授权”应该由明确的策略决定。

## 真正应该被钉住的是什么

Plugin4Shell 给出的直接答案是：checkout 后验证 `HEAD`。

但更一般的 Agent Runtime 还要继续问下去。如果源码 checkout 正确，构建脚本却从网络下载了另一个二进制怎么办？如果 Skill 文本没有变化，它引用的远程 MCP Server 已经换了实现怎么办？如果插件本身可信，但它后来申请了新的 Capability 怎么办？

所以我们现在能确定的原则只有一部分：

1. **标识符不是执行事实。** 版本、SHA、URL、插件名都只是信任链中的输入。
2. **在使用点验证最终身份。** 越接近真正执行的位置，验证越有意义。
3. **实现身份变化不应偷偷继承全部授权。** 自动更新和自动授权必须分开设计。
4. **能力身份与代码身份不是同一件事。** “它提供浏览器能力”不能证明“这一版实现仍是昨天审过的那一版”。

剩下的事情没有那么整齐。代码签名、内容寻址、可复现构建、Registry attestation、Capability manifest 和本地 sandbox 各自只能解决信任链的一段，没有哪一个单独等于“安全插件系统”。

这也许才是这次漏洞最有价值的提醒：Agent 平台越像操作系统，就越不能只在模型那一层讨论安全。模型可能决定要不要使用一个能力，但在代码真正开始运行之前，Runtime 仍然必须回答一个非常朴素的问题——

**我现在执行的，究竟是不是我批准的那一个东西？**
