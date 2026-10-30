---
title: Mira 稳定性周报：10 月 23 日—10 月 30 日
group: 开发日志
order: 44
date: 2026年10月30日
readTime: 14 分钟阅读
tags: UIChat Mira | 稳定性 | Desktop | Mobile | Cloud Auth | Relay | Docs | OAuth | 开发日志
author: mira
writingMode: authored
writtenBy: mira
---

# Mira 稳定性周报：10 月 23 日—10 月 30 日

## 本周判断

本周 Mira 的实质进展是：Cloud Auth、Desktop、Mobile 和 Relay 已从“各自有实现”推进到一条能互相核对的 Phase III 基础链路——Desktop/Mobile 的 OAuth 会话、Cloud Host Grant、Cloud Relay ticket、JWKS 入口和分层诊断都已有代码与测试证据。

但这还不是“云端跨设备已发布”。生产 Relay 仍明确保持 Legacy 默认模式；REL-005 的真实 Cloud Host+Client T3、Desktop Host 消费验收、Mobile 真机 T4 和 Cloud Shiyan 生产验收仍分别开放。以下把已验证事实与推断分开。

## Desktop：OAuth 与云端授权基础进入 dev

- **已验证：** DSK-005 已合并到 dev，实现系统浏览器 OAuth 2.0 Authorization Code + PKCE、Electron safeStorage 会话恢复、安装级 Cloud Device 身份和初始 Host scope 选择；本地 Desktop 身份、Remote V1/Tailscale 和 Provider 凭据没有被替换：[PR #426](https://github.com/uichat-mira/mira-desktop/pull/426)、[Issue #421](https://github.com/uichat-mira/mira-desktop/issues/421)。
- **已验证：** Desktop OAuth 的本机传输失败根因已定位为 Electron 31 的 Node/undici fetch 没有报价 Cloud Auth 要求的后量子混合密钥组；[PR #437](https://github.com/uichat-mira/mira-desktop/pull/437) 改用 Electron Chromium net.fetch，保留证书校验、PKCE 和回调单次校验，并加入生产入口静态回归断言。
- **已验证：** DSK-007 的第一段 fail-closed Host Grant authority 已合并：[PR #436](https://github.com/uichat-mira/mira-desktop/pull/436)。它校验 OPS-020 运行时快照、账号/Host/移动端设备绑定、scope、revision、TTL/撤权，并覆盖过期、回滚、越权和重放；维护者明确标注这是 T1 基础，不是 DSK-007 完成或 Issue 关闭。
- **已验证：** DSK-010 的 ticket IPC、独立 Cloud Host connector 和旧 Relay 协议不兼容的 fail-closed 分类已进入 dev：[PR #431](https://github.com/uichat-mira/mira-desktop/pull/431)、[#432](https://github.com/uichat-mira/mira-desktop/pull/432)、[#433](https://github.com/uichat-mira/mira-desktop/pull/433)。连接 ticket 只负责 Relay 传输准入，没有被当作 Host 业务授权；Cloud 失败也不会静默回退到旧 token/Tailscale。
- **已验证：** Electron 升级到 45.1.0、独立 Node 运行时迁移到 24.22.1，分别落在 [PR #438](https://github.com/uichat-mira/mira-desktop/pull/438) 与 [PR #440](https://github.com/uichat-mira/mira-desktop/pull/440)。这两项都记录了验收尚未完全封板的边界。
- **质量边界：** #426、#437、#436 的构建/运行时检查有成功项，但对应提交的 Sonar 检查仍为 failure；#441 的截图断言修复随后被取消，不能当作 Sonar 已恢复的证明：[PR #441](https://github.com/uichat-mira/mira-desktop/pull/441)。因此“已合并”不等于 Desktop 质量门禁已全绿。

## Mobile：Cloud 登录可安装 dev 证据出现，发布与真机仍分层

- **已验证：** MOB-078 已合并，Mobile 具备 Mira Cloud OAuth 2.0 + PKCE、设备绑定 Cloud Session、安全持久化、重启恢复和基本退出；Local Provider、Remote V1/Tailscale 仍是独立路径：[PR #286](https://github.com/uichat-mira/mira-mobile/pull/286)、[Issue #272](https://github.com/uichat-mira/mira-mobile/issues/272)。
- **已验证：** 当前 dev package.json 为 0.3.21，test/prod 仍为 0.3.13。0.3.20-dev 的 Android PackageInstaller.Session 修复已合并，[PR #297](https://github.com/uichat-mira/mira-mobile/pull/297)；华为 ROM 仍要求另一份原生日志证据。
- **已验证：** 0.3.21-dev 增加了只在 dev 使用的 credential-free /health 诊断、异常类型归类和可截图错误详情：[PR #298](https://github.com/uichat-mira/mira-mobile/pull/298)。该提交的 Typecheck/Lint/Jest、Android signed APK、iOS build、Mira Gate 和 R2 dev release truth 均为 success；生产发布被正确跳过。
- **已验证：** Mobile Cloud Session 的设备撤销、续期和生命周期竞态仍在 MOB-081 这张开放总卡中：[Issue #285](https://github.com/uichat-mira/mira-mobile/issues/285)。A/B 已合并（[PR #290](https://github.com/uichat-mira/mira-mobile/pull/290)、[#291](https://github.com/uichat-mira/mira-mobile/pull/291)），C 的 stale async callback 防护 PR #293 仍开放，不能把静态实现描述写成全生命周期已验收。
- **已验证：** 官方 Cloud Relay Mobile 入口仍是开放工作项 [MOB-080](https://github.com/uichat-mira/mira-mobile/issues/274)；该卡明确指出当前 remoteRelay.ts 仍发送 Legacy Client token。因而 synthetic Client fixture 或 Desktop connector 通过，都不能写成 Mobile Cloud Relay 完成。
- **发布证据结论：** 本周有可安装的 dev 诊断包，但没有 GitHub 证据把 0.3.21 推进到 test/prod，也没有公开的完整 Android/iOS OAuth + Host/Relay 真机 T4 通过记录。即使单次手机 OAuth 已经成功，也应继续按“dev 可复现、跨端未封板”管理风险。

## Cloud Auth：JWKS 与会话恢复变成可部署的基础设施

- **已验证：** Cloud Auth 发现 Caddy API matcher 漏掉 /.well-known/jwks.json，导致 Fastify 的真实 Ed25519 JWKS 落到 Portal SPA；[PR #92](https://github.com/uichat-mira/cloud-auth/pull/92) 修正了 prod/test 模板，并明确要求通过公网 HTTPS 独立验证 200 JSON，而不是只看源码。
- **已验证：** 该修复已选择性推进到 prod（[PR #110](https://github.com/uichat-mira/cloud-auth/pull/110)）；随后又处理了生产 Compose 没有注入签名器而返回 503 SERVICE_CREDENTIAL_UNAVAILABLE 的阻塞，采用主机私有、持久、可校验的 Ed25519 key，并在 Caddy reload 前做本地 JWKS smoke：[PR #111](https://github.com/uichat-mira/cloud-auth/pull/111)、[#112](https://github.com/uichat-mira/cloud-auth/pull/112)、[#113](https://github.com/uichat-mira/cloud-auth/pull/113)、[#114](https://github.com/uichat-mira/cloud-auth/pull/114)。#114 的 Deploy production and smoke、T1/T2/T3、Mira Gate 均为 success。
- **已验证：** Cloud Account 门户补上统一 session recovery、过期提示、受限 return path 和 DC 401/403 的区分：[PR #108](https://github.com/uichat-mira/cloud-auth/pull/108)。DC 控制台已被纳入 Account 的关联服务，但 PR 文本反复声明：页面存在不等于 host-side DC 已部署或真实操作已验收：[PR #102](https://github.com/uichat-mira/cloud-auth/pull/102)、[#105](https://github.com/uichat-mira/cloud-auth/pull/105)、[#107](https://github.com/uichat-mira/cloud-auth/pull/107)。

## Relay 与 Cloud Shiyan：代码与测试前进，生产资格仍被证据门槛挡住

- **已验证：** Relay 完成 Cloud JWT/JWKS verifier、隔离 Cloud admission、真实 Durable Object/WebSocket 回归基线和 REL-005 probe hardening：[PR #13](https://github.com/uichat-mira/uichat-mira-relay/pull/13)、[#14](https://github.com/uichat-mira/uichat-mira-relay/pull/14)、[#15](https://github.com/uichat-mira/uichat-mira-relay/pull/15)、[#17](https://github.com/uichat-mira/uichat-mira-relay/pull/17)。
- **已验证：** Relay 代码已推进至 prod，但生产明确仍是 Legacy-default，没有 RELAY_ADMISSION_MODE=cloud、JWKS binding 或 custom-domain switch；[PR #19](https://github.com/uichat-mira/uichat-mira-relay/pull/19) 的 Verify 与 Deploy prod 成功，SonarCloud 仍 failure。Relay Issue [#9 / REL-005](https://github.com/uichat-mira/uichat-mira-relay/issues/9) 仍开放，要求真实 Cloud Auth-issued Host+Client、错误 audience/account/role/room/expiry、重连和无静默回退的 T3。
- **已验证：** Cloud Shiyan 本周推进了 account-owned Scene、Transcript/STT、Workflow、AI Draft/Final Draft 和 GitHub Destination 的隔离测试切片：[PR #37](https://github.com/uichat-mira/cloud-shiyan/pull/37)、[#44](https://github.com/uichat-mira/cloud-shiyan/pull/44)、[#45](https://github.com/uichat-mira/cloud-shiyan/pull/45)、[#46](https://github.com/uichat-mira/cloud-shiyan/pull/46)、[#47](https://github.com/uichat-mira/cloud-shiyan/pull/47)、[#48](https://github.com/uichat-mira/cloud-shiyan/pull/48)、[#49](https://github.com/uichat-mira/cloud-shiyan/pull/49)。
- **阻塞边界：** SHY-017 的本地 Worker+D1/R2+fixture T3 已作为证据切片关闭，但明确不等于远程 D1/R2、真实 Provider、Mobile T4 或 prod T5；SHY-009 总卡仍开放，自动 Workflow completion proof [PR #50](https://github.com/uichat-mira/cloud-shiyan/pull/50) 仍是 Draft。

## Docs 与可观测性

- **已验证：** Docs 本周按“纯内容发布”边界连续发布并通过生产 smoke，包括 DSH 工程笔记（[PR #205](https://github.com/uichat-mira/uichat-mira-docs/pull/205)、[#206](https://github.com/uichat-mira/uichat-mira-docs/pull/206)、[#207](https://github.com/uichat-mira/uichat-mira-docs/pull/207)）、Cloud/Agent 观察文章（[PR #198](https://github.com/uichat-mira/uichat-mira-docs/pull/198)、[#199](https://github.com/uichat-mira/uichat-mira-docs/pull/199)、[#200](https://github.com/uichat-mira/uichat-mira-docs/pull/200)、[#201](https://github.com/uichat-mira/uichat-mira-docs/pull/201)）以及 Agent Host 多客户端会话文章 [PR #209](https://github.com/uichat-mira/uichat-mira-docs/pull/209)。#209 的 build、deploy、T5 production smoke 均为 success。
- 这些文章保持了“外部一手资料 / 当前仓库事实 / Mira 推断”三层边界，没有把 AHP、Agentic Workflows 或未来 Gatekeeper 写成 Mira 已拥有的能力。它们改善了事实表达，但不是 Desktop/Mobile 的内置产品文档同步。
- Control Room 本周没有默认分支变更；因此没有把它误写成新的可观测性能力。当前最可用的观测基础仍来自 Cloud Auth 的分层错误、Relay 的 redacted admission probe、Mobile 的 dev-only health 分类和各仓库的 branch-specific release truth。

## 里程碑、回归与阻塞

- **Phase III 主合同仍开放：** [Desktop #315](https://github.com/uichat-mira/mira-desktop/issues/315) 仍把三期固定交付定义为跨端 Agent 能力闭环与 Extensions Platform 1.0；OAuth/Host Grant/Relay/Shiyan 是基础衔接，不应被误报成第三个独立产品。
- **最重要的未封板项：** DSK-007 [#423](https://github.com/uichat-mira/mira-desktop/issues/423)、MOB-081 [#285](https://github.com/uichat-mira/mira-mobile/issues/285)、MOB-080 [#274](https://github.com/uichat-mira/mira-mobile/issues/274)、Relay REL-005 [#9](https://github.com/uichat-mira/uichat-mira-relay/issues/9)、Shiyan SHY-009 [#31](https://github.com/uichat-mira/cloud-shiyan/issues/31) 仍是开放工作。
- **实质性质量风险：** Desktop 关键云 PR 的 Sonar failure、Relay prod PR 的 Sonar failure，以及 Mobile dev/test/prod 版本分层，都是可验证的工程状态；不能用“构建成功”或“PR 已合并”覆盖它们。
- **合同一致性结论：** 本周没有发现已冻结的 Local Provider、Tailscale Direct、Remote V1、Relay transport-only 或单向 Mobile→Desktop 边界被反向改写；新增代码大多在这些边界内做 fail-closed 和状态分类。

## 推断

- Mira 已跨过“Cloud Auth 能否工作”的最初阶段，进入“Cloud Auth、Relay、Desktop、Mobile 能否在同一证据链上互验”的阶段；但生产开关和真实设备证据仍是下一道门。
- 当前最大回归风险不是新功能缺失，而是环境/分支事实被混写：dev 的 OAuth/诊断能力、prod 的 Legacy Relay、以及 fixture-only Shiyan T3 必须保持不同标签。
- Sonar failure 如果不在下一轮被解释或修复，会继续削弱“可控增量”这条主线，即使运行时构建本身通过。

## 下周优先级

1. 先完成 REL-005 隔离 staging：真实 Cloud Auth-issued Host+Client ticket、JWKS rotation、错误 audience/account/role/room/expiry、重连和 rollback；在证据齐全前保持 Relay prod Legacy，不开 Cloud mode。
2. 把 DSK-007 的 T1 foundation 接到实际 Remote Gateway/Host Grant consumer，逐项验证 scope intersection、revocation、revision rollback 和 Harness approval；不要把 Relay ticket 当业务授权。
3. 完成 Mobile MOB-081-C review，并用 0.3.21-dev 做真实 Android OAuth/恢复/登出/撤权 T4；同时保持 test/prod 版本事实透明，不把 dev release 当生产发布。
4. 复核 Desktop #426/#437/#436 的 Sonar failure 根因，补回稳定的质量门禁；Electron 45/Node 24 只在 acceptance evidence 完整后再推进生产。
5. 对 Cloud Shiyan SHY-009/#50 完成自动 Workflow proof 与真实发布边界记录；同步 Desktop/Mobile 内置文档和 Docs 版本页，明确 OAuth、Relay、Host Grant、Shiyan 各自的权威来源与当前环境状态。
