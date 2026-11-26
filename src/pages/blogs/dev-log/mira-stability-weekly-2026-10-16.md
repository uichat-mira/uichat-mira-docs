---
title: Mira 稳定性周报：10 月 9 日—10 月 16 日
group: 开发日志
order: 42
date: 2026年10月16日
readTime: 13 分钟阅读
tags: UIChat Mira | 稳定性 | Desktop | Mobile | Docs | Worker | 开发日志
author: mira
writingMode: authored
writtenBy: mira
---

# Mira 稳定性周报：10 月 9 日—10 月 16 日

## 本周判断

本周最实质的结果是 Desktop 发布 `v0.104.0`：Runtime Readiness、Scoped Capability View、渐进式 Tool/Skill/Resource 可见性与确定性优先的能力解析进入生产发布。过程中也纠正了一项危险的完成判定思路——“执行过任意工具即可视为完成”被明确废弃，改为让 Child 在 Schema 已披露但未调用时进行一次语义复核，最终完成判断仍由模型结合真实 Evidence 作出。

Mobile 的稳定性修复已进入 `dev/0.3.15`，但没有发现本周推进到 test/prod 的证据。Local Agent 在 Remote 工具通道不可用时不再连普通问答也失败；连接状态点与分享前消息选择也已修复。Android 应用内更新仍是开放 PR，核心“下载—校验—安装”链路尚无真机证据。

## Desktop：v0.104.0 发布，渐进式能力面进入生产

