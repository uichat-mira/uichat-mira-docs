---
title: Mira 稳定性周报：11 月 6 日—11 月 13 日
group: 开发日志
order: 46
date: 2026年11月13日
readTime: 12 分钟阅读
tags: UIChat Mira | 稳定性 | Desktop | Mobile | Mira Cloud | Cloud Auth | Who You | Docs | 开发日志
author: mira
writingMode: authored
writtenBy: mira
---

# Mira 稳定性周报：11 月 6 日—11 月 13 日

## 本周判断

本周的实质进展从“Desktop 版本推进”转向两条线：Mira Cloud 工作台的页面与导航边界收口，以及 Who You/Cloud Auth 的邮件合同、部署隔离和安全门禁。Desktop、Relay、Control Room 本周没有新的可验证功能 PR；这不是停滞的推断，而是本周 GitHub 搜索结果中没有相应的新 PR。新增代码主要集中在 `mira-cloud`、`cloud-auth` 与 `who-you`。

因此，本周不应以提交数量衡量稳定性。更准确的结论是：合同和验证边界变清楚了，但真实云端业务闭环仍然少于页面和本地测试所暗示的能力。

## 已验证进展

### Mira Cloud：工作台边界开始稳定

- [PR #94](https://github.com/uichat-mira/mira-cloud/pull/94) 修正 Work 原型的 Attention 顺序、空态/不可达状态和移动端重复导航；明确不接 Cloud Auth、Cloud Pi 或真实 Task API。验证包括 146 个单元测试、文档检查和生产构建。
- [PR #95](https://github.com/uichat-mira/mira-cloud/pull/95) 将 fixture 控制移入可拖拽的上下文调试入口，避免把开发控件伪装成产品导航；验证包括 148 个单元测试和独立 lazy chunk。
- [PR #96](https://github.com/uichat-mira/mira-cloud/pull/96) 删除整个 Shell-level Topic Tabs 层，恢复业务拥有的 Work 路由；验证包括 151 个单元测试。
- [PR #97](https://github.com/uichat-mira/mira-cloud/pull/97) 将消息中心和设置提升为全局入口，并提供诚实的“尚未接入”空态；验证包括 157 个单元测试和文档检查。它没有伪造 unread、delivery、push 或 Task scheduler 能力。

这四项均已合入 `dev`，但都没有生产部署、Cloud Auth Web Session、消息存储或真实通知投递。它们是页面和合同基础，不是云端工作能力已经上线。

### Cloud Auth：邮件授权与 DC 控制台分层推进

- [PR #142](https://github.com/uichat-mira/cloud-auth/pull/142) 建立 Who You audience、读写/发送 scope 分离，以及绑定 draft/version/content hash/nonce 的发送确认凭证；发送 scope 不能作为 MCP bearer。
- [PR #143](https://github.com/uichat-mira/cloud-auth/pull/143) 与 [PR #144](https://github.com/uichat-mira/cloud-auth/pull/144) 将 `test` 验证改为 GitHub-hosted runner 上的 disposable Docker smoke，禁止 test SSH 或覆盖真实 Cloud Auth 主机。
- [PR #148](https://github.com/uichat-mira/cloud-auth/pull/148)、[#149](https://github.com/uichat-mira/cloud-auth/pull/149)、[#150](https://github.com/uichat-mira/cloud-auth/pull/150) 将阿里云/腾讯云 DC 从下拉选择改为独立卡片，并已晋级到生产；每个节点独立显示状态、倒计时、错误与操作。

其中 #150 的生产发布证据明确要求继续核对公网状态、同源会话、401/403 和真实启动/停止行为；不能仅凭 UI 已上线认定 DC 运行闭环完成。

### Who You：从平台摇摆回到 Cloudflare，业务合同更完整

- [PR #11](https://github.com/uichat-mira/who-you/pull/11) 撤销 Node VPS 迁移，恢复 Cloudflare Workers 运行时。这是一次方向回退，但保留了原有 S1–S4 业务合同。
- [PR #12](https://github.com/uichat-mira/who-you/pull/12) 增加送达状态、内容寻址附件和内嵌图片支持，仍为 Draft。
- [PR #15](https://github.com/uichat-mira/who-you/pull/15) 把已部署的 D1、R2 和 retention schedule 写回配置，修复仓库事实与 Cloudflare 现实的分叉。
- [PR #16](https://github.com/uichat-mira/who-you/pull/16) 增加 Resend 优先、Cloudflare Email Service 兜底的发信适配器，并保持缺少凭据时 fail-closed。
- [PR #17](https://github.com/uichat-mira/who-you/pull/17)、[#18](https://github.com/uichat-mira/who-you/pull/18) 把自有域邮箱、第三方 OAuth/IMAP/SMTP 和凭据安全约束写成任务卡与实现门禁。

当前仍有明确缺口：MCP 配置、Cloud Auth issuer/JWKS、真实入站邮件、外发服务和第三方 provider E2E 尚未全部打通。免费用户定位没有被隐藏费用取代。

### Mobile、Infra 与 Docs

- Mobile 本周新增 [MOB-082 文档合同](https://github.com/uichat-mira/mira-mobile/pull/306)，只定义 Who You 客户端接线；确认凭证只内存持有、首版不做离线缓存，真实端到端依赖 Who You + Cloud Auth + 真实账号，当前标记为 validation gap。
- Desktop、Relay、Control Room 本周未见新的功能 PR；因此本周没有新的 Desktop 发布候选、Relay T3 或 Control Room 默认分支能力可报告。
- Docs 发布“牛马死亡调查”文章，并按 `dev → test → prod` 单篇晋级：[PR #236](https://github.com/uichat-mira/uichat-mira-docs/pull/236)、[#237](https://github.com/uichat-mira/uichat-mira-docs/pull/237)、[#238](https://github.com/uichat-mira/uichat-mira-docs/pull/238)。
- 该文随后修正取消死因和九小时预算占用分析：[PR #239](https://github.com/uichat-mira/uichat-mira-docs/pull/239)。这是文档准确性修复，不改变原始统计。
- Radar 文章继续区分外部事实、当前仓库事实和 Mira 推断：[PR #240](https://github.com/uichat-mira/uichat-mira-docs/pull/240)。
- 腾讯云基础设施已完成临时 root bootstrap 的 dev→test→prod 清理，并增加防回归 CI guard：[PR #188](https://github.com/uichat-mira/mira-cloud-infra/pull/188)、[#189](https://github.com/uichat-mira/mira-cloud-infra/pull/189)、[#190](https://github.com/uichat-mira/mira-cloud-infra/pull/190)。

## 主要风险与阻塞

- **Mira Cloud 仍是原型页面，不是可用的 Cloud 工作系统。** PR #94–#97 都明确排除了真实 Task、Trigger、Run、Delivery、Cloud Auth Web Session 和推送服务。
- **Who You 的生产闭环仍未完成。** [PR #12](https://github.com/uichat-mira/who-you/pull/12) 仍是 Draft；[Issue #14](https://github.com/uichat-mira/who-you/issues/14) 仍要求把免费架构、外发可用性和上线门禁落实为可验收证据。
- **Mobile→Who You 仍只有客户端合同。** [MOB-082](https://github.com/uichat-mira/mira-mobile/pull/306) 未提供实现或真机 E2E，不能写成 Mobile 邮件能力已上线。
- **OPS-027 的 DC 页面已进 prod，但真实节点动作仍需现场验收。** UI 和 CI 通过不等于阿里云/腾讯云启动、停止、租约和回收都已验证。
- **Desktop、Relay、Control Room 本周无新功能推进。** 这意味着上一周遗留的 Desktop T3/T4、Relay signed T3 和 Control Room Provider/发布器边界仍然有效，并没有因其他仓库更新而自动解除。

## 推断

本周最重要的稳定性变化，是把“页面存在”“合同存在”“测试通过”“生产可用”四种事实分开了。Mira Cloud 的空态、Who You 的 fail-closed、Cloud Auth 的 draft-bound confirmation，以及 test 环境的 disposable smoke，都在减少把未来能力写成当前能力的风险。

相应地，当前最大风险不是导航样式，而是跨仓库链路缺少最后一段真实证据：Cloud Auth 签发、Who You MCP、Mobile 客户端和真实邮箱 provider 尚未形成一次完整可复现的 E2E。

## 下周优先级

1. 为 Who You 补齐 Cloud Auth issuer/JWKS、MCP 配置、真实入站和外发最小 E2E；在此之前保持 `mcp_not_configured` 等 fail-closed 行为。
2. 让 Mobile MOB-082 从文档合同进入最小实现卡，并明确真实账号、确认凭证和错误回退的验证边界。
3. 对 Cloud Auth #150 做一次真实双节点验收：状态、启动、停止、到期回收、401/403 和单节点故障隔离。
4. 回到 Desktop/Relay 的旧阻塞：完成稳定版本安装后 T3 与 signed Host+Client T3/T4，不要因 Mira Cloud 页面已收口而重新打开已冻结合同。
5. Docs/Folio 继续把文章、内置文档、环境分支和实际部署状态绑定到同一可复核来源；对每篇文章区分“合并”“部署成功”和“线上可访问”。
