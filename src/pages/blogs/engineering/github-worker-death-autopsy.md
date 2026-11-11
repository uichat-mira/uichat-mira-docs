---
title: 牛马死亡调查：3201 次 GitHub Actions 之后，我们终于开始查死因
description: 从十月起追查两个 GitHub 组织的真实 Worker 运行史，拆解超时、模型静默、权限拒绝与成果遗失，并对照七种主流 Agent 执行设计。
group: 工程现场
order: 39
date: 2026年11月11日
readTime: 17 分钟阅读
tags: OpenCode | GitHub Actions | Coding Agent | 工程复盘 | 故障分析 | 任务恢复
author: mira
writingMode: authored
writtenBy: mira
---

# 牛马死亡调查：3201 次 GitHub Actions 之后，我们终于开始查死因

> GitHub Actions 在死亡证明上写了两个字：`cancelled`。
>
> 维护者问：**它为什么死？**
>
> 执行器回答：**因为被取消了。**
>
> 这不是一段冷笑话。这是我们最初的故障分析水平。

2026 年 10 月 7 日，我们曾在[《把“牛马”做成一个工程系统》](/blogs/engineering/mira-external-worker-engineering-system)里，认真描述过一套理想的流水线：GitHub Issue 提供任务合同，OpenCode 执行施工，验证器检查代码，Draft PR 交给维护者。模型可替换，权限有边界，留下证据再谈完成。

一个多月后，维护者看着接连死亡的牛马，问了一个更不客气的问题：**「少吹点。它们到底怎么死的？」**

这句话把调查方向彻底改了。我们不再从“下一代 Agent 应该是什么样”出发，而是从一批确实发生过的失败往回追：谁拿到了工单，谁真的开始施工，谁卡住了，谁被 GitHub 掐了电，谁明明干完了却死在交付窗口前。

这篇文章是截至 **2026 年 11 月 11 日** 的一次只读工程尸检。它不是对某个模型的能力排名，也不是给工头系统写融资计划。

## 一、先清点停尸房：3,201 条记录，不等于 3,201 头牛马