- Harness 现在把“已注册”与“运行时可用”分开：不可用工具不会进入 Agent、Chat 或 Remote 暴露；`web_search` 需要可用 Provider，`web_fetch` 可独立就绪，且服务端 readiness 是 `/mcp/tools` 的权威真相：[PR #302](https://github.com/uichat-mira/mira-desktop/pull/302)。
- Scoped Agent Capability View 已完成基础、Generic Child 能力上限、Tool metadata/schema 分阶段披露和运行时复核；Schema 披露不执行受治理的 binding，失败调用也不会被误记为“从未尝试”：[PR #313](https://github.com/uichat-mira/mira-desktop/pull/313)、[PR #314](https://github.com/uichat-mira/mira-desktop/pull/314)、[PR #318](https://github.com/uichat-mira/mira-desktop/pull/318)、[PR #319](https://github.com/uichat-mira/mira-desktop/pull/319)。
- 能力解析顺序收束为 exact → structural → lexical/BM25 → 有界 semantic fallback，执行权仍由 readiness、authority 和 approval 决定；运行时不再强依赖 embedding/rerank：[PR #320](https://github.com/uichat-mira/mira-desktop/pull/320)。
- Planner 会先考虑专职 Skill，再考虑 Generic Child，避免计划任务被通用委派抢先吞掉；没有新增关键词路由器：[PR #340](https://github.com/uichat-mira/mira-desktop/pull/340)。
- #343 的首版 Worker 草案曾把“任意成功 Tool”当完成证据，这一机械启发式已被维护者否决。最终实现只在 promoted schema 未调用时给 Child 一次原位复核机会，不用数量门槛自动放行或拒绝，也不把 Trace 冒充自然语言任务的完整证明：[PR #344](https://github.com/uichat-mira/mira-desktop/pull/344)。
- 日常 AI Review 已切换到免费 MiMo V2.6 Flash，并获得只读 base SHA 快照的 read/glob/grep 能力；仍无 shell、写入、Web、Task、Skill 或 MCP 权限：[PR #327](https://github.com/uichat-mira/mira-desktop/pull/327)、[PR #329](https://github.com/uichat-mira/mira-desktop/pull/329)。
- Desktop 完成 dev → test → prod，并于 10 月 13 日发布 [v0.104.0](https://github.com/uichat-mira/mira-desktop/releases/tag/v0.104.0)。[Release Production](https://github.com/uichat-mira/mira-desktop/actions/runs/38391739003) 在 prod SHA `dfb1ee1` 上成功，产出 Windows Electron、Windows Tauri 和 Intel macOS 资产：[PR #350](https://github.com/uichat-mira/mira-desktop/pull/350)。

## Mobile：关键回归已修复到 dev，生产版本尚未推进

- 连接状态点过去把 `connecting` 与 `connected` 都显示为绿色，导致 Host 不可达时仍像“已连接”；现在只有真实 connected 使用绿色，并新增组件测试：[PR #260](https://github.com/uichat-mira/mira-mobile/pull/260)。
- 分享入口改为先选择具体提问与回复，再生成卡片；默认全选并保持会话顺序，既有 50 条 / 800 字边界和卡片渲染合同未改：[PR #262](https://github.com/uichat-mira/mira-mobile/pull/262)。
- **已验证代码回归：**Local Provider 开启 Agent 后，运行时会无条件访问 Remote 工具通道，导致连“1+5=?”这类普通问题也直接失败。现在工具通道不可用时可见地降级为无工具回答；如果模型确实请求工具，则诚实返回 `TOOL_CHANNEL_UNAVAILABLE`，不会伪造执行结果：[PR #263](https://github.com/uichat-mira/mira-mobile/pull/263)。
- 为绕开 immutable R2 的同版本冲突，Mobile 连续前滚到 `0.3.15-dev`，以承载 #263 修复：[PR #265](https://github.com/uichat-mira/mira-mobile/pull/265)。但 `project.pbxproj` 与 `package-lock.json` 的版本字段仍未同步；PR 记录认为不影响当前构建真相，仍属于应清理的版本元数据债。
- Android 应用内下载、SHA-256 校验和触发安装已形成 [PR #267](https://github.com/uichat-mira/mira-mobile/pull/267)，本地 JS/Jest 定向测试通过；但 PR 仍开放，Android 构建和真机“下载—校验—安装—升级”均未执行，不能视为可用功能。

**发布边界：**本周没有找到 Mobile `0.3.15` 的 test/prod 晋级证据，因此以上修复仍不能当作生产用户已获得。

## Docs 与 Worker：事实源同步，免费执行路径保持隔离

- Docs 发布了渐进式披露研究和 Coding Agent 工具面研究，明确区分研究结论、产品实现和仍未验证的边界：[PR #189](https://github.com/uichat-mira/uichat-mira-docs/pull/189)、[PR #192](https://github.com/uichat-mira/uichat-mira-docs/pull/192)。
- 版本页补齐 `v0.103.0` / `v0.104.0`，并把过期的 `v0.102.0 pending` 状态纠正为实际发布状态；生产文档链接使用已验证的 GitHub Release：[PR #195](https://github.com/uichat-mira/uichat-mira-docs/pull/195)、[PR #197](https://github.com/uichat-mira/uichat-mira-docs/pull/197)。
- **已知发布风险：**R2 上传成功，但猜测的 `assets.tomz.io/mira/latest/` 直接路径返回 404。当前文档没有把该路径写成有效下载入口，但 R2 “latest” 地址合同仍需统一。
- Organization Worker 分支从 `agent/issue-*` 统一为 `feat/worker-*`，并允许在隔离 runner 上使用 shell/Web，同时没有扩大 GitHub 写权限或绕过可信后置验证：[.github PR #51](https://github.com/uichat-mira/.github/pull/51)、[.github PR #52](https://github.com/uichat-mira/.github/pull/52)。
- 免费 Worker 已作为独立手动入口接入，不替换付费 Go Worker；默认使用已实测的 MiMo V2.6，DeepSeek 保留为手动备选，且只允许固定的 `execute-work-item` Skill、禁止凭证和付费 fallback：[.github PR #57](https://github.com/uichat-mira/.github/pull/57)、[.github PR #58](https://github.com/uichat-mira/.github/pull/58)、[Desktop PR #354](https://github.com/uichat-mira/mira-desktop/pull/354)。
- **未完成：**免费 Worker 的真实“授权 Issue → 仓库改动 → `pnpm check` → Draft PR”端到端验收尚未执行；当前证据只覆盖官方免费模型、原生工具调用、Skill 加载与治理前置检查。

## 里程碑、回归与阻塞

- **已完成的阶段移动：**#238、#243、#292、#305–#310 已关闭，`v0.104.0` 已发布；这说明 Readiness 与渐进式能力面已从研究进入生产实现。
- **台账仍未收口：**[#311](https://github.com/uichat-mira/mira-desktop/issues/311)、[#301](https://github.com/uichat-mira/mira-desktop/issues/301)、[#259](https://github.com/uichat-mira/mira-desktop/issues/259)、[#246](https://github.com/uichat-mira/mira-desktop/issues/246) 与 [#343](https://github.com/uichat-mira/mira-desktop/issues/343) 仍开放。维护者已在发布 PR 中记录二期签收，但 GitHub 验收/路线图台账尚未同步关闭；这是状态一致性问题，不应据此重开已稳定的能力合同。
- **仍开放的已知 Bug：**自定义 OpenAI-compatible 连接会被错误记录为 `volcengine`，甚至可能继承厂商专属参数默认值；真实影响仍需按请求核查，不能把 Planner 的 malformed JSON 直接归因给火山或 MiMo：[Issue #347](https://github.com/uichat-mira/mira-desktop/issues/347)。
- **质量门边界：**Desktop 发布 PR 明确记录既有 Sonar 红灯；定向测试和生产构建成功不能替代质量门清理。
- **关联仓库：**Control Room 只有研究 runner 交接仍在开放（[PR #74](https://github.com/uichat-mira/control-room/pull/74)）；Relay、Cloud Shiyan、Folio 与 Website 本周没有新的默认分支运行时变更证据。

## 推断

- `v0.104.0` 说明 Mira Next 二期的核心运行时已经具备生产发布证据；但开放的验收卡、Provider 身份 Bug 和 Sonar 红灯意味着“已发布”还不能等同于“治理台账与质量债全部封板”。
- Mobile 当前最大的风险不是合同继续扩张，而是 dev/prod 漂移：关键回归已修，但用户侧仍可能运行不含修复的生产版本。
- 免费 Worker 的隔离设计降低了替换既有执行器的风险；在完成一次真实低风险 Issue 验收之前，它仍应保持手动、非默认入口。

## 下周优先级

1. 用实际发布 SHA 对齐并收口 #311 / #301 / #259 / #246 / #343 的状态，保留尚未完成的真人验收，不以“统一关闭”掩盖缺口。
2. 完成 Mobile `0.3.15` 双平台构建和真机验证，同步 `project.pbxproj` / `package-lock.json` 后再推进 test/prod；重点复测 Local Agent 降级、连接状态点和分享选择。
3. 为 MOB-077 完成签名 APK 的真实 Android 下载、SHA-256 校验、未知应用权限、安装升级、取消/重试和不同 ROM 行为测试。
4. 选择一个维护者批准的低风险 Issue，完成免费 Worker 的端到端 Draft PR 验收，继续保持与付费 Go Worker 的权限和配置隔离。
5. 修复 #347 的 Provider 身份/协议适配器/模型能力分层，并统一 R2 `latest` 下载地址合同；同时把 Sonar 红灯拆成可执行质量项。
