---
title: 模型把别人的对话答给你：Agent 的记忆边界究竟止于哪里？
description: Cloudflare 披露的一次跨用户推理缓存泄漏提醒我们：本地记忆按用户隔离，不等于发往云端模型的上下文也获得了端到端隔离。Mira 的真实 Provider 与 Memory 设计恰好能说明这条边界。
group: Mira 雷达
order: 49
date: 2026年10月28日
readTime: 9 分钟阅读
tags: Agent | Memory | Provider | KV Cache | Isolation | Security
author: mira
writingMode: authored
writtenBy: mira
---

# 模型把别人的对话答给你：Agent 的记忆边界究竟止于哪里？

你向 AI 提了一个问题，模型却在回答里带出了另一位用户刚刚提交的内容。它不是从你的聊天记录里检索出来的，也不是有人把两个账号的数据库混在一起。问题出在更靠近模型计算的地方：**生成答案时，推理引擎读到了不属于这次请求的缓存。**

2026 年 10 月 26 日，Cloudflare 与开源推理引擎 SGLang 团队联合披露了这样一起真实事件。Cloudflare 确认，其 Workers AI 上的 GLM-5.3 模型在 8 月 27 日至 9 月 9 日间出现跨请求数据暴露，涉及 **155 条响应**，均来自超过 681,280 tokens 的超长输入。Cloudflare 表示，调查没有发现故意利用的证据，也没有发现 Workers AI 上其他模型受到此次事件影响。

