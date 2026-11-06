---
title: Mira 稳定性周报：10 月 30 日—11 月 6 日
group: 开发日志
order: 45
date: 2026年11月6日
readTime: 15 分钟阅读
tags: UIChat Mira | 稳定性 | Desktop | Mobile | Cloud Auth | Relay | Guanlan | Cloud Pi | Docs | 开发日志
author: mira
writingMode: authored
writtenBy: mira
---

# Mira 稳定性周报：10 月 30 日—11 月 6 日

## 本周判断

本周 Mira 从“协议和组件分别可用”推进到“多个环境开始具备可核对的发布证据”：Desktop 的 Electron-only `v0.106.0` 候选已进入 `test`，Relay 的 Cloud-only Worker 已与 Legacy Worker 分离并部署到生产，Mobile 修复了无配对 Cloud/Local 用户的导航锁死并推进到 `0.3.24-dev`，Cloud Auth、Guanlan、Cloud Pi 也形成了较完整的身份、投递、管理和观测边界。

但这还不是“云端跨设备已经发布”。Desktop 稳定候选仍被安装后 T3、Mobile→Relay→Desktop T4、Tag 规则和 macOS 签名限制住；Mobile 的 Cloud business adapter 仍是 Draft；Relay 的完整 REL-005 签名 Host+Client 验收仍开放；Guanlan 的真实 Cloud Auth→注册→MCP 读写链路还被隔离环境凭据阻塞。以下明确区分已验证事实与推断。

## Desktop：Electron-only 候选进入 test，但生产发布仍被真实运行时证据挡住

