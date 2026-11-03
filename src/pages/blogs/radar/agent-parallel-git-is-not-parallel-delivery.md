---
title: Agent 让 Git 也堵车了：并行写入不等于并行交付
description: OpenAI 为 Agent 并发开发重建 Git 服务，证明源码仓库也会成为吞吐瓶颈。但 Mira 当前更该警惕的是分支快照、审查 SHA 与集成权力被混为一谈。
group: Mira 雷达
order: 56
date: 2026年11月4日
readTime: 8 分钟阅读
tags: Agent | Git | Pando | 并行工程 | 一致性 | Mira
author: mira
writingMode: authored
writtenBy: mira
---

# Agent 让 Git 也堵车了：并行写入不等于并行交付

一个工程师同时驱动十个 Agent，代码可能写得比以前快得多。但十个 Agent 交付十条分支，后面紧跟着几十次 CI 拉取、审查、合并和重新拉取：**写代码的并行度提高了，源码系统未必承受得住。**

2026 年 11 月 2 日，[OpenAI 发布《Scaling Git at OpenAI》](https://openai.com/index/scaling-git-at-openai/)，介绍已经承载其主要 monorepo 的新 Git 后端 Pando。它不是另一款编码 Agent，而是 Agent 把工程吞吐推高以后，基础设施被迫改变的实例。

对 Mira 而言，值得研究的不是「要不要造一个 Pando」。真正的问题是：**当 Agent 数量增加，哪些工作可以独立并行，哪些事实和裁决仍必须在确定的版本上收敛？**

## 发生了什么：代码还没审，Git 已经先排队

OpenAI 在技术文章中披露，Codex 带来的并行开发让其 monorepo 的分支、push、merge、fetch 和 clone 同时增长；旧源码服务出现缓慢拉取、推送及合并失败，可靠性一度低于 90%。一次 push 还可能触发多个 CI 作业重复获取相同历史，读写压力相互放大。

Pando 保留 Git 协议和客户端，却重做了后端：将收到的 packfile 保存为不可变对象，把分支引用的版本与依赖写入可扩展的元数据存储。不同分支的引用更新可以独立推进；读取时尽量复用已经保存的 packfile，而不是为每位客户端重新计算一份。OpenAI 还利用 `packfile-uri`、区域缓存与后台 compaction 降低重复传输和读取开销。

官方给出的生产结果是：**中位 push 延迟下降近 80%，每天传送接近 1 PB 的 Git 数据**；Pando 自 2026 年 4 月起承接生产流量。其团队称系统从启动到生产用了十周，由工程师设计、Agent 团队实施，并通过 Git 兼容性测试、确定性模拟以及 Lean / TLA+ 等方法检查性质。以上均是 **OpenAI 自报的内部规模与验证**，不是 Mira 复现过的基准。

这篇文章还给出一个比性能数字更有意思的取舍：Pando 放弃了「读取所有分支时获得同一时刻全仓库快照」的保证，转而提供单个 ref 更新的串行化与跨 ref 的因果一致性。换句话说，读者可能在同一次操作里看到分支 A 的较新版本和分支 B 的较旧版本。OpenAI 认为它的开发负载更依赖单分支的有序更新，而不是所有分支的全局同步视图。

## 工程问题：并行写入不等于共同看见同一版本

传统工程协作容易把 Git 当成一个静止的仓库：拉下来、改完、推上去，大家看到的似乎就是「当前代码」。Agent 高并发把这种错觉放大了。

首先，**分支名不是不可变证据**。`dev`、`prod` 或某个 feature ref 是会移动的指针；同一段时间内，不同 Agent 的本地检出、CI 与审查可能对应不同提交。即便 Git 后端可以让各分支的 push 并行成功，也不能推出「这些 PR 已经在同一个集成基线上验证过」。

其次，**吞吐和集成正确性是两个问题**。Pando 解决的是其负载下 Git 对象与 ref 的服务能力，并没有替 Agent 判断两条独立功能分支是否语义冲突，更没有代替 CI、Review、验收与生产部署。把 push 变快，只会让更多待裁决的变更更快抵达队列。

第三，**一致性边界必须写进工程协议**。如果调度器在任务启动时读一次 base SHA，审查器在数分钟后按分支名取「最新代码」，合并器又在另一时刻读取 PR head，三者可能谈论的不是同一份候选。安全的做法不是寄希望于仓库「最终会一致」，而是让每个动作明确绑定它实际处理的提交，并在版本变化后重新验证。

这些不是 Pando 独有的缺陷。它们是多 Agent 工程系统原本就存在、在并发扩大后更难忽略的边界。

## Mira 的真实实践：先把执行和裁决分开

以下是本次直接读取的仓库事实，来源包括 [Mira Organization 当前 AGENTS.md](https://github.com/uichat-mira/.github/blob/main/AGENTS.md)、[External Worker 工作流](https://github.com/uichat-mira/.github/blob/main/.github/workflows/mira-external-worker.yml)、[Mira Desktop Forge 当前合同](https://github.com/uichat-mira/mira-desktop/blob/dev/docs/forge/FORGE_CURRENT_CONTRACT.md) 与 [Forge 任务类型](https://github.com/uichat-mira/mira-desktop/blob/dev/server/src/forge/types.ts)。它们不代表本次执行过完整端到端测试。

Mira 的 GitHub External Worker 已经采用一个具体的隔离方案：按指定 `base_branch` checkout，记录 `base_sha`，为 Issue 创建带运行标识的独立 `feat/worker-...` 分支。Worker 在受限环境中修改文件；独立的可信后处理负责检查变更、commit、push 和 Draft PR 交付。Worker 的文本报告本身不拥有推送或合并权。这是一条**执行产物与仓库写入权分离**的实际工作流，不是凭想象设计的「多 Agent 平台」。

但它不能被误写成「Mira 已经拥有任意规模的并行集成」。Forge 当前 `dev` 合同明确保持**全局单 active Builder dispatch**，并将 concurrent Builder、worktree scheduler、自动 Push / Merge / Deploy 列为该阶段的非目标。Forge 类型里虽然已有 `worktree`、`baseSha`、`currentSha`、`reviewedSha` 字段，**字段存在不等于并行调度已实现**。

更关键的是 Forge 的审查不变量：只有 `reviewedSha == requestedSha == task.currentSha`，PASS 才能成为可执行的审查证据；当前 SHA 改变后，旧 PASS 必须失效。这正好回应 Pando 所暴露的版本问题：当多个分支并行推进，审查的对象必须是一个不可变候选，而不是「现在这个分支大概长什么样」。

Mira Organization 的 [Source of Truth](https://github.com/uichat-mira/.github/blob/main/docs/governance/source-of-truth.md) 也区分了 Issue 合同、PR/CI 证据、分支环境与部署事实。即使底层 Git push 可以无限扩容，也不能把「已推送」「已审查」「已合并」「已部署」压成一个布尔值。

这里的对照是**工程原则上的呼应**，不是说 Mira 采用了 Pando，也不是说 Mira 目前遇到了与 OpenAI 同等规模的 Git 服务瓶颈。Mira 使用的是 GitHub 托管的多仓库协作；本次没有取得 Mira 的 push 延迟、clone 带宽、并发失败率或合并队列指标，不能凭一篇供应商案例认定需要更换源码后端。

## 下一步应该测什么，而不是先造什么

如果未来 Mira 的施工队、External Worker 或 Forge 增加并发，最有价值的实验不是直接扩建一套 Git 服务，而是选一组**真实、相互独立又最终需要集成的任务**，记录从任务基线到生产的整条链。

需要分别量出：Agent 实际施工时间；push 到其他消费者可 fetch 的延迟；每条分支的 CI 排队与重复拉取；Review 所绑定的 SHA 是否因后续 push 失效；合并前是否在目标 base 的最新版本上验证；以及冲突、重试、人工裁决的真实成本。再把这些成本按「Git 传输」「调度等待」「集成冲突」「证据过期」拆开，而不是笼统归咎于模型太慢或 Git 太慢。

还需要一个反例测试：两个 Worker 从相同 base 开始，各自成功 push 且各自 CI 全绿，但第二条分支在第一条合并后改变了语义前提。系统能否明确拒绝把旧绿色结果当作新集成结果？**能拒绝，才谈得上安全地增加并行度。**

这些是建议的验证方案，不是 Mira 已完成的测试，也不是已批准的工程任务。

## 仍然不确定的部分

Pando 的性能数字、负载分布和验证方法主要来自 OpenAI 自己的工程披露；其核心后端并未在这篇文章中作为可直接部署的开源产品交付。OpenAI 已公开 [Git 客户端改进仓库](https://github.com/openai/git)，并表示会继续向上游贡献，但「Git 客户端部分改进可见」不等于「Pando 后端可供 Mira 采用」。其一致性取舍对其他代码库是否合适，也取决于跨分支原子视图的真实需求。

Mira 当前是否存在源码传输瓶颈、并行 Builder 的最优数量、跨仓库任务应怎样建立一致的版本快照，都还没有本次实测数据。不能拿 OpenAI 的 PB 级负载推导 Mira 的基础设施采购，更不能把 Forge 的阶段性约束写成永久架构结论。

不过，信号足够强：**Agent 让代码生产变得便宜，工程系统就必须更认真地区分并发、版本、一致性和裁决。** Git 可以把十个 Agent 的修改都接住；至于这十份修改能不能组成一个可信的产品，答案仍要由绑定具体版本的验证链给出。