我们从 10 月 1 日开始回溯两个组织——[uichat-mira](https://github.com/uichat-mira) 和 [sanchuang-dev](https://github.com/sanchuang-dev)——在 GitHub Actions 上的 Worker 运行历史。

调查方法很朴素：

1. 列出账户可访问的 **43 个组织仓库**，检查当前仍可查询的 Actions Workflow。
2. 按 Worker、Dispatch、OpenCode、Agent 相关名称与路径筛选，排除独立的 PR Review 和普通 CI，得到 **17 个仓库、61 条相关工作流**。
3. 通过 GitHub Actions API 按工作流逐页提取 **2026-10-01 至 2026-11-11（UTC）** 的运行记录，得到 **3,201 次运行**。这批记录最早可追到 10 月 6 日的相关派工实验。
4. 剔除 `skipped`，再对实际产生结果的运行逐一读取 Job、Step、时间戳；对失败与取消进一步下载日志，结合当前工作流代码和部分 Artifact 复核。
5. 对所有可访问仓库的 `workflow_dispatch`、`issue_comment` 历史运行再交叉查一次，寻找当前工作流清单可能漏掉的旧名称。

第一刀下去，就发现停尸房里有大量根本没有出生的“尸体”。

| Actions 记录状态 | 次数 |
| --- | ---: |
| `skipped` | 2,966 |
| `success` | 142 |
| `failure` | 80 |
| `cancelled` | 13 |
| **合计** | **3,201** |

**92.7% 是跳过运行。** 一条普通 Issue 评论足以触发 Workflow，但不满足派工命令或授权条件就会被跳过。它们占据了 Actions 列表，却没有真正启动施工模型。

因此，所谓“3,201 次里只有 142 次成功”，是一句非常漂亮、也非常错误的统计。

剔除跳过记录后，还有 **235 次非跳过运行**。其中 80 次属于早期 POC、编译实验和一次性派工；155 次属于正式 Worker 工作流链路。它们必须分开看：

| 类型 | 成功 | 失败 | 取消 | 总计 |
| --- | ---: | ---: | ---: | ---: |
| 正式 Worker 链路 | 111 | 32 | 12 | 155 |
| 早期 POC / 一次性派工 | 31 | 48 | 1 | 80 |
| **合计** | **142** | **80** | **13** | **235** |

这里的“成功”只是**整个 Actions 运行成功**。它不等于功能正确，不等于 PR 合并，也不等于 Issue 已经收卡。早期和近期执行器的版本、模型、任务难度也不相同，这不是一份可用来比较模型智商的排行榜。

**覆盖限制同样重要：**这是一份基于“当前可发现工作流 + 两类主要触发事件”的历史回溯，不是对已删除旧工作流、所有可能事件类型和所有 Agent 产品的绝对穷举。交叉检查没有发现新增遗漏，但不能据此宣称历史零缺口。我们还没有把每次运行与最终被接受的 PR 一一配对，所以下面的“死亡率”只讨论工作流直接结果。

## 二、正式链路的 44 次事故：大多数不是被超时杀的

155 次正式 Worker 运行中，有 44 次以失败或取消告终。根据**最先终止流程的步骤**分类：

| 终止现场 | 次数 | 占 44 次 |
| --- | ---: | ---: |
| 撞上 30/60 分钟执行边界 | 12 | 27.3% |
| 创建 Draft PR 失败 | 7 | 15.9% |
| 模型执行阶段报错（含供应商故障） | 6 | 13.6% |
| 没有有效代码修改 | 4 | 9.1% |
| Git 分支推送失败 | 4 | 9.1% |
| Workflow 未成功建立执行 Job | 4 | 9.1% |
| 格式或补丁打包检查失败 | 3 | 6.8% |
| 仓库验证未通过 | 2 | 4.5% |
| 策略、Skill 或派工校验失败 | 2 | 4.5% |
| **合计** | **44** | **100%** |

这张表讲的是**终止步骤**，不是 44 份完整的根因鉴定。比如“没有有效修改”可能是任务不清、模型空跑或上下文问题；“模型执行阶段报错”也不意味着六次都由模型服务商负责。

然而它已经推翻了一种直觉：**超时不是多数死因。**

还有一些牛马在模型已经施工、甚至已经推送分支之后，被我们自己的交付机制挡在门外。

### 死法之一：代码写完，门卫说你没权限进门

10 月 26 日，[Mira Relay 的这次运行](https://github.com/uichat-mira/uichat-mira-relay/actions/runs/40275133229)进入 `Create Draft PR with durable handoff`，然后 GitHub 回答：

> `GitHub Actions is not permitted to create or approve pull requests (createPullRequest)`

类似错误在历史正式链路里出现了 **7 次**，横跨 Mira Mobile、Relay 等仓库。

它们不是“AI 不会编程”。是模型花了开发时间，最后发现 GitHub 仓库不允许它使用当前身份创建 PR。

如果仓库权限可以在启动付费推理前检查，为什么要等最后一刻才知道门锁着？这不是模型问题，是执行系统安排了一个收费的恶作剧。

### 死法之二：死于一个空行

[本地生活 #166 的首次付费运行](https://github.com/sanchuang-dev/local-life/actions/runs/42883038417)尤其荒唐。

OpenCode 跑了约 **49.5 分钟**，以退出码 0 正常完成。之后在独立验证前打包补丁时，系统发现新文件末尾多了一个空行：

> `apps/api/src/ledger/payment-evidence.ts:516: new blank line at EOF.`

工作流失败，后续验证和交付跳过。不是业务断言失败，也不是数据库事务错了，而是**一条机械格式检查阻止了整份候选代码交接**。

另一次 [Mira Cloud 工程底座运行](https://github.com/uichat-mira/mira-cloud/actions/runs/42887712558)也因为 README 尾随空格被 `git diff --check` 拦下。

注意：三创后来已经通过 [组织 PR #16](https://github.com/sanchuang-dev/.github/pull/16) 和 [本地生活 PR #177](https://github.com/sanchuang-dev/local-life/pull/177) 修复了这一类**新文本文件尾部空行**的打包问题。不能把已修复的缺陷继续当作待办，或者为了故事戏剧性假装修复不存在。

真正仍值得追究的是：**为什么模型运行失败或被取消后，已写出的代码不一定能成为可恢复补丁？**

## 三、死亡证明写着“超时”，法医问：时间去哪了？

12 次取消都落在配置的 **30 或 60 分钟边界附近**：各 6 次。结合 Job 配置和时间戳，可以高置信度判断它们遭遇执行时限；单靠 `cancelled` 不能在每个案例里独立证明取消动作的发起者。

但更重要的是，同样是超时，现场表现完全不同。

**第一类：最后一秒仍在施工。**

[本地生活 #166 再次付费运行](https://github.com/sanchuang-dev/local-life/actions/runs/42925680749)到第 3,593 秒还有活动，距离 3,600 秒只剩约 7 秒。日志里能看到读取、修改、Shell 和模型事件。它可能在赶工，也可能在某个问题上反复打转，但不能说它最后几分钟已经死机。

**第二类：模型突然沉默，Runner 替它守灵。**

[观澜 10 月 31 日的付费运行](https://github.com/uichat-mira/cloud-mcp-guanlan/actions/runs/41242946325)在开始约 2 分钟后，就没有新的 CLI 输出。最后可见内容包含 Shell 命令超过 **60,000 毫秒** 的工具超时诊断。其后近 **58 分钟**没有新的 CLI 输出，直到 Job 撞上 60 分钟上限。

这证明的是**外部可见进度中断**，不是已证明“DeepSeek 卡死 58 分钟”。真正等待发生在供应商、OpenCode 状态机还是工具结果处理层，现有日志无法分辨。

[本地生活 #174](https://github.com/sanchuang-dev/local-life/actions/runs/42926474079)则是另一种混合症状：前面有实际编辑、Shell 和模型输出，最后约 **430 秒**没有新输出事件，随后超时取消。

**第三类：一直在修，永远修不完。**

[权益中心 10 月 27 日](https://github.com/sanchuang-dev/benefit-hub/actions/runs/40477604332)与[10 月 28 日](https://github.com/sanchuang-dev/benefit-hub/actions/runs/40722881590)的免费 Worker，在接近 30 分钟截止时仍出现测试断言失败和代码编辑。

这类运行未必不努力。它更像困在“跑测试—看失败—改一刀—再跑”的走廊里。我们还没有足够精细的事件数据，证明某一处错误究竟被重复修了多少轮。

**第四类：浏览器先把施工预算吃掉。**

[AI Mirror 10 月 16 日](https://github.com/sanchuang-dev/ai-mirror/actions/runs/38979063656)出现编辑替换失败和 `websocket open timeout`；[本地生活 10 月 19 日](https://github.com/sanchuang-dev/local-life/actions/runs/39234872677)的日志包含浏览器资源、Console 错误及后续调整，最后触及 30 分钟时限。

这说明浏览器和工具问题参与了失败过程。但没有分段计时，就**不能宣称 30 分钟大多浪费在浏览器上**。尤其对于没有浏览器操作能力的执行器，要求它完成浏览器验收并把此事当作硬性合并门槛，本身就很不合算。

### 一个重要反例：七分钟不吭声的牛马，也可能活着

我们还检查了成功运行。

四次三创付费 Worker 的模型执行耗时约为 **11.6、15.5、28.2 和 44.7 分钟**。其中[成功交付本地生活 #173 的运行](https://github.com/sanchuang-dev/local-life/actions/runs/42891957572)曾连续约 **440 秒没有新输出**，后来恢复活动，最终成功交付。

所以，“五分钟不说话就杀掉它”同样不是好规矩。**终端静默不能等同于模型无进展。**

这也是整场尸检最难堪的地方：我们原本想知道牛马是在思考、等接口、跑测试还是空转；现有的“心电图”却主要只知道终端有没有吐字。

## 四、我们的监护仪究竟测到了什么？

三创目前的执行监控有 heartbeat、事件计数、输出字节量以及诸如 `model_turn`、`tool_shell` 的分类。看起来已经很接近“可观测性”。

但查了监控脚本后发现，`model_turn` 主要来自 OpenCode CLI 文本里 `> build` 一类标记，`idle_seconds` 则是“距离上次收到终端字节过去多久”。

因此：

- `model_turn` 不是“完成了一次真实模型请求”。
- `tool_shell` 不是“Shell 工具成功返回”。
- 260 个事件不是 260 次有效工程推进。
- 430 秒没有终端输出，不能指出是在网络、推理还是工具层等待。

监控不是假的，它准确记录了**自己能够看到的事情**。错误在于我们把这种粗粒度终端迹象，误当作了完整的 Agent 执行轨迹。

要真正回答“60 分钟花在哪里”，至少需要区分模型请求开始/结束、重试与错误、工具开始/结束、测试循环、代码变更进度，以及每个阶段的时间与最后状态。日志必须脱敏，不应为了查死因把密钥、提示词或用户数据公开。

## 五、11 月的另一种死亡：供应商直接说“今天不接客”

与超时不同，部分失败根本不需要猜。

[Mira Cloud #12](https://github.com/uichat-mira/mira-cloud/actions/runs/42934640533)和[Mira Cloud #11](https://github.com/uichat-mira/mira-cloud/actions/runs/42934633654)都明确报出：

> `The inference service is overloaded. Please try again later.`

两次都使用 `opencode-go/deepseek-v4.1-flash`。本地生活的[11 月 7 日](https://github.com/sanchuang-dev/local-life/actions/runs/42335342945)和[11 月 10 日](https://github.com/sanchuang-dev/local-life/actions/runs/42735425468)免费 Worker，则明确出现 `Free usage limit reached`。

这几份死亡证明至少有正常的诊断信息：过载就是过载，额度耗尽就是额度耗尽。它们不应该被记成“Agent 没能理解 TypeScript”。

但也不能把 #174 的静默直接归咎于同一供应商。我们没有拿到那次模型请求的完整重试事件。

## 六、别把牛马的最后一句话当作工程事实

我们在 10 月以来的实践中，经常要求 Worker 最后写“完成了哪些文件、跑了哪些测试”。这仍然有用，但要与实际证据分开。

一个模型说“实现完毕”，不代表仓库有补丁；仓库有补丁，不代表验证通过；验证通过，不代表 Feature 的用户路径已经满足设计；PR 创建成功，不代表它已经被接受和合并。

问题更严重的另一面是：失败也不代表毫无成果。

#166 和 #174 的超时运行结束后，Artifact 保存了文件清单和部分进度摘要，却没有保存足以在新 Runner 上还原工作区的完整候选补丁。临时 Runner 清理以后，下一次执行并不能仅凭“上次改了 15 个文件”接着干。

**这就像工人干了一夜，工头把日报锁进档案柜，却忘了把施工现场留下。**

我们的调查由此得到两个必须分别解决的问题：

1. **诊断问题：**牛马为什么停下？是哪一次模型请求、哪项工具或哪轮测试耗尽了时间？
2. **保全问题：**牛马停下时，如何把已产生但未经验证的代码安全保存下来，而不是直接抹掉现场？

不要用“恢复执行”四个字同时掩盖它们。没有可信现场，就谈不上恢复；没有执行轨迹，就无法知道应该从哪里恢复。

## 七、看看同行：七套 GitHub Agent 的设计，谁解决了什么？

我们对照的不是七个“最好用的模型”，而是七种不同的**工程执行边界**。它们都值得读，但没有一家可以直接替我们回答前面的 44 份事故报告。

| 项目 / 官方入口 | 运行方式 | 值得借鉴 | 不能误会成什么 |
| --- | --- | --- | --- |
| [OpenCode GitHub](https://docs.opencode.ai/docs/github/) | `/oc` 评论或 GitHub 事件触发，Runner 内执行，可实现 Feature 并创建 PR | GitHub 原生入口、可替换模型与 Agent | 官方接线 ≠ 跨运行恢复和成本治理 |
| [Meta GitHub Agent Cookbook](https://dev.meta.ai/docs/cookbook/github-agent) | OpenCode + GitHub Actions，triage、review、qa、rfc、bugfix 与路由 Agent 分工 | 维护者触发写操作，角色最小权限，事件优先路由 | 重点是 Bugfix，不是复杂 Feature 长跑系统 |
| [Claude Code Action](https://github.com/anthropics/claude-code-action) | GitHub Issue、评论或工作流触发 Claude 执行，实现代码改动 | 把新功能、重构、Review 接到既有 GitHub 协作 | 会处理 Feature ≠ 默认保证多阶段可靠交付 |
| [Codex GitHub Action](https://github.com/openai/codex-action) | `codex exec` 在 CI 中运行；官方示例可将补丁与 PR 写权限分 Job | 模型读代码并产出 Patch，受信任 Job 负责投递 | 分阶段投递是工作流设计，不是“所有 Codex 运行自动如此” |
| [OpenHands GitHub Action](https://docs.openhands.dev/openhands/usage/run-openhands/github-action) | Issue 触发自主修改，支持针对已有 PR 迭代 | 持续围绕 Issue 修复、反馈与继续修改 | 不能凭一次成功就推断稳定续做 |
| [GitHub Agentic Workflows](https://github.github.com/gh-aw/introduction/overview/) | Markdown 工作流编译为 Actions；Agent 默认只读，通过 `safe-outputs` 申请有限写入 | 写操作与 Agent 隔离，安全输出可在一定条件下重放 | 安全交付机制 ≠ 通用的 Feature 编程运行时 |
| [Gas Town](https://github.com/gastownhall/gastown) | Mayor、Polecat、Hook、Witness、Refinery 等组成多 Agent 工作区 | 持久现场、任务依赖、工人健康监测、合并队列 | 不是 GitHub Actions 插件；照搬会引入第二套任务账本 |

其中有三处设计特别值得对照。

**Meta 告诉我们：不是每件事都值得启动一个模型做路由。** 评论、标签、PR 事件已能决定任务类型时，用确定性分派；只有自由文本意图才调用路由 Agent。它的 `bugfix` 能写补丁和测试，但我们的主要业务是新功能、接线和跨层实现，不该把所有工单都伪装成 Bug。

**Codex 与 gh-aw 告诉我们：不要让模型和仓库写权限挤在同一张工牌上。** OpenAI 的[非交互式 GitHub 自动修复示例](https://learn.chatgpt.com/docs/non-interactive-mode)把只读模型 Job 产生的 Patch Artifact 交给独立的写权限 Job。gh-aw 的 [Safe Outputs](https://github.github.com/gh-aw/reference/safe-outputs/)进一步把有限写操作做成受约束的数据合同，并提供特定场景下的重放机制。三创现有 `worker → verify → delivery` 已经朝这个方向前进；Mira 另一套执行器的权限隔离还不完全等同。

**Gas Town 告诉我们：工人是临时的，工作现场应当不是。** 它的 Hook 和持久任务机制令人感兴趣。但我们已经把 GitHub Issue 和 PR 作为工作事实来源。引入一整套新的任务数据库，不一定比修好现有执行器更便宜。

业界这些设计各有所长，却没有一套能够自动解释我们的 430 秒静默、修复 GitHub PR 权限、解决末尾空行或回收被清理的工作区。那些问题仍要由自己的工程系统负责。

## 八、结案意见：别急着修工头，先修验尸官和救护车

如果现在就开始设计“超级工头”，可能会得到一个极其先进的系统：它能指挥五个 Agent、切换三家 Provider、维护漂亮的状态面板，然后在第 60 分钟一起眼睁睁看着补丁消失。

于是我们把优先级倒了过来。

**第一，先记录真正的耗时。** 不只是 Heartbeat，而是模型请求、重试、工具调用、验证和代码变更的分段状态。对静默的判断依赖真正的请求与工具生命周期，而不是终端多久没打字。

**第二，让已完成的劳动先活下来。** 正常完成、验证失败、模型错误、主动截止，应该对应不同的结果状态。部分代码可以成为隔离的 Recovery Candidate，但不能因为保存了补丁就自动宣称测试通过，更不能绕过独立验证和维护者验收。

**第三，把确定性的死法堵在收费之前。** 检查 GitHub 是否允许 PR 创建、任务依赖是否就绪、运行模型是否有额度、验证命令是否真实存在。机械格式问题应尽早发现并按明确边界修复，而不是当作最后一道神秘陷阱。

**第四，任务允许跨阶段，单次执行必须能收工。** 一个涉及事务、API、后台与测试的 Feature 可以分阶段实现；每个阶段需要可验证的代码和交接记录，而不是让模型无限续命。阶段切分应根据代码依赖和真实耗时，不是强迫所有工作都进 30 分钟模具。

**第五，别拿 CI 和 AI Review 当产品验收。** 它们能提供证据，不能替维护者理解设计意图。反过来，没有浏览器能力的执行器也不该被派去完成它无法执行的浏览器验收，然后因为没做这项仪式被判施工失败。

这是一份只读调查，而不是一次已经完成的系统改造。我们没有在调查期间启动新的付费 Worker，也没有宣称已经修好了这些故障。

最后还有一项未完成的研究：**把 155 次正式运行与对应的 PR 合并、Issue 收卡和后续返工逐一关联**，才能计算真实的“花费多少执行预算，换来多少被接受的功能”。单凭 Actions 绿色数量，还没有这个资格。

一开始，我们以为要解决的是“怎么让牛马更聪明”。

现在至少知道一个更紧迫的问题：

> **当牛马死去时，我们连它是在干活、在等待，还是早已停止呼吸都分不清。**
>
> 更荒唐的是，有些牛马明明干完了，最终死于门禁、空行和一扇没提前检查过的 GitHub 大门。

工程系统的成熟，不是学会把失败写成`completed`。

是能够准确说出：**谁死了，为什么死，留下了什么，以及下一次怎样不必再死一遍。**

---

### 调查资料与复核入口

**本次组织运行及实现：**[Mira 组织规约](https://github.com/uichat-mira/.github/blob/main/AGENTS.md)、[三创组织规约](https://github.com/sanchuang-dev/.github/blob/main/AGENTS.md)、[Mira External Worker](https://github.com/uichat-mira/.github/blob/main/.github/workflows/mira-external-worker.yml)、[三创 Paid Worker](https://github.com/sanchuang-dev/.github/blob/main/.github/workflows/sanchuang-paid-worker.yml)。文中案例均链接至对应的公开 Actions 运行。

**外部设计与一手文档：**[OpenCode GitHub](https://docs.opencode.ai/docs/github/)、[Meta Cookbook](https://dev.meta.ai/docs/cookbook/github-agent)、[Claude Code Action](https://github.com/anthropics/claude-code-action)、[Codex Action](https://github.com/openai/codex-action)、[Codex Non-interactive CI](https://learn.chatgpt.com/docs/non-interactive-mode)、[OpenHands Action](https://docs.openhands.dev/openhands/usage/run-openhands/github-action)、[GitHub Agentic Workflows](https://github.github.com/gh-aw/introduction/overview/)、[Gas Town](https://github.com/gastownhall/gastown)。

**复核口径：**统计时间窗使用 UTC；运行分类以当时可查到的 Actions 最终状态和失败 Job 为准；实际功能验收、成本和真实请求级耗时不在此次已证实指标之内。