- **已验证：** Electron-only `v0.106.0` 候选已通过 `dev → test` 晋级；稳定 Tag 来源校验也已合并，发布前会重新获取 `prod` 历史并核对 tag、checkout SHA、版本与祖先关系：[PR #454](https://github.com/uichat-mira/mira-desktop/pull/454)、[PR #456](https://github.com/uichat-mira/mira-desktop/pull/456)。
- **已验证：** R2 的“latest”写入权收束到 tag 驱动发布，普通 `prod` 构建不再覆盖网站所选版本；同时补了错误 tag、缺 blockmap、Tauri 资产混入和 GitHub Release 尺寸不一致的确定性负例：[PR #449](https://github.com/uichat-mira/mira-desktop/pull/449)。
- **已验证：** Electron 第二实例在 `requestSingleInstanceLock()` 失败后可能仍继续初始化 Backend/窗口的回归已修复，并加入 `whenReady()` 延迟场景测试：[PR #451](https://github.com/uichat-mira/mira-desktop/pull/451)。
- **已验证：** Cloud Host 在原生 Cloud 登录/会话恢复后自动启动，注销、撤权或无效 IPC 时 fail-closed；Cloud Host、Legacy Relay 和 Tailscale connector 仍保持分离：[PR #457](https://github.com/uichat-mira/mira-desktop/pull/457)。
- **已验证：** 为 DSK-006 增加了 Cloud Pilot 启动模式。Windows 真实启动、Backend `/health` 和线上 Relay health 已记录；但该 PR 明确未声称真实 Host ticket、hello/ack、重连或 Mobile→Desktop 业务链路通过：[PR #458](https://github.com/uichat-mira/mira-desktop/pull/458)。
- **已验证：** DSK-012 的 Host lease renewal 已有 51/51 定向测试和完整 `pnpm check` 证据，覆盖续租、退避、过期、401/403、single-flight、登出竞态和 shutdown 清理；仍未宣称真机或长连接验收：[PR #460](https://github.com/uichat-mira/mira-desktop/pull/460)、[Issue #459](https://github.com/uichat-mira/mira-desktop/issues/459)。

**发布边界：** [Desktop PR #453](https://github.com/uichat-mira/mira-desktop/pull/453) 仍是 Draft/blocked。Windows 和 Intel macOS 的 exact-head 构建产物已记录为成功，但稳定发布仍缺：安装后 Backend `/health`、OAuth 恢复/退出、单实例、真实 Mobile→Relay→Desktop T4、`v*` Tag ruleset，以及 Intel macOS 签名。CI 产物成功不能替代这些用户侧证据。

## Mobile：导航回归已收口，Cloud 业务入口仍未封板

- **已验证：** 0.3.22-dev 上“配置 Local Provider 并登录 Cloud 后无法进入会话列表/设置”的导航锁死已定位并修复。现在 `SessionList` 始终作为应用根，配对 Desktop 仍是可选路径；冷启动 OAuth、Bootstrap-only、无安全存储时的本地会话恢复均有回归覆盖：[PR #302](https://github.com/uichat-mira/mira-mobile/pull/302)。
- **已验证：** 本周合并 `0.3.24` 版本同步，`package.json`、Android/iOS 版本与 build number 对齐，`buildTruth.contract.test.js` 记录 14/14 通过：[PR #305](https://github.com/uichat-mira/mira-mobile/pull/305)。
- **已验证：** 新增受限的本地只读天气工具 `local_weather_current`，工具网关没有 shell、脚本、MCP 或任意文件系统权限；Host 工具在可达时合并，未配对时本地工具仍可用：[PR #304](https://github.com/uichat-mira/mira-mobile/pull/304)。该 PR 明确没有 Android/iOS 真机验证，Open-Meteo 在中国大陆网络条件下的可用性仍需运行观测。
- **已验证：** Mobile Cloud-only business adapter 已实现 Host manifest、线程读写、chat POST/SSE、账户切换与 stale ticket fencing；非幂等变更断线时返回 `*_UNCERTAIN`，不回退到 Tailscale。但 PR 仍为 Draft，当前用户界面仍使用 Legacy Remote runtime，没有宣称 Cloud Mobile→Desktop 已可用：[PR #303](https://github.com/uichat-mira/mira-mobile/pull/303)、[Issue #274](https://github.com/uichat-mira/mira-mobile/issues/274)。

**推断：** Mobile 的“本地 Agent 工具”和“Cloud Host 业务入口”开始分层是正确方向，但 0.3.24-dev 的版本合同、R2 发布真相、真机前后台恢复和 Cloud T4 仍应分别验收；不能用版本号增长代替跨端稳定性结论。

## Relay：Cloud-only 生产 Worker 已隔离上线，REL-005 仍未完成

- **已验证：** REL-005 的两账户同 Worker 隔离测试已合并：同一 Cloud Worker 上同时验证 A/B Host+Client、独立 room、重叠 request id、跨 room 拒绝和 provenance；这是共享多租户合同的关键回归：[PR #22](https://github.com/uichat-mira/uichat-mira-relay/pull/22)。
- **已验证：** 官方 Cloud-only Worker 已从 Legacy Worker 中拆出，拥有独立 Durable Object namespace、Cloud admission 和生产 Cloud Auth JWKS；生产部署保留 `relay.tomz.io` Legacy 服务及其 namespace 不变：[PR #23](https://github.com/uichat-mira/uichat-mira-relay/pull/23)、[PR #24](https://github.com/uichat-mira/uichat-mira-relay/pull/24)、[PR #25](https://github.com/uichat-mira/uichat-mira-relay/pull/25)。
- **已验证：** Cloud-only 生产 smoke 记录了 health 200 和无 ticket WebSocket 被 `CLOUD_TICKET_REQUIRED`/1008 拒绝。这证明部署和 admission 边界存在，不证明已完成签名 Host+Client 业务闭环。
- **未闭环：** [REL-005 #9](https://github.com/uichat-mira/uichat-mira-relay/issues/9) 仍开放；[PR #20](https://github.com/uichat-mira/uichat-mira-relay/pull/20) 仍是外部 runner 的 Draft 证据包。还需要同账号 Host+Client、错误 audience/account/role/room/expiry、重连和 rollback 的完整证据。

## Cloud Auth、Guanlan 与 Cloud Pi：身份和运维边界变得可观察

- **已验证：** Cloud Auth 的 Guanlan registration outbox 已合并：账号创建与注册意图同一事务、8 次有界重试、租约恢复、终态 `failed` 和显式管理员重试；发送端只接受账号匹配的 HMAC 收据：[PR #130](https://github.com/uichat-mira/cloud-auth/pull/130)。
- **已验证：** Guanlan consumer token 已纳入既有 Service Credential 机制，使用固定 audience `mira:cloud-guanlan`、账号派生 consumer、读写 scope 分离，并在注册状态不是 `delivered` 时返回 409 而不是签发凭证：[PR #134](https://github.com/uichat-mira/cloud-auth/pull/134)。
- **已验证：** Guanlan 已交付 HMAC 注册接收端和“删除后不复活”收据语义，并记录了与 Cloud Auth 发送端逐项一致的合同：[PR #29](https://github.com/uichat-mira/cloud-mcp-guanlan/pull/29)。
- **已验证：** 隔离非生产 Guanlan 环境具备真实 D1、Worker、MCP metadata、匿名/垃圾 token 401、注册首次/重复和签名/时间窗负例；但该环境使用测试期静态 JWKS，不是生产形态：[PR #30](https://github.com/uichat-mira/cloud-mcp-guanlan/pull/30)。
- **阻塞：** Guanlan 真实 Cloud Auth→registration→MCP 读写验收仍受隔离环境 Cloudflare 凭据/入口阻塞；[GLN-014 #26](https://github.com/uichat-mira/cloud-mcp-guanlan/issues/26)、[GLN-015 #28](https://github.com/uichat-mira/cloud-mcp-guanlan/issues/28)、[GLN-012 #128](https://github.com/uichat-mira/cloud-auth/issues/128) 和 [GLN-013 #129](https://github.com/uichat-mira/cloud-auth/issues/129) 不能因代码已合并就关闭。
- **已验证：** Cloud Pi 完成 Owner Gateway、Docker 首发包、Feishu 群 @ 路由修复、组织级 SSH 直接部署 workflow 和真实 Guanlan MCP Extension 接线：[PR #46](https://github.com/uichat-mira/cloud-pi/pull/46)、[#47](https://github.com/uichat-mira/cloud-pi/pull/47)、[#48](https://github.com/uichat-mira/cloud-pi/pull/48)、[#49](https://github.com/uichat-mira/cloud-pi/pull/49)、[#30](https://github.com/uichat-mira/cloud-pi/pull/30)。
- **重要边界：** Cloud Pi #49 只证明部署路径和回滚/备份脚本已就绪，仍需 `test → prod` 晋级及真实飞书群 @；[AGT-039 #50](https://github.com/uichat-mira/cloud-pi/issues/50) 仍开放。WeCom 外部工具仍必须显式配置会话白名单，普通开放聊天不能继承维护者 Guanlan 权限：[PR #41](https://github.com/uichat-mira/cloud-pi/pull/41)。

## Docs、Folio 与内置文档准确性

- **已验证：** Docs 本周发布十月开发回顾并精确晋级 prod，文章把基础设施、Cloud、Mobile、External Worker、Folio 和组织协作放在同一事实链上：[PR #223](https://github.com/uichat-mira/uichat-mira-docs/pull/223)、[PR #226](https://github.com/uichat-mira/uichat-mira-docs/pull/226)。
- **已验证：** Docs 新增 RSS 2.0 feed，直接由已发布 HTML 的 Article JSON-LD 和 sitemap 生成，并把 RSS、sitemap 和 Article JSON-LD 做一致性校验；该 feed 已选择性发布到 prod：[PR #219](https://github.com/uichat-mira/uichat-mira-docs/pull/219)、[PR #221](https://github.com/uichat-mira/uichat-mira-docs/pull/221)。
- **已验证：** 本周 Radar 文章继续明确“外部一手资料 / 当前仓库事实 / Mira 推断”的边界，未把 `pull_request_target` 政策、Agent 身份可见性或并行 Git 写入等外部信号写成 Mira 已具备的能力：[PR #229](https://github.com/uichat-mira/uichat-mira-docs/pull/229)、[#230](https://github.com/uichat-mira/uichat-mira-docs/pull/230)、[#231](https://github.com/uichat-mira/uichat-mira-docs/pull/231)。
- **已验证：** Folio 在 `dev` 完成 Git 日期合同、RSS/Atom、结构化 metadata、sitemap `lastmod`、显式 noindex，以及第一轮 Header/信息架构治理：[PR #139](https://github.com/uichat-mira/folio/pull/139)、[#140](https://github.com/uichat-mira/folio/pull/140)、[#141](https://github.com/uichat-mira/folio/pull/141)、[#142](https://github.com/uichat-mira/folio/pull/142)、[#145](https://github.com/uichat-mira/folio/pull/145)、[#147](https://github.com/uichat-mira/folio/pull/147)。
- **边界：** Folio #147 明确只合入 `dev`，旧公开路径重定向策略、Safari/触摸验收和后续 test/prod 晋级仍未完成；FOL-035/FOL-036 继续开放：[Issue #143](https://github.com/uichat-mira/folio/issues/143)、[#144](https://github.com/uichat-mira/folio/issues/144)。
- Control Room 本周没有默认分支变更；因此不能把它写成新增的真实模型 Provider 或 GitHub 发布闭环。当前它仍是可验证基础设施，而非自动审查已经全面落地。

## 里程碑、回归与阻塞

- **Phase III 主合同仍开放：** [Desktop #315](https://github.com/uichat-mira/mira-desktop/issues/315) 仍要求跨端 Agent 能力和 Extensions Platform 1.0；OAuth、Host Grant、Relay 和 Guanlan 是基础衔接，不应被误报成多个已完成产品。
- **发布门：** Desktop #453、Mobile #274/#303、Relay #9/#20、Guanlan #26/#28、Cloud Pi #50、Folio #143/#144 均仍需要独立的环境或人工证据。
- **材料性回归已处理：** Mobile 无配对用户导航锁死（#302）、Desktop 第二实例仍初始化 Backend（#451）、Desktop R2 latest 被普通 prod 构建覆盖（#449）、Cloud Pi 飞书群 @ 被旧 allowlist 吞掉（#48）都已有针对性修复和回归/现场依据。
- **没有发现合同反向改写：** Local Provider、Tailscale Direct、Remote V1、Relay transport-only、Cloud ticket 与业务授权分离、普通聊天与私有 Guanlan 权限分离等既定边界，本周仍被保留。新增工作主要是 fail-closed、状态分类、审计和可回滚能力。

## 推断

本周最重要的变化不是“代码更多”，而是发布责任开始分层：Desktop 负责原生身份与 Host 生命周期，Relay 负责传输 admission/provenance，Mobile 负责消费端状态与本地/Cloud 工具边界，Cloud Auth 负责账号和服务凭证，Guanlan 负责业务数据，Cloud Pi 负责运行时与 IM 投递。这个分层正在减少跨仓库合同漂移。

当前最大风险也随之变得清楚：不是某个单测失败，而是“一个环境的成功证据被误读成另一个环境的完成”。尤其要避免把 Desktop test 构建当成 prod 发布、把 Relay no-ticket smoke 当成 T3、把 Guanlan fixture/D1 记录当成真实 Cloud Auth E2E，或把 Cloud Pi 镜像发布当成真实群聊验收。

## 下周优先级

1. 完成 Desktop `v0.106.0` 的安装后 T3：Windows Backend health、OAuth 恢复/退出、单实例、R2 精确版本；补齐 `v*` Tag ruleset，再讨论 prod/tag。
2. 以隔离 Cloud-only Worker 完成 REL-005 真正签名 Host+Client T3，覆盖两账户、错误 claims、重连、rollback；在此之前维持 Legacy 默认，不扩大公开声明。
3. 复核 Mobile `0.3.24-dev` 真机前后台/进程重建、无配对 Cloud/Local 路径和本地天气工具边界；继续把 MOB-080 的 Cloud 业务 adapter 与用户可选入口分开验收。
4. 为 Guanlan 续上真实 Cloud Auth registration 和 MCP read/write 验收：先恢复隔离环境凭据/入口，再验证 delivered gate、consumer 隔离、撤销和负例；不要用静态 JWKS 测试环境替代生产结论。
5. 推进 Cloud Pi #49 的 test/prod 受控晋级与真实群 @，同时保持 WeCom 私有工具的显式授权闸门；将 Cloud Agent owner portal 的计划 CRUD、运行报告和投递详情继续收口到 [Cloud Auth #139](https://github.com/uichat-mira/cloud-auth/issues/139)。
6. Docs/Folio 发布前补旧路径重定向和消费站真实验收，继续把内置文档、官网文章、版本页和实际环境状态绑定到同一可复核来源。
