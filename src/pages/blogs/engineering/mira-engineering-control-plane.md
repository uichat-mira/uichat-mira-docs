---
title: Mira Engineering Control Plane：从 Issue 派工到证据回流
description: 把 Mira 当前的台账、Agent、Git、PR、测试、CI、Review、发布与组织治理整理成一套可落地的工程控制平面，并明确哪些已经运行、哪些仍是下一阶段协议。
group: 工程现场
order: 31
date: 2026年9月9日
readTime: 27 分钟阅读
tags: GitHub | Agent | Engineering Control Plane | CI | Review | Evidence | Organization
author: tomz | mira
writingMode: co-authored
writtenBy: tomz | mira
reviewedBy: tomz
---

# Mira Engineering Control Plane：从 Issue 派工到证据回流

产品层为什么要做这件事，我单独写在 Tomz.io：

[《OPC 探索（五）：给一人公司搭一套 AI 工程系统》](https://tomz.io/blogs/shared-thinking/opc-ai-engineering-control-plane)。

那篇讨论一个人加多个 Agent 以后，为什么也会产生任务、权限、验证、迁移和组织治理问题。这篇不再重复“为什么”，直接讨论**这套工程系统怎么设计，以及 Mira 现在已经走到哪里**。

先把边界说清楚：本文不是把一份未来架构写成“当前已完成”。Mira 从六月底开始已经实际使用任务台账驱动 AI 施工，Desktop 与 Mobile 也已经有真实的任务卡、Review、CI、Release 和部署链；2026 年 9 月，我们又开始把这些分散能力向 GitHub Organization uichat-mira 收拢。但 Organization 迁移尚未全部完成，共享 CI、统一 Ruleset、移动看板、企微投影等仍有一部分是下一阶段设计。

这篇要做的，是把“当前事实”和“目标合同”放在同一张图上，同时把两者分开。

## 一、系统目标：不是做一个项目管理软件

Mira 的问题不是缺一个更漂亮的 Kanban。

真正的问题是：同一个工程任务会经过人、不同 Agent、Git、PR、CI、真机验证、Release 和外部部署。每个环节都可能产生自己的状态，如果没有明确的真相源和交接协议，系统很快会出现几份彼此都“差不多正确”的现实。

因此这套 Engineering Control Plane 的第一原则不是 UI，而是事实边界：

~~~text
Work Item / Issue
负责：为什么做、要做到什么、当前处于哪个生命周期阶段

Repository / Git
负责：代码当前实际上是什么

PR / Test / CI / Review / Release
负责：我们有什么证据证明这次改变成立

Project / Mobile Board / WeCom / Website
负责：把上面的事实重新组织给不同读者看
~~~

这也是 GitHub 官方对 Projects 一直强调 single source of truth 的原因。Project 应该尽量使用 GitHub 已有数据，而不是再维护一份平行状态。[GitHub Projects Best Practices](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/best-practices-for-projects)对这一点有明确说明；Organization Issue Fields 则把跨仓库的结构化字段直接放回 Issue 本身。[GitHub Organization Issue Fields](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/managing-issue-fields-in-your-organization)进一步减少了 Project 自己持有一份状态的必要。

因此，本文后面出现的所有 Board、Calendar 和 WeCom 消息，都只被视为 Read Model / Projection，不是新的任务数据库。

## 二、总体架构：控制平面、执行平面、证据平面、投影层

当前目标可以先画成四层：

~~~text
                         Human / Product Owner
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────┐
│                    Control Plane                         │
│ GitHub Issues · Issue Fields · Project · Rules · Policy │
└───────────────────────────┬──────────────────────────────┘
                            │ Work Assignment Contract
                            ▼
┌──────────────────────────────────────────────────────────┐
│                    Execution Plane                       │
│ Human Dev · Coding Agent · Review Agent                  │
│ Branch · Worktree · Agent Session · Tools                │
└───────────────────────────┬──────────────────────────────┘
                            │ commit / PR
                            ▼
┌──────────────────────────────────────────────────────────┐
│                     Evidence Plane                       │
│ Test · CI · Review · Human Check · Release · Deployment  │
└───────────────────────────┬──────────────────────────────┘
                            │ state / evidence feedback
                            ▼
                      Control Plane
                            │
          ┌─────────────────┼──────────────────┐
          ▼                 ▼                  ▼
   GitHub Project       Internal View      Public View
 Ledger / Work Board   Mobile / WeCom    mira.tomz.io
~~~

这里“Control Plane”不是说 GitHub 能够自动决定产品方向。它只负责保存稳定工程对象和治理规则。产品决策仍然在人，具体施工可以由人或 Agent 完成，验证则尽量落到可重复的机器证据上。

这样设计的好处是，Agent 可以随时替换。今天用 Codex，明天用另一个 coding agent，任务合同、PR、CI 和 Release 不需要因此重新设计。

## 三、Work Item Contract：Issue 是派工合同，不是施工日记

从六月底开始，我们在 Mira Desktop 内部逐渐建立任务卡和总台账，后来 Mobile 也形成了自己的 work-ledger.md 与 task-cards。这样做帮助 Agent 跨会话接力，但也暴露了一个问题：如果每个项目自己发明一套任务语言，跨仓库以后仍然会重新失去统一上下文。

Organization 之后，目标是把一个可执行工作项的最低合同收敛成类似下面的结构：

~~~ts
type WorkItemContract = {
  id: string
  repository: string

  goal: string
  acceptance: AcceptanceCriterion[]
  constraints?: string[]
  dependencies?: string[]

  stage: Stage
  targetDate?: string
  effort?: "Small" | "Medium" | "Large"

  linkedPullRequests?: string[]
  parentIssue?: string
}
~~~

这不是说 GitHub Issue 正文必须序列化成 TypeScript。上面的类型只是解释**哪些信息属于稳定任务合同**。

其中最重要的是 goal 和 acceptance。一个 Agent 如果只知道“优化配对”，就必须自己补大量业务假设；如果任务明确“扫码后 Desktop 应接受 Mobile 当前 payload，旧配对协议不得回归，并完成指定真机 smoke”，Agent 就有了可以回到代码和测试中核实的边界。

反过来，以下内容通常不应该进入正式 Work Item：

~~~text
刚找到 parser 在哪个文件
准备先 grep 一下
第 3 条命令失败
怀疑是缓存
下一步试另一个函数
~~~

这些属于 Agent Session 或人的施工计划。它们可以短暂存在，也可以丢失；真正需要长期保留的结论最后回到 PR、Issue、Docs 或 ADR。

GitHub 原生也在强化这种 Work Item → Git 工作流。Issue 可以创建关联 branch，PR 会自动进入 Issue Development 区；Coding Agents 可以直接从 Issue 接单并提交 PR。[Creating a branch for an issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-a-branch-for-an-issue)和[第三方 Coding Agents](https://docs.github.com/en/copilot/concepts/agents/about-third-party-coding-agents)分别覆盖了这两层。

## 四、生命周期状态：Stage 只描述工程阶段

uichat-mira 当前已经建立统一的 Stage：

~~~text
Backlog
Ready
In Progress
Blocked
Verification
Ready to Ship
Done
~~~

对应的基本语义是：

~~~ts
type Stage =
  | "Backlog"       // 已记录，但还不具备近期施工条件
  | "Ready"         // 范围和验收足够清楚，可以开工
  | "In Progress"   // 正在施工
  | "Blocked"       // 当前无法继续
  | "Verification"  // 实现基本完成，正在验证
  | "Ready to Ship" // 验证通过，等待 merge / release / rollout
  | "Done"          // 真实交付已经完成
~~~

这里有意保留 Verification 和 Ready to Ship 两层。

原因很现实。代码“写完”以后，Mira 还有 AI Review、CI、平台测试、真机 smoke、Release 和外部部署。把所有这些状态压成 In Progress → Done，看板会很简洁，但 Done 会逐渐失去含义。

状态转换也不应该完全由 Agent 自己宣告。例如：

~~~text
Ready
  │
  ├─ human / orchestrator starts
  ▼
In Progress
  │
  ├─ implementation + local checks complete
  ▼
Verification
  │
  ├─ required checks / review / human validation pass
  ▼
Ready to Ship
  │
  ├─ merge / release / deployment evidence exists
  ▼
Done
~~~

失败路径则可以进入 Blocked，或者从 Verification 回到 In Progress。

当前 Blocked 仍然作为一个 Stage 使用。理论上它也可以被设计成与生命周期正交的 flag，因为“Verification 中被阻塞”在语义上也成立；但在真实使用证明这种需求频繁出现以前，没有必要为了模型更漂亮再增加一个字段。

## 五、复杂任务不能一开始就假装已经拆对

Issue 很适合承载拆解后的工作单元，但不适合假装第一次拆解一定正确。

一个较大目标进来时，应该允许先存在为 Parent Issue、Project 或 Discovery Work Item：

~~~text
Product Goal
    ↓
Parent Issue
    ↓
Reconnaissance / Spike
    ↓
读真实代码、依赖、部署与历史
    ↓
形成可独立验收的 Sub-issues
~~~

判断是否值得拆成独立 Issue，可以使用几个简单标准：

~~~text
能否独立验收？
能否独立 Review？
是否拥有清楚的失败边界？
最好能否独立合并或回滚？
~~~

而“找到函数、修改 if、补一个测试、跑一次命令”通常只是施工步骤，不需要变成四张 Issue。

这条规则对 Agent 特别重要，因为模型很容易在缺少工程事实时给出一份结构漂亮的任务树。任务树写得越完整，人越容易产生它已经经过验证的错觉。

因此开工前需要一个 repo-grounded revalidation：

~~~text
Issue contract
      +
current repository
      +
related PR / commit / docs
      +
CI / deployment state
      ↓
原拆解是否仍成立？
~~~

如果不成立，先改拆解，再施工。台账是入口，不是历史命令。

## 六、Execution Contract：Agent 拿到的是任务，不是整个王国

一个 Coding Agent 接到 Work Item 后，执行层至少要知道四件事：目标与验收、当前可信代码版本、可以使用的工具和权限、结果要交到哪里。

最小执行上下文可以表达成：

~~~ts
type ExecutionContext = {
  workItem: string
  baseRef: string
  branch: string

  repository: string
  allowedTools: string[]
  policyProfile: string

  sessionId?: string
  budget?: {
    tokens?: number
    wallTimeMinutes?: number
  }
}
~~~

在本地，branch 或 worktree 是施工空间；在 cloud coding agent 中，则可能是平台提供的隔离环境。两者的共同点是：施工状态不应该通过修改 Work Item 正文来保存。

Branch 最好能和 Issue 建立稳定关联，例如 fix/123-mobile-pairing；PR 再通过 Closes #123 或 GitHub Development linkage，把施工结果重新交回 Work Item。

这里还有一个我们在 Mira Agent 自身设计中长期坚持的原则：**看见工具不等于拥有执行权**。Agent 能调用什么，应该由 Harness / Policy / Approval / Runtime availability 决定，而不是因为 system prompt 写了“你可以做任何事情”。Mira 当前 Agent 对工具、Approval 和 Evidence 的边界另见[《Mira Agent 现在到底是什么》](/blogs/engineering/mira-agent-current-truth)与[Harness 与工具边界](/docs/architecture/harness)。

工程控制平面里的 Coding Agent 也应该采用同一类思路：任务上下文和工具权限分别治理。

## 七、PR Contract：PR 是施工后的交接面

如果 Issue 是派工合同，PR 就是交付合同。

一个合格的 PR 不应该只说“done”。它至少需要把实现与验证重新挂回任务：

~~~ts
type PullRequestContract = {
  workItem: string
  headSha: string
  baseRef: string

  changeSummary: string[]
  validation: ValidationClaim[]
  knownGaps?: string[]

  closes?: string[]
}
~~~

其中 headSha 很重要。

因为 AI Review 特别容易产生“旧结论继续漂浮”的问题：Reviewer 看的是 SHA A，Builder 又 push 了 SHA B，但评论里仍然写着 NO_BLOCKING_FINDINGS。如果系统只判断“这个 PR 曾经被 Review 过”，就会把旧证据当成新证据。

Mira Mobile 现有的 AI Code Review Loop 已经实际采用 Head SHA freshness check。工程细节见[《把 AI Code Review 接成一个真正的 Agent Loop》](/blogs/engineering/opencode-go-pr-review-agent-loop)。

因此后续所有 Evidence 都应该尽可能绑定明确版本。

## 八、Evidence Bundle：完成不是一句话，而是一组可追溯证据

一个 Work Item 从 Verification 进入 Ready to Ship，理想上不应该依赖某个 Agent 的自然语言总结。

可以把交付证据抽象成：

~~~ts
type DeliveryEvidence = {
  issue: string
  repository: string
  headSha: string
  pullRequest: string

  tests: TestEvidence[]
  checks: CheckEvidence[]
  review: ReviewEvidence[]

  humanValidation?: HumanValidationEvidence[]
  release?: ReleaseEvidence
  deployment?: DeploymentEvidence
}
~~~

不同 Evidence 回答不同问题：Test 证明特定行为符合预期；CI 证明确定性的工程规则通过；Review 证明实现方式经过独立判断；Human / Device Validation 证明机器覆盖不了的真实场景；Release 证明某个版本已经被生产为可交付物；Deployment 证明它确实进入目标运行环境。

这也是为什么 Done 不应该只是 Project 里一列。

Done 是某个 Work Item 已经满足相应完成合同的结果。

不同任务的 Evidence 要求可以不同。文档修改不需要 Android 真机；配对协议变更可能必须有 Desktop + Mobile 联调；Cloudflare Worker 迁移则必须验证真实部署、Route、绑定和回滚。

因此更适合的模型不是全组织只有一个固定 checklist，而是：

~~~text
Organization baseline
        +
Repository policy
        +
Work Item acceptance
        =
本次 Evidence Requirements
~~~

## 九、Review 权限：模型判断和流程写权限分开

Mira Mobile 已经实际跑过一版 Builder → Reviewer → Local Handoff 的 AI Code Review Loop，这里有几条可以直接提升到组织级原则。

第一，Reviewer 可以读和判断，但不因为需要发表评论就自动获得一整套 GitHub 写权限。

现有 Mobile 设计把流程拆成：

~~~text
Reviewer
- 模型
- 读可信规则、任务与代码
- 输出结构化 findings / verdict
- 不承担 GitHub 业务写入

Publisher
- 无模型
- 校验 Review artifact
- 发布 / 更新 marked comment

Gatekeeper
- 无模型
- 校验确定性条件
- 满足规则后执行有限状态写入
~~~

其中 Reviewer → Publisher → Local Handoff 已经是真实运行过的链路；确定性 Gatekeeper 是继续演化的方向，不能把它写成当前所有仓库都已经完成的能力。

第二，Review 必须绑定 Head SHA。

第三，Reviewer 的规则应该来自可信 base，而不是让待审 PR 自己定义如何审查自己。Mobile 甚至进一步把 PR snapshot 中可影响 Agent 启动的配置清掉，再注入可信 base 的 AGENTS.md 和 Review Skill。

这些设计的共同点不是“AI Review 很复杂”，而是：

> **判断权、写权限和版本边界必须能够分别解释。**

GitHub 自己的 branch protection / rulesets 也提供了类似的机器门禁能力，包括 required approvals、required status checks 和 Code Owners Review。[About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)与[Organization rulesets](https://docs.github.com/en/organizations/managing-organization-settings/creating-rulesets-for-repositories-in-your-organization)可以作为组织层的确定性基础。

## 十、测试与 CI：共享的是门禁语义，不是复制一份 YAML

Organization 化以后，很容易走到另一个极端：做一份“万能 CI”要求所有仓库照抄。

这同样没有必要。

Desktop、Mobile、Docs、Relay 的技术栈和风险面不同，共享的应该是最小质量合同和可复用能力：

~~~text
Organization baseline
├─ lint / formatting policy
├─ typecheck policy
├─ dependency / security baseline
├─ artifact naming
├─ CI evidence schema
└─ release gate semantics

Repository workflow
├─ Desktop build
├─ Mobile Android / iOS
├─ Docs static build
└─ Relay Worker validation
~~~

GitHub reusable workflows 正好适合这类“共享实现，不强迫所有仓库拥有相同业务 workflow”的结构。[Reusing workflow configurations](https://docs.github.com/en/actions/reference/workflows-and-actions/reusing-workflow-configurations)允许把公共步骤集中维护，由各 repo 通过 workflow_call 调用。

以后可以把真正稳定、跨项目重复的检查逐步抽到组织级 .github 或专门工程仓库；项目特有的真实构建与 smoke 继续留在项目内部。

原则仍然是：先重复，再抽象。不要为了“组织化”提前造一套没有消费者的平台。

## 十一、Release 与 Environment：代码通过，不等于现在应该上线

当前 Mira 各仓库的发布链还不统一。

Desktop 和 Mobile 已经有 GitHub Release、R2、签名和不同分支流；Docs 有 Cloudflare Pages 与兼容 GitHub Pages；Relay 又有自己的 Worker 部署。

Organization 化以后，目标不是强行统一成一个 deployment workflow，而是统一发布合同：

~~~ts
type ReleaseEvidence = {
  version?: string
  tag?: string
  commitSha: string
  artifactUrls?: string[]
  workflowRun?: string
}

type DeploymentEvidence = {
  environment: string
  commitSha: string
  deploymentId?: string
  verifiedAt: string
  rollbackRef?: string
}
~~~

GitHub Environments 可以把 Production、Staging 等目标与 protection rules、branch policy 和 environment secrets 连接起来；保护条件满足以前，job 不能使用相应 Environment Secrets。[Deployments and environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)提供了这一层原生能力。

因此 Ready to Ship 与 Done 之间可以保持清楚：

~~~text
Verification passed
        ↓
Ready to Ship
        ↓
release / merge / deployment
        ↓
production evidence
        ↓
Done
~~~

对于不需要部署的任务，Done 条件当然可以更简单。Stage 是统一语言，不是统一流水线。

## 十二、凭据治理：Organization 不是建一把更大的万能钥匙

跨 repo 以后，Secrets、API Key、R2 credentials、签名和部署身份自然会成为组织治理的一部分。

但“共享凭据”需要严格区分：

~~~text
共享治理       ✅
共享作用域策略  ✅
共享同一把万能长期 Key  ❌
~~~

GitHub Organization Secrets 可以按 all / private / selected repositories 控制访问范围；Environment Secrets 又可以进一步受 deployment protection 约束。[GitHub Secrets](https://docs.github.com/en/actions/concepts/security/secrets)提供了这些作用域。

对于支持 OpenID Connect 的云服务，更好的方向是让 GitHub Actions 使用 federated identity 换短期凭据，而不是长期保存 cloud keys。[GitHub OIDC](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-cloud-providers)就是为这种场景设计的。

Deploy Key 也不应该被理解成组织级共享钥匙。GitHub 官方明确说明 deploy key 只访问单一 repository，并且同一 deploy key 不能重复用于多个 repo；复杂跨仓访问更适合 GitHub App。[Managing deploy keys](https://docs.github.com/en/enterprise-cloud@latest/authentication/connecting-to-github-with-ssh/managing-deploy-keys)对此有明确边界。

这次 ChatGPT Codex Connector 的 Organization 授权故障也提供了一个真实例子：GitHub App installation 本身就是权限边界。个人账户的 All repositories 不自动覆盖 Organization；Org 必须拥有自己的 installation。

所以未来 Agent 权限至少应该能回答：

~~~text
Agent 身份是什么？
能读哪些 repo？
能写哪些 repo？
能触发哪些 workflow？
能否访问某个 Environment？
哪些 MCP / tools 可见？
哪些副作用需要审批？
~~~

“它是我们的 Agent”不是权限模型。

## 十三、可观测性：不要只知道“它做完了”

当更多 Agent 开始并行施工，系统还需要一个很基础的 traceability 层。

最少应该能够重建：

~~~text
谁 / 哪个 Agent
      ↓
接了哪个 Work Item
      ↓
使用哪个 session / model
      ↓
改了哪个 branch / SHA
      ↓
调用了哪些高风险工具
      ↓
生成哪个 PR
      ↓
经过哪些 checks / reviews
      ↓
最终进入哪个 release / deployment
~~~

可以先定义一个轻量事件：

~~~ts
type EngineeringTraceEvent = {
  timestamp: string
  actor: string
  actorType: "human" | "agent" | "automation"

  repository: string
  workItem?: string
  sessionId?: string
  model?: string

  event:
    | "work_started"
    | "commit_created"
    | "pr_opened"
    | "review_completed"
    | "check_completed"
    | "release_created"
    | "deployment_completed"
    | "work_blocked"

  ref?: string
  metadata?: Record<string, unknown>
}
~~~

这不意味着 OPC 需要先部署一套大型 observability stack。

GitHub 已经提供一部分天然事件和 Audit Log。Organization audit log 可以用于追溯成员、应用和配置发生了什么变化；如果需要实时消费事件，GitHub 官方也建议使用 Webhooks，而不是高频轮询 audit log。[Reviewing the audit log](https://docs.github.com/en/organizations/keeping-your-organization-secure/managing-security-settings-for-your-organization/reviewing-the-audit-log-for-your-organization)与[Audit log events](https://docs.github.com/en/organizations/keeping-your-organization-secure/managing-security-settings-for-your-organization/audit-log-events-for-your-organization)可以覆盖这部分基础事实。

Agent 自己额外产生的 model、token、tool、session 信息，再按需要补充即可。

## 十四、失败与回滚：Happy Path 不是架构

当前 Mira Organization 迁移采用“一仓一核查”，就是因为 migration failure 也必须可定位。

GitHub Repository Transfer 会迁移 Issues、PR、wiki、stars、watchers，并保持 webhooks、secrets、deploy keys 等与仓库关联，同时为原 URL 建重定向。[Transferring a repository](https://docs.github.com/en/enterprise-cloud@latest/repositories/creating-and-managing-repositories/transferring-a-repository)说明了这些 GitHub 内部行为。

但外部依赖不在 GitHub 的控制范围内。

因此每个 repo 的迁移 gate 至少应该核查：

~~~text
default branch / branch roles
rulesets / protection
Actions workflows
Secrets / Environments
Releases / Tags
webhooks
GitHub Apps / integrations
hardcoded old owner/repo URLs
Cloudflare deployment path
Worker / Pages / R2 / KV / D1 / Durable Object bindings
external services
rollback path
~~~

这里最重要的工程纪律是：

> **迁移就是迁移。**

不要把 repo transfer、99 条 branch 清理、CI 重构、Cloudflare redesign、仓库重命名一起做。

单一变化更容易验证，也更容易回滚。

我们已经在 uichat-mira/.github 建立了真实的[Mira Organization migration plan](https://github.com/uichat-mira/.github/issues/1)。Relay 作为第一个小型试点，就是为了先把 transfer、CI、Cloudflare 和权限路径跑一遍，再从实际结果提炼 SOP。

## 十五、资源与成本也是 Control Plane 的一部分

传统小团队主要关心人力和云成本，AI 工程还多了几类容易被忽略的预算：

~~~text
LLM token / subscription quota
Agent wall time
并行 session 数量
CI minutes / build resources
Artifact / R2 storage
Workers / external API
Review model cost
失败重跑成本
~~~

目前这些没有必要全部变成 GitHub Issue Fields。

但 Runtime / Orchestrator 至少应该知道自己的资源预算，并能够把异常暴露出来。例如：

~~~ts
type ExecutionBudget = {
  maxWallTimeMinutes?: number
  maxModelCostUsd?: number
  maxToolCalls?: number
  maxRetries?: number
}
~~~

预算的意义不是把 Agent 变成一个每五分钟提交工时报表的员工。

而是避免一种常见的 AI 自动化失败：任务价值只有十分钟，但系统非常认真地自主运行了三个小时。

对于 OPC，资源治理最终就是产品治理的一部分。

## 十六、Projection Layer：GitHub 保存事实，别的界面负责把它讲明白

现在 uichat-mira 已经有一个组织级 Mira Development Project，使用统一 Stage、Target date、Effort，并建立了 Ledger 和 Work Board。

这仍然只是其中一个 Read Model。

未来至少存在三种不同读者：

~~~text
工程管理者
→ GitHub Ledger / Work Board

内部日常使用
→ Mobile Board / 企业微信

外部用户
→ mira.tomz.io Development Calendar
~~~

手机界面没必要复制 GitHub 完整 Project。它可以只提供 Now、Next、Attention。

企业微信也不应该拥有自己的 task database。它适合成为触达和查询入口：今天哪些 In Progress，哪些进入 Verification，哪个 CI 挂了，有什么 Blocked，刚发布了什么。

如果以后接入 Pi Agent + WeCom MCP，企微甚至可以成为自然语言的 Control Plane 入口；但底层查询和写入仍然应该回到 GitHub / engineering services，而不是在聊天记录里创造一套新状态。

Mira 官网则更克制。它只需要公开近期正在做什么、已经完成什么、下一阶段是什么、Development Calendar 和重要 Release / Product Journal。

内部风险、Secrets、所有 branch 和完整 CI 细节没有必要公开。

因此整个 Projection 层遵循一个很简单的读写原则：

~~~text
Write model 尽量唯一
Read model 可以很多
~~~

理想的事件链是：

~~~text
Issue / PR / CI / Release event
           ↓
       normalize
           ↓
   engineering state
           ↓
┌──────────┼──────────┐
▼          ▼          ▼
Project   WeCom     Website
~~~

GitHub Webhooks 很适合做这种事件源。需要事件通知时，GitHub 官方本身也建议 Webhooks 优于反复轮询 Audit Log 或 API。[Audit log events](https://docs.github.com/en/organizations/keeping-your-organization-secure/managing-security-settings-for-your-organization/audit-log-events-for-your-organization)里明确提到了这一点。

官网开发日历也因此不应该再维护一份 calendar.yaml。更合理的方式是构建期从 GitHub 读取公开 Work Items，生成静态投影。

## 十七、Knowledge 与 Skill：从真实重复里长出来

Organization 建好以后，很容易产生一种冲动：马上写完整工程手册、Agent Handbook、迁移规范、发布 SOP，再建几十个 Skills。

我们不准备这么做。

更合适的演化顺序是：

~~~text
真实问题
   ↓
第一次解决
   ↓
再次出现
   ↓
稳定模式
   ↓
Engineering Rule
   ↓
SOP
   ↓
Skill / Automation
~~~

例如 Repository Migration Audit 现在已经开始重复出现：Relay、Desktop、Mobile、Docs 都需要核查 branch、Actions、Secrets、Cloudflare 和旧 owner 耦合。等 Relay 真正完成一次迁移以后，再把实战结果固化成 Migration SOP，比现在凭想象写一套“完美迁移流程”可靠得多。

同样，Review Skill 之所以值得保留，是因为它已经真实跑过，并且项目级规则确实能减少误报和上下文丢失。

组织级知识库的作用不是让 AI 在开工前先阅读四十页企业文化。

它应该保存那些**如果不写下来，就会稳定地再次踩坑**的东西。

## 十八、当前落地状态

截至 2026 年 9 月 9 日，可以把这套架构分成三类。

### 已经存在并真实运行

~~~text
Desktop / Mobile 的任务台账与任务卡实践
Git branch / PR / CI / Release
Mobile AI Review → Publisher → Local Handoff
Head SHA freshness check
多仓库各自真实测试与部署链
uichat-mira Organization
Organization profile
Mira Development Project
Organization Issue Fields
Stage / Target date / Effort
Ledger / Work Board
Organization GitHub App installation
Migration plan Issue
~~~

### 正在迁移 / 收敛

~~~text
个人仓库 → uichat-mira Organization
跨仓库统一 Issue / Stage 语言
迁移 SOP
Organization 级工程规范与知识入口
Secrets / deployment identity 的治理边界
~~~

### 仍然属于下一阶段设计

~~~text
组织级 reusable CI library
统一 rulesets / required checks
完整 Deterministic Gatekeeper
Agent trace / cost aggregation
Mobile Engineering Board
企业微信工程投影 / Agent 入口
mira.tomz.io Development Calendar 自动投影
更成熟的 event normalization layer
~~~

把这三类分开非常重要。

工程文档最怕的不是设计不够先进，而是计划写得太像已经上线。

## 十九、最后：控制平面要足够薄

这套系统如果继续长，很容易重新走向另一个极端：为了管理几个 Agent，我们自己造出一个小型 Jira、一个小型 Backstage、一个小型 Datadog，再加一套身份平台。

那当然也很完整。

只是产品可能已经没时间做了。

所以这套 Engineering Control Plane 最终需要长期守住几个约束：

~~~text
1. 工作事实尽量留在 GitHub 和真实运行系统
2. 不复制第二套任务数据库
3. Project 是视图，不是新的真相
4. Agent 接受任务合同，但必须重新读取真实代码
5. 判断、写权限和发布权限分层
6. Evidence 必须尽量绑定明确版本
7. 自动化只搬运可以确定的事实
8. 重复足够多以后再抽成 SOP / Skill
9. 外部界面只做 Projection
10. 控制平面本身不能成为最大的维护项目
~~~

Google 对 Platform Engineering 有一句很适合借过来：让正确的方式成为容易的方式。[Internal Developer Platform](https://cloud.google.com/discover/what-is-an-internal-developer-platform)的核心价值，本来也不是多造一个 Portal，而是降低认知和协调成本。

Mira 现在做的只是这个思想的很小版本。

我们没有平台团队，甚至仓库还没全部搬完。

但从六月底开始的“面向台账编程”走到今天，目标已经比当时清楚很多：

~~~text
Issue 留下意图
Git 留下真实修改
PR 留下交付
Test / CI 留下机器证据
Review 留下判断
Release / Deployment 留下发生过的结果
Organization 提供共同治理边界
Projection 把同一份事实交给不同的人和 Agent
~~~

这才是我们目前真正想搭起来的 Mira Engineering Control Plane。

它不需要看起来像一家大公司的内部平台。

只要下次换一个 Agent、换一个模型，甚至过半年自己重新回来时，我们仍然能回答三件事：

> **我们原本想改变什么？**

> **系统现在实际上是什么？**

> **有什么证据证明它已经完成？**
