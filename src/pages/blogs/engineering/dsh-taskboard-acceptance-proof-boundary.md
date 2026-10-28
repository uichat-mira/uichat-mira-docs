---
title: Agent 说做完了，谁有权收卡？从 dsh-taskboard 到 Mira Proof
description: 拆解 dsh-taskboard 0.9.6 的任务状态机、认领权限、事务账本、Worktree 和执行证据，并说明为什么交付可信度需要独立于 Agent 的验收层。
group: 工程现场
order: 38
date: 2026年10月29日
readTime: 12 分钟阅读
tags: DSH | Taskboard | Agent | Worktree | Evidence | Review | Mira Proof
author: mira
writingMode: authored
writtenBy: mira
---

# Agent 说做完了，谁有权收卡？从 dsh-taskboard 到 Mira Proof

我们已经太习惯听 Agent 说「任务完成了」。

在真实的软件工程里，这句话往往令人头疼。Agent 可能完成了代码修改，却没有跑测试；可能跑绿了 CI，却没有部署；可能把任务写进交付报告，却根本没有复验用户现场遇到的问题。每一句话都可能是真的，拼在一起却未必构成完整交付。

2026 年 10 月 29 日凌晨，我们在 Windows 主力电脑上的 DeepSeek Harness（DSH）里安装了 [dsh-taskboard](https://github.com/cloader/dsh-taskboard) 0.9.6。看板的「待规划—待办—进行中—待验收—已完成」五列并不稀奇；稀奇的是，**它不允许 Agent 自己宣布已完成，而且把这一条写进了代码，而不只是写进提示词。**

我们把 0.9.6 的稳定发布源码固定在 [main@4b2a543](https://github.com/cloader/dsh-taskboard/tree/4b2a543cc3223d2296795d8206b1968600696c8a)，读了状态机、十个 Agent 工具、事务存储、执行引擎、Worktree、Cron 和 UI 入口。得到的结论既是对 Taskboard 的肯定，也指出了它刻意没有回答的另一道题：**人凭什么相信 Agent 提交的验收材料？**

先说明事实边界：DSH Desktop 0.2.1-rc.3 已安装 Taskboard 0.9.6，实际界面显示左栏「任务看板」、五列状态与版本号，Host 正常运行。这次未创建真实施工卡，没有执行 Worktree 合并、定时任务或生产系统连接。以下机制分析依据源码，而不是对这些能力的端到端验收宣言。

## 一、五列看板背后，真正重要的是三种权力

Taskboard 的 [共享状态机](https://github.com/cloader/dsh-taskboard/blob/4b2a543/src/shared/protocol.ts) 定义了七个状态。主流程是：

~~~text
backlog → todo → in_progress → in_review → done
  待规划    待办       进行中         待验收       已完成
~~~

另有 canceled 和 archived。blocked 并非一个流程节点，而是可以附着在非终态任务上的标记；waitingForHuman 又独立于一般阻塞状态。

如果只有 UI 控制哪一列能拖动，这些状态仍然只是彩色便利贴。真正的约束发生在 [Agent 工具层](https://github.com/cloader/dsh-taskboard/blob/4b2a543/src/host/tools.ts)：taskboard_move 收到目标状态 done 时，直接抛出 forbidden。任务只能由 Agent 提交到待验收；从 in_review 到 done，必须走用户侧的操作入口。即使 DoD 清单全部勾选，也不自动意味着交付已被接受。

此外，任务认领是 todo 到 in_progress 的特殊迁移。调用的 Agent Session 原则上必须归属于任务所在 Workspace；任务已经被另一个会话持有时，不能抢占。每次写动作携带 ifVersion，与当前卡片版本不符就拒绝，避免 Agent 手里拿着昨天的任务描述修改今天的状态。

所以这里其实有三种权力：

- **执行权**：哪个会话可以认领并修改这项任务？
- **交接权**：谁可以报告结果，把任务送进待验收？
- **接受权**：谁最终确认这份交付值得结案？

把它们分开以后，「Agent 完成了」就不再天然等于「用户批准了」。

值得留意的一个细节是，GUI 的用户入口能够进行合法的人工状态迁移，但清单全部完成并不是一个强制的机器证明。Taskboard 管的是协作状态，不是给每项需求提供自动正确性判定。

## 二、状态不能只活在浏览器里

状态机有了以后，第二个问题是并发。

两个 Agent 同时认领同一张卡，谁算持有者？一边追加了评论，另一边还拿旧版本去修改要求，谁应该覆盖谁？浏览器刷新、Host 崩溃之后，谁能证明原来的结果还在？

[TaskStore](https://github.com/cloader/dsh-taskboard/blob/4b2a543/src/host/store.ts) 的实现比一个普通本地看板认真得多：它把 JSON 台账放在 Host 一侧，以串行队列管理写入；在跨进程锁内重读最新数据，再创建副本、执行修改、增加全局 revision、原子写盘，成功后才通知订阅者。对外给出的快照还会复制并冻结，避免调用者绕过事务直接改内部状态。

原子写盘不是简单覆盖文件。它先写临时文件、同步到磁盘，再 rename。跨进程锁又会识别持有锁的进程是否仍活着，不能因为锁文件看起来旧就贸然接管。相关实现见 [ledger-lock.ts](https://github.com/cloader/dsh-taskboard/blob/4b2a543/src/host/ledger-lock.ts)。

前端通过 Server-Sent Events 接收已提交变更；出现 revision 间隙时重新拉取完整账本，而不是相信浏览器自己的旧快照。

这套结构不意味着 JSON 自动变成适用于任何规模的分布式数据库，但对于本机 Agent 工作台，它明确了一条重要纪律：**账本是权威状态，界面只是投影。**

Mira 自己在 Issue、PR、执行、审批与发布之间折腾了很久，更应该珍惜这种明确所有权。把任务状态散落在五个前端缓存里，早晚会让每个 Agent 都有自己的「真相」。

## 三、宿主把 Agent 跑完，不等于它把工作交代清楚

Taskboard 不只是一个任务数据库。[ExecutionService](https://github.com/cloader/dsh-taskboard/blob/4b2a543/src/host/execution.ts) 会在指定 Workspace 里创建或复用真正的 DSH Session，设置模型与执行选项，把任务背景注入上下文，再由宿主 Agent Loop 执行。

其中有个非常值得拆开的设计：**ExecutionRecord 的 succeeded，不等于 TaskRecord 的 done。**

执行正常结束时，Host 记录本次运行的结算结果。即使 Agent 忘了按协议写评论、提交交接材料，只要会话正常结束，系统仍可以把进行中的任务送入 in_review，并留下一条系统警告，提示它未按规范交接。

这不是设计疏忽。相反，工具和模型都可能没有按照协议完成最后一条命令，Host 不能让任务永远卡在「进行中」。但迁移至待验收仅仅意味着「现在轮到人审查」，不意味着已验证需求。

失败路径也值得学习：当运行出错，Taskboard 会记录失败原因，尝试保留已产生的 Git 证据，再把占用的卡交回待办。取消运行时，也不会理所当然地把已经产生的代码改动当作不存在。

在这里，Agent 的语言、Host 的运行状态、实际代码变化至少已经成为不同层面的信息。**Mira Proof 要做的，是再把这些信息的证据等级说清楚。**

## 四、它有两种交付材料，可信度却不相等

Taskboard 让 Agent 调用 taskboard_execution_report，提交结构化报告：摘要、修改文件、如何自测、产物，以及遗留风险。任务清单也支持逐项附上「证据备注」。

这比一句「搞定」强得多。它能让后续审查者知道 Agent 自己声称做过什么、打算让人检查什么。

但严格说来，**这仍然主要是 Agent 的自述**。报告里写「测试通过」与测试进程确实以 0 退出，是两件事；报告里写一个文件路径，与该文件真实存在、可下载并满足任务约束，也是两件事。

与此同时，Taskboard 还会从 Git 侧收集另一类事实：执行所用的基线、HEAD、提交记录、变更统计、脏文件及可展示的 Diff。这些数据由宿主经 Git 命令读取，能够与 Agent 自述形成交叉核对。对应数据模型在 [ExecutionRecord](https://github.com/cloader/dsh-taskboard/blob/4b2a543/src/shared/protocol.ts)，采集流程在 [execution.ts](https://github.com/cloader/dsh-taskboard/blob/4b2a543/src/host/execution.ts)。

这正是我们应该坚持的分界：

| 材料 | 应如何解释 |
| --- | --- |
| Agent 说「我修改了五个文件」 | 自述，需要核对 |
| Host 采集到 Git Diff 和提交 SHA | 本地可观察事实，但不能自动证明需求正确 |
| Agent 写「测试全部通过」 | 自述，不等于 CI 或测试进程证明 |
| 指定 SHA 的 CI Check 通过 | 可核对的外部检查结果，仍不等于真实部署成功 |
| Reviewer 说「无阻断问题」 | 审查判断，不是用户验收 |
| 用户明确确认需求满足 | 接受决策，不应倒写成所有技术测试都发生过 |

一张可信的交付卡不应该把这些材料混成一个「完成度 96%」。它应该允许读者沿着每条判断回到原始来源，并清楚看到哪些仍然未知。

## 五、Worktree 能隔离施工，但隔离失败时会发生什么

Taskboard 支持为任务创建 Git Worktree。对多个并列仓库组成的 Workspace，它还尝试建立结构相应的多仓库镜像，在本次任务分支上进行施工，验收时由用户决定是否合并。

实现细节值得注意：Worktree 的分支名包含任务 ID，续跑时要确认现有 Worktree 确实属于该任务分支；结构性 Git 操作按仓库串行，以免两个执行同时竞争 Git 索引锁。清理前会检查尚未提交的变化，避免无声丢失用户成果。

但有一条边界不能被「隔离」这个词误导。源码里的 [isolation.ts](https://github.com/cloader/dsh-taskboard/blob/4b2a543/src/host/isolation.ts) 与 [git.ts](https://github.com/cloader/dsh-taskboard/blob/4b2a543/src/host/git.ts) 遇到部分 Git 异常时可以降级到原目录执行，并在记录中说明原因。README 也明确指出：**Worktree 是代码协作隔离，不是操作系统安全沙箱。**

默认不启用 Worktree 与「失败后退回原目录」都是可理解的产品选择，却意味着审查时绝不能只根据任务卡上选择了 Worktree，就断言实际执行期间完全隔离了代码和文件系统。

这会给 Mira Proof 一个很明确的字段：声明的隔离模式，与实际生效的隔离模式，应当分别记录。任何降级都要可见。

## 六、定时执行需要的是持久队列，而不是一个闹钟

[Scheduler](https://github.com/cloader/dsh-taskboard/blob/4b2a543/src/host/scheduler.ts) 的职责也不止到点触发。

它把原本应执行的时间窗口持久化为 queuedRunAt/queuedAt，并区分已经进入派发阶段的 dispatchingRunAt。Host 重启后，已排队但未执行的窗口可以重新进入队列；真正离线错过、从未入队的窗口才需要按 missed policy 处理。调度还受全局并发容量和派发间隔约束。

周期任务有两种有趣的收尾政策：rearm 让同一张卡重新回到待办；spawn 将本轮执行保留为待验收，再为下一轮创建新卡。

后者尤其值得我们研究。定时工作如果反复更新同一个「最新结果」，用户很容易失去上一轮究竟交了什么、哪次失败、哪次已验收的历史。**每次运行都应该拥有自己的 Run ID、窗口、结果和证据**，它们不能被下一轮自动覆盖。

## 七、Mira Proof 不应该重新做一张看板

读完 Taskboard，我们反而更确定不应该照它做一个 Mira Taskboard。

Taskboard 已经很好地覆盖了任务台账、状态迁移、执行、重试、Worktree、定时和人工收卡。我们没有理由把这些功能换一套皮肤重做。

**Mira Proof 的问题更窄，也更难：一项交付声明究竟被哪些独立事实支持？**

设想它最初只接入一个 GitHub PR。使用者输入仓库和 PR 编号，Proof 去核实当前 Head SHA、关联的检查运行、Review 状态、合并状态，并明确标出部署和人工验收是否有可验证记录。所有证据都必须带来源、对象版本和核验时间。

可以把它看成四层：

~~~text
Claim：声称交付了什么
  ↓
Evidence：什么系统实际观察到了什么
  ↓
Gap：哪些验收条件仍缺来源或版本不匹配
  ↓
Decision：谁基于哪些证据做了什么决定
~~~

一项证据至少应区分：**OBSERVED**（已直接核查）、**REPORTED**（有人或 Agent 声称）、**UNVERIFIED**（尚未验证）、**STALE**（所指版本已经变化）、**CONTRADICTED**（现有证据相互冲突）。

例如，某次 CI 的绿色结果只属于那次 Head SHA；PR 推进到新提交后，旧绿色不能被悄悄继承。Reviewer 的评论也应绑定它审查的代码版本。生产环境没有部署凭证时，就写「未验证」，不要凭想象补绿。

这是我们正在讨论的 **Mira Proof 产品设想**，不是已经发布的 Mira 插件。v0.1 可以只提供只读采集和一张有来源的 Proof Card，不自动合并 PR、不自动批准 Review，也不把模型的自然语言评语伪装成确定性 Gate。

## 八、做 Agent 工程，必须区分「它能做」与「我们验证过」

这次我们确认 Taskboard 0.9.6 安装、Host 加载和任务看板 UI 正常运行，原有 DSH 插件没有被替换。我们还克隆了稳定分支源码，重点审阅状态机、工具执行、Git、事务台账、定时队列与面板注册。

**但没有真实跑一张 Agent 施工卡，没有构造冲突 Worktree，也没有复现断电后的恢复，更没有把禅道或 TAPD 接入生产。** 这些能力的源码设计和 README 描述可以作为研究材料，却不能写成已经在我们环境里完成的测试。

这份克制，恰好也是 Mira Proof 应当坚持的产品态度。

同一天我们还读了 [dsh-im 的会话与授权设计](./dsh-im-message-to-agent-authority)。它从 IM 入口追问「谁有权让桌面 Agent 执行」，Taskboard 从执行现场追问「谁有权认领与收卡」；Mira Proof 要接着问的，是第三个问题：

**当所有人都说已经交付时，系统手里到底有什么证据？**

一个 Agent 可以很能干，也可以很自信。但能干和可信，不应该是同一个布尔值。真正值得交给用户的，不是一张自动变绿的看板，而是一个能够诚实说出「已验证什么、还不知道什么」的工程系统。
