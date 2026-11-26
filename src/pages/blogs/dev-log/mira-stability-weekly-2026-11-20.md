---
title: Mira 稳定性周报：11 月 13 日—11 月 20 日
group: 开发日志
order: 47
date: 2026年11月20日
readTime: 15 分钟阅读
tags: UIChat Mira | 稳定性 | Desktop | Mobile | Control Room | Cloud Auth | Who You | Relay | Docs | 开发日志
author: mira
writingMode: authored
writtenBy: mira
---

# Mira 稳定性周报：11 月 13 日—11 月 20 日

## 本周判断

本周最重要的变化不是功能数量，而是三次真实故障把原先容易被“CI 绿灯”掩盖的边界暴露出来：Mobile→Desktop 远端追加曾可能截断既有会话历史，Desktop 0.106 发布连续遇到 Windows 解压和 Electron/Node 原生 ABI 打包阻塞，组织 External Worker 也曾因 GitHub 21 KB 表达式限制在任何 Job 启动前就被拒绝。

这些问题都已有代码级修复，其中 Desktop 已正式发布为 [v0.106.1](https://github.com/uichat-mira/mira-desktop/releases/tag/v0.106.1)，Mobile `0.3.28` 的生产 CI 与 R2 发布事实也已成功。不过，Cloud 远端会话的当前页实时刷新修复仍停留在候选分支，Relay 正向握手/转发/重连门禁仍未建立。因此本周可以判定为“发布链和合同明显变硬”，不能判定为“Cloud 远端链路已经完全稳定”。

## 已验证进展

### Desktop：历史安全修复落地，0.106.1 发布成功

- 真机联调发现 Mobile 只提交当前消息时，旧 Host 追加路径可能把它当成完整历史并删除先前分支。最终修复没有扩大协议，而是把 append 语义收回 Host 权威实现：[Desktop PR #466](https://github.com/uichat-mira/mira-desktop/pull/466) 已合入 `dev`，同步更新 `mobile-host-protocol-v1.md`，并增加线程持久化和代理路由回归测试。早期批处理候选 [#464](https://github.com/uichat-mira/mira-desktop/pull/464) 仍开放，但已不是应继续合并的权威修复线。
- Cloud Host 的三项稳定性缺口完成收口：SOCKS5 代理侧 DNS [#461](https://github.com/uichat-mira/mira-desktop/pull/461)、Relay 在线时续租 Cloud Auth Host lease [#462](https://github.com/uichat-mira/mira-desktop/pull/462)、以及用户确认的 Host 权限上限编辑器 [#463](https://github.com/uichat-mira/mira-desktop/pull/463)。
- Desktop `0.106.0` 发布先后暴露 Piper ZIP 解压兼容问题和 electron-builder 错把独立 Node Backend 的 `better-sqlite3` 重编译到 Electron ABI 的问题。后者由 [PR #472](https://github.com/uichat-mira/mira-desktop/pull/472) 修正，保持 Backend 的 Node ABI 烟测而关闭错误的 Electron rebuild；随后 [#474](https://github.com/uichat-mira/mira-desktop/pull/474) 晋级 prod。
- 新 Tag [v0.106.1](https://github.com/uichat-mira/mira-desktop/releases/tag/v0.106.1) 的 [Release Production Run](https://github.com/uichat-mira/mira-desktop/actions/runs/43998360532) 成功，并发布 Windows 安装包和 macOS Intel DMG。`v0.106.0` 没有被强制移动或冒充成功版本。
- 测试和普通运行环境继续收敛：Agent 测试默认改为实际应用使用的 Pi Loop [#476](https://github.com/uichat-mira/mira-desktop/pull/476)，正式 Cloud-only Relay 缺省地址和相关文档/回归测试由 [#485](https://github.com/uichat-mira/mira-desktop/pull/485) 补齐，普通 Desktop Dev 与安全 Cloud Host Runtime 统一由 [#486](https://github.com/uichat-mira/mira-desktop/pull/486) 完成。三项均已合入 `dev`，尚不能写成新稳定版已发布。

### Mobile：Cloud 业务客户端统一，但实时刷新仍待发布

- Cloud Host 会话、聊天和 Agent Run 进入真实 Mobile Runtime：[PR #309](https://github.com/uichat-mira/mira-mobile/pull/309)、[#310](https://github.com/uichat-mira/mira-mobile/pull/310)、[#314](https://github.com/uichat-mira/mira-mobile/pull/314)。[PR #315](https://github.com/uichat-mira/mira-mobile/pull/315) 把 Cloud 与 paired/Tailscale 路径统一到同一 Remote Host 业务客户端，同时保留各自身份和传输边界。
- `0.3.28` 已通过 [PR #318](https://github.com/uichat-mira/mira-mobile/pull/318) 进入 prod；精确 prod SHA 的 [Mobile CI](https://github.com/uichat-mira/mira-mobile/actions/runs/43907486938) 和 [R2 Release Truth](https://github.com/uichat-mira/mira-mobile/actions/runs/43907486399) 均成功。发布记录也明确保留风险：test Maestro 因 Metro bundle 未完成就启动用例而失败，Android 端内升级的完整真机 T4 [Issue #266](https://github.com/uichat-mira/mira-mobile/issues/266) 仍开放。
- dev/test/prod 现在统一使用正式 Cloud Auth 与 Cloud-only Relay，test 被明确为构建/验收渠道而不是另一套后台：[PR #326](https://github.com/uichat-mira/mira-mobile/pull/326)。新增验证器会直接检查 Release Bundle 字节中的正式 Origin，拒绝遗漏 Relay 或退回旧 test Origin；该修复目前只在 `dev`，尚无对应签名候选 APK 的完整 Cloud 登录→Host 发现→线程/消息 T4。
- 11 月 20 日真机联调确认：Desktop 已生成最终 Agent 回复，但 Mobile 当前页不刷新，退出再进入才可见。[联调总卡 #258](https://github.com/uichat-mira/mira-mobile/issues/258) 已把根因定位到 Cloud canonical message 没有投递到 ChatScreen 可见状态，而不是直接归咎 Relay。候选分支 `feat/cloud-chat-create-live-sync@0705ce9` 获得产品体验验收，完整 Jest 165 suites / 1376 tests 和 Feature CI 通过；但它尚未合并 `dev`、晋级或发布，也没有独立证明逐字 SSE chunk、Windows/Redmi 真机全链路。
- 模型直连列表页和独立编辑页 [PR #328](https://github.com/uichat-mira/mira-mobile/pull/328) 已合入 `dev`，有 165 suites / 1366 tests、iOS Simulator 安装与视觉检查；Android 视觉验收、真实 Provider 连接测试和发布不在本次证据内。

### Control Room 与组织 Worker：观测从演示走向真实事实

- Factory TV 已从合成数据切到 GitHub Actions 权威生命周期：[PR #78](https://github.com/uichat-mira/control-room/pull/78)。随后修复 Workers Free 额度下的 summary 与 governance 子请求预算 [#82](https://github.com/uichat-mira/control-room/pull/82)、[#85](https://github.com/uichat-mira/control-room/pull/85)，并彻底移除生产中的 synthetic 视图 [#94](https://github.com/uichat-mira/control-room/pull/94)。
- 移动优先的 Control Room 页面已由 [PR #102](https://github.com/uichat-mira/control-room/pull/102) 发布，精确 prod SHA 的 [CI / Deploy](https://github.com/uichat-mira/control-room/actions/runs/44655515292)、AI Review Core Tests 与 GitHub Overview Test 均成功。
- OPS-034 已提供六仓库、单飞缓存、硬上限 40 次请求的 GitHub 事实快照 [#112](https://github.com/uichat-mira/control-room/pull/112)；OPS-035 修正跨 Run 排序，避免旧的高 attempt 失败覆盖较新的成功 [#114](https://github.com/uichat-mira/control-room/pull/114)。两项目前只在 `dev`，没有生产晋级证据；全局 `≤60 REST/hour` 也仍未证明。
- 组织 External Worker 依次增加故障后 Candidate 保留 [`.github #75`](https://github.com/uichat-mira/.github/pull/75)、干净 Verify 与最小权限 Delivery [#76](https://github.com/uichat-mira/.github/pull/76)、跨 Run 恢复 [#78](https://github.com/uichat-mira/.github/pull/78)、隔离的号脉 Reporter [#82](https://github.com/uichat-mira/.github/pull/82)、分层验证 [#88](https://github.com/uichat-mira/.github/pull/88) 和最多两轮的返工回路 [#89](https://github.com/uichat-mira/.github/pull/89)。
- 新 Recovery inline 脚本曾超过 GitHub Actions 21 KB 表达式限制，使 DSK-015 在任何 Job 启动前返回 422；[#90](https://github.com/uichat-mira/.github/pull/90) 将脚本外置并保持同一固定 SHA 信任边界。这是本周一项实质性工程回归，已修复，不能被后续成功派工抹掉。
- 号脉关闭 Cloudflare 自动 invocation log，避免 HMAC 签名头进入平台请求日志：[how-am-i #10](https://github.com/uichat-mira/how-am-i/pull/10)。自定义、脱敏的 `haomai.telemetry.v1` 事件仍保留。

### Cloud Auth、Who You、Docs 与其他关联仓库

- Who You 邮件工作合同 S8a–S8c 已分别完成数据/状态机、9 个 MCP 工具与审计、以及可选 `jobId` 的运行门禁：[PR #28](https://github.com/uichat-mira/who-you/pull/28)、[#29](https://github.com/uichat-mira/who-you/pull/29)、[#30](https://github.com/uichat-mira/who-you/pull/30)。未激活或暂停的工作不能借 `jobId` 发送，旧 19 个工具在不带 `jobId` 时保持兼容。
- Cloud Auth 新增 Who You Web 的 PKCE OAuth、Web 设备绑定 Session 和受众受限服务凭证 [#160](https://github.com/uichat-mira/cloud-auth/pull/160)，并将生产回调收束到 `https://who-you.tomz.io/auth/callback` [#165](https://github.com/uichat-mira/cloud-auth/pull/165)。精确 prod SHA 的 [Cloud Auth CI](https://github.com/uichat-mira/cloud-auth/actions/runs/44714253226) 与 [生产部署](https://github.com/uichat-mira/cloud-auth/actions/runs/44714253238) 均成功。
- Who You 消费端已把登录来源切到 `who-you.tomz.io` [#39](https://github.com/uichat-mira/who-you/pull/39)，prod CI 成功；但仓库没有同一 SHA 的自动部署工作流证据，PR 也明确把真实个人登录验收延后，不能据此宣称端到端登录已验收。
- Mira Cloud 本周主要是 fixture-backed 的 Intelligent UI、批注和 Diff 原型；[PR #105](https://github.com/uichat-mira/mira-cloud/pull/105) 明确把 D01–D31 与待验证能力写入文档，[#118](https://github.com/uichat-mira/mira-cloud/pull/118) 仍是 fixture-backed inline diff review。它们没有被当作真实调度、执行或生产数据能力。
- Infra 已把 canonical-only Caddy ingress 以 exact-hash guard 从 dev→test→prod 固化，并禁用可能重新暴露 IP:3000/旧域名的 bootstrap：[PR #191](https://github.com/uichat-mira/mira-cloud-infra/pull/191)、[#192](https://github.com/uichat-mira/mira-cloud-infra/pull/192)、[#193](https://github.com/uichat-mira/mira-cloud-infra/pull/193)。
- Docs 本周发布的是赛博共产国际路演及其交互版本 [#241](https://github.com/uichat-mira/uichat-mira-docs/pull/241)–[#246](https://github.com/uichat-mira/uichat-mira-docs/pull/246)，没有新的公开 Remote/Cloud 内置产品说明。Desktop 自身的 Remote 协议、Relay 与 Dev Runtime 文档则随 #466/#485/#486 同步更新，减少了代码与仓内事实源分叉。
- `uichat-mira-relay`、`cloud-mcp-guanlan`、`cloud-pi` 本周没有新 PR。Relay 的变化集中在 Desktop/Mobile 消费端，不等于 Relay 服务本身已经获得新的耐久验证。

## 主要风险与阻塞

- **Cloud 当前页实时同步尚未发布。** 候选已通过维护者体验验收和自动测试，但仍是功能分支；逐字流、切后台恢复、Windows 与 Redmi 真机证据不足。
- **Relay 仍缺正向可用性门禁。** [REL-006 #26](https://github.com/uichat-mira/uichat-mira-relay/issues/26) 明确指出 `/health` 只证明 HTTP 存活，现有 smoke 只证明非法客户端被拒绝，尚未证明合法 Host+Client 握手、转发、ACK、重连和长期稳定。
- **Cloud Auth readiness 仍只证明进程/数据库。** [OPS-031 #152](https://github.com/uichat-mira/cloud-auth/issues/152) 要求区分登录存活、JWKS 存在与设备绑定服务凭证真实可签发；当前公开只读核查不能替代受控正负向签发测试。
- **Mobile 0.3.28 是风险接受发布。** 生产 CI/R2 成功是真实事实，但 Maestro bundle readiness race 与 MOB-077 端内升级真机 T4 没有因此消失。
- **Control Room 的关注中心仍未完成。** OPS-034/035 在 `dev`，OPS-036 仅交付 Draft [#115](https://github.com/uichat-mira/control-room/pull/115)；Draft/Hold/旧 Review/必要 Gate 的真实人工阻塞判定尚未进入生产。
- **Who You Web 登录缺最后一跳证据。** Cloud Auth 已部署；Who You 只看到 prod source/CI，尚缺同一版本 Worker 部署与真实浏览器 OAuth→设备 Session→`whoyou.read` 的验收。

## 推断

本周的稳定性提升主要来自“失败被保存为证据，并推动合同收紧”：会话历史截断推动 Host 权威 append，发布阻塞推动 Node/Electron ABI 边界明确，Worker 422 推动脚本与 GitHub 表达式边界分离，Control Room 则开始区分真实 Gate、最新 Run 与演示状态。

由此推断，下一阶段最大的风险不再是缺少组件，而是最后一公里证据不连续：源码合入、生产部署、签名客户端、真实身份和长连接必须出现在同一条可复现旅程中。单仓 CI 成功不能替代跨仓验收。

## 下周优先级

1. 将 Mobile `feat/cloud-chat-create-live-sync@0705ce9` 以最小差异合入 `dev`，补签名候选 APK，并分别验证最终规范消息自动刷新、逐字 SSE、前后台切换和账号切换。
2. 为 [REL-006 #26](https://github.com/uichat-mira/uichat-mira-relay/issues/26) 先审定能力矩阵，再做合法 Host+Client 正向 T3：握手、转发、ACK、断线恢复与错误分类；不要继续用 `/health` 或“非法票据被拒绝”代替可用性。
3. 完成 Cloud Auth 能力级 readiness 与 Who You 真实浏览器登录验收，保留 Audience、Device、Scope、撤销和过期的负向证据。
4. 将 Control Room OPS-034/035/036 在请求预算、缺权限降级和 stale evidence 行为验证后再晋级，避免把 Draft/Hold 噪声变成新的告警负担。
5. 对 Desktop `dev` 的 #476/#485/#486 做一次真实普通 Dev 与打包版本对照验收，再决定下一稳定版；公开 Docs 只同步已发布事实，不提前宣称 Cloud 远端全闭环。