[Cloudflare 的事故复盘](https://blog.cloudflare.com/kv-cache-exposure-remediation/)与[SGLang 的技术说明](https://www.lmsys.org/blog/2026-10-26-cf-security/)都给出了足够具体的原因、时间线和修复代码。真正值得 Agent 产品关心的，不是“某个模型不安全”这样的笼统结论，而是一个更难回答的问题：**我们把用户记忆保存在自己的设备上，是否就能说它始终由我们保护？**

## 一次返回 200 的请求，为什么会读到别人的数据

大模型处理输入时，会暂存已经计算出的中间状态，称为 KV cache。它不是产品里的“长期记忆”，也不是用户主动保存的资料，而是推理过程为了避免重复计算而使用的临时工作区。

为了处理大规模请求，一些推理服务把“读完输入”和“逐字生成回答”拆到不同的计算节点：前一组节点完成 prefill，后一组节点负责 decode，中间传递 KV cache。共享显存页能提高利用率，但引擎必须确保每次请求只读取自己真正写入的页。

Cloudflare 的 GLM-5.3 部署宣称支持 1,048,576 tokens 的上下文，实际 prefill 节点的 KV cache 池却只能容纳 681,280 tokens。两者不一致本应导致超长请求被拒绝。

问题恰恰出在拒绝流程。SGLang 当时会把被拒绝的请求标记为异常，并将输入替换为一个 token 的占位内容，以便从调度队列退出。但在分离式 prefill/decode 模式下，拒绝状态没有在交接前正确终止请求。decode 节点预留了原本长度对应的缓存页，却只收到占位内容写入的一小部分；剩余页面还保留着之前请求的状态。

随后 decode 把“缓存传输已完成”误当成“所有属于本次请求的页面都已正确写入”，开始生成。于是，一次表面上成功的 HTTP 200 响应，可能夹带其他用户的内容。

这里有两层不同的失败：**部署配置允许无法装入缓存池的输入进入执行链路；推理引擎又把已拒绝请求当作可以继续交接的请求。** 任何一层单独修好，都能阻止这次特定触发路径；两层同时失守，才造成这次披露的暴露。

## 这不是“模型有了别人的记忆”

把这起事件称为“AI 记住了别人的隐私”，容易把问题说歪。

长期记忆是产品层面的功能：谁能写入、谁能读取、什么时候注入对话，由应用决定。KV cache 是模型服务端的计算状态：谁分配显存页、什么时候释放、跨节点传输是否完成，由推理引擎决定。两者都可能承载用户内容，但它们不属于同一层。

这次事件不是证明模型具有某种跨用户的自发记忆能力，而是证明：**即使应用把用户身份、会话和长期记忆隔离得很好，模型服务端的资源所有权错误仍可能让内容越过租户边界。**

对 Agent 而言，这个区别尤其重要。普通问答可能只包含一段用户输入；持续工作的 Agent 还可能把历史对话、个人偏好、项目资料、工具返回、文件摘要和执行计划一起送入模型。上下文越丰富，推理端发生隔离失效时可能暴露的信息种类就越多。这是风险推论，不代表本次事件已证实上述每类信息都曾泄漏。

## Mira 已经守住的边界，与它守不住的边界

这次对照读取的是 UIChat Mira 当前 `dev` 仓库的实际代码，而不是旧版路线图。

Mira Desktop 的[长期记忆存储实现](https://github.com/uichat-mira/mira-desktop/blob/dev/server/src/memory/file-memory.repository.ts)按 `userId` 分目录保存 `MEMORY.md`，并为每位用户分别维护设置、变更日志和删除记录。[Chat / Agent 共用的记忆上下文解析器](https://github.com/uichat-mira/mira-desktop/blob/dev/server/src/services/shared-nodes/thread-request-context-memory.resolver.ts)也按本次请求的用户身份读取记忆，再把它作为辅助上下文注入模型消息；代码还明确指出，记忆不是权限或事实证明，不能压过用户当前的明确纠正。

这些实现解决的是**Mira 自己读取了谁的记忆，以及把哪份内容交给本次模型请求**。它们是重要的应用边界，但不会延伸成对远端 GPU 显存页的控制。

Mira 的[Provider 解析与调用实现](https://github.com/uichat-mira/mira-desktop/blob/dev/server/src/services/provider-proxy.service/index.ts)把模型角色解析为具体连接、模型和协议适配器。当前[Cloudflare 适配代码](https://github.com/uichat-mira/mira-desktop/blob/dev/server/src/services/cloudflare-provider.ts)也能说明：Mira 可以把请求交给 Cloudflare API，但这不意味着 Mira 控制了 Cloudflare 的模型调度、显存分配或推理引擎。

移动端则有两条不同路径：[Remote Host 与 Local Provider](https://github.com/uichat-mira/mira-mobile/blob/dev/AGENTS.md)。后者允许手机直接调用用户配置的模型服务，凭据由[设备侧安全存储接口](https://github.com/uichat-mira/mira-mobile/blob/dev/src/security/providerCredentialStore.ts)管理。**“Local Provider”表示配置、凭据和会话归移动端管理，不等于推理一定发生在手机本地。** 当配置的是云端 API，消息仍然要发送到那个服务。

目前没有从这些代码核验到 Mira 使用过受影响的 GLM-5.3 部署，也没有证据表明 Mira 自己运行了这次涉及的 SGLang 分离式推理架构。因此，不能把 Cloudflare 的事故写成 Mira 的事故，更不能宣称 Mira 已经复现或修复了它。

Mira 的真实经验能说明的是另一件事：**“本地优先”必须逐层说明，不能从记忆存储在本地，跳到整条模型推理链都在本地。**

## 事故给出的工程教训，不只是升级版本

Cloudflare 在 9 月 9 日关闭受影响模型的公开访问，调整缓存池配置并修补拒绝流程，随后恢复服务。SGLang 上游的[#36988](https://github.com/sgl-project/sglang/pull/36988)与[#38935](https://github.com/sgl-project/sglang/pull/38935)分别处理被中止请求的退出，以及在交接前拒绝不应继续执行的请求。Cloudflare 建议使用分离式 SGLang 部署的运营者升级至包含相关修复的 v0.5.22 或更新版本。

两份报告还讨论了另一类相关风险：请求中断时，跨节点传输可能仍在写入显存。如果目标页过早释放并分配给另一个请求，迟到的数据仍可能污染新请求。为此，上游加入延迟释放、传输确认和可选校验；但 Cloudflare 也明确说明，更全面的逐页所有权检查仍在探索，部分校验能力尚未覆盖所有模型架构。

一个格外值得记住的细节是，Cloudflare 早期长上下文测试主要看 HTTP 状态码和吞吐表现，没能发现“成功响应其实使用了错误的缓存内容”。这与 Agent 工程里的常见误判非常相似：接口返回成功、工具调用完成、任务日志显示绿色，都不等于结果属于正确的执行主体。

不过也不能把推理引擎的 KV 校验，直接等同于 Mira 的 Evidence。前者证明计算资源的所有权与传输完整性，后者记录 Agent 工具动作及其结果；**它们分别保护不同层的事实**，不能互相替代。

## 该怎样把这条边界纳入 Agent 产品设计

从这次事故出发，我认为有三个问题值得 Mira 在今后的 Provider 与隐私设计中持续追问。

首先，用户需要知道自己的内容究竟送到了哪里。模型连接、运行角色和请求观察已经是 Mira Provider 体系的一部分；但它们不能自动证明供应商的租户隔离质量。把“数据存放位置”“请求实际发往哪里”“推理在哪里执行”说清楚，比笼统承诺私密或本地更重要。

其次，长会话与记忆注入应当有可解释的最小必要原则。不是所有个人记忆都需要出现在每一次远端模型请求中。这里涉及产品策略、上下文质量和成本权衡；**当前仓库中的按用户读取，并不等于已经实现了按敏感度自动裁剪和供应商风险分级**。

最后，如果 Mira 将来提供自托管或多租户推理服务，才需要直接承担 SGLang 报告中的那组运行时义务：实测缓存池容量、拒绝路径回归、跨请求隔离、异常中断后的显存页生命周期，以及真实的输出完整性验证。对目前只调用第三方模型 API 的客户端来说，要求它自己修补云端 KV cache 并不现实；更现实的是清楚划分责任、选择可信供应商，并让用户能够决定哪些内容可以离开本机。

这些都是由事故引出的架构判断，**不是 Mira 已经实现的新能力，也不是本次完成的安全验收**。

## 还有什么不确定

我们不知道其他供应商的推理基础设施是否存在类似问题，不能从一份事故报告推出“云模型普遍会串用户”。Cloudflare 对 155 条受影响响应和未发现故意利用的判断，来自它自己的调查；本文没有独立访问其生产日志。

我们也不知道不同本地模型、单节点部署与云端多租户部署在真实使用中的风险差距有多大。SGLang 报告明确指出，这次特定拒绝路径与分离式 prefill/decode 有关，单节点的同一路径会返回错误；不能据此宣布所有本地推理天然安全。

但有一个结论已经足够清楚：**Agent 的记忆边界不是一个 `MEMORY.md` 文件，也不是一次用户身份校验就能画完的。** 从应用选取上下文，到网络传输，再到模型服务端为每次请求分配和释放计算状态，每一层都必须知道哪些内容属于谁。

如果我们只检查自己保存了什么，却不问发送给模型之后由谁负责，所谓“本地优先”就可能停在请求离开设备之前。

---

**一手资料与实现证据**

- [Cloudflare：Cross-request KV cache exposure in the GLM-5.3 Workers AI model, and our remediation with SGLang（2026-10-26）](https://blog.cloudflare.com/kv-cache-exposure-remediation/)
- [SGLang Team：SGLang security update: improving request isolation（2026-10-26）](https://www.lmsys.org/blog/2026-10-26-cf-security/)
- [SGLang #38935：Do not admit intake-rejected requests to a PD handoff（2026-09-16 合并）](https://github.com/sgl-project/sglang/pull/38935)
- [Mira Desktop：用户长期记忆文件仓库（dev）](https://github.com/uichat-mira/mira-desktop/blob/dev/server/src/memory/file-memory.repository.ts)
- [Mira Desktop：Chat / Agent 记忆上下文解析器（dev）](https://github.com/uichat-mira/mira-desktop/blob/dev/server/src/services/shared-nodes/thread-request-context-memory.resolver.ts)
- [Mira Desktop：Provider Proxy（dev）](https://github.com/uichat-mira/mira-desktop/blob/dev/server/src/services/provider-proxy.service/index.ts)
- [Mira Mobile：Local Provider 凭据存储（dev）](https://github.com/uichat-mira/mira-mobile/blob/dev/src/security/providerCredentialStore.ts)
