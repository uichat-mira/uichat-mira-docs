---
title: Mira 稳定性周报：11 月 20 日—11 月 27 日
group: 开发日志
order: 48
date: 2026年11月27日
readTime: 12 分钟阅读
tags: UIChat Mira | 稳定性 | Desktop | Mobile | Mira ID | Who You | Control Room | MCP | Docs | 开发日志
author: mira
writingMode: authored
writtenBy: mira
---

# Mira 稳定性周报：11 月 20 日—11 月 27 日

## 本周判断

本周的主要变化不是“提交更多”，而是 Desktop、Mobile、Mira ID、Who You 和 Control Room 开始共享一套明确的 V1/MCP 合同。Desktop `v0.107.1` 已有成功的生产发布工作流，Mobile `0.5.1` 也完成了 test→prod 推进；但跨仓真实验收（OPS-053）仍未完成，移动端真实设备与发布证据仍有缺口。因此，本周可判定为“合同与发布链明显收紧”，不能判定为“跨端链路已经完全稳定”。

## 已验证进展

### Desktop：0.107.1 发布，远程执行边界继续收紧

- [PR #513](https://github.com/uichat-mira/mira-desktop/pull/513) 将 `0.107.1` 推进到 prod；对应 [Release Production run](https://github.com/uichat-mira/mira-desktop/actions/runs/45803121927) 成功，并关联 `v0.107.1` 的 macOS Intel/arm64 构建工作流。
- [PR #498](https://github.com/uichat-mira/mira-desktop/pull/498)、[#507](https://github.com/uichat-mira/mira-desktop/pull/507)、[#508](https://github.com/uichat-mira/mira-desktop/pull/508)、[#510](https://github.com/uichat-mira/mira-desktop/pull/510) 分别收口标准认证 MCP Server、能力准入、远程 Thread/Execution 生命周期和 MCP 2026-07-28 直连；这些改动保留 Host 权威与授权边界，没有新增第二套 Thread 模型。
- [PR #500](https://github.com/uichat-mira/mira-desktop/pull/500) 将运行时推进到 Node 26.13.1 并覆盖 macOS arm64；对应安装/签名和路由守卫的合同说明仍在开放的 [PR #501](https://github.com/uichat-mira/mira-desktop/pull/501) 中。
- [PR #511](https://github.com/uichat-mira/mira-desktop/pull/511) 的 dev→test 候选已合入，但 [#513](https://github.com/uichat-mira/mira-desktop/pull/513) 明确记录了在未等待完整 CI/设备验收的情况下推进 prod。发布成功是真实事实，完整打包与真机验收不是同一件事。

### Mobile：Pi Core 与 V1/MCP 客户端进入同一条合同线

- [PR #350](https://github.com/uichat-mira/mira-mobile/pull/350)、[#352](https://github.com/uichat-mira/mira-mobile/pull/352)、[#353](https://github.com/uichat-mira/mira-mobile/pull/353) 将 Node 26/Pi Core 方向、预算上限、工具调用失败闭环和 R2 不可变发布事实落到代码；[#355](https://github.com/uichat-mira/mira-mobile/pull/355)、[#356](https://github.com/uichat-mira/mira-mobile/pull/356)、[#357](https://github.com/uichat-mira/mira-mobile/pull/357) 分别修复 iOS Keychain、终端状态误报和 Hermes `structuredClone` 缺失。
- [PR #360](https://github.com/uichat-mira/mira-mobile/pull/360) 将 dev 推进到 `0.4.0`；随后 [#406](https://github.com/uichat-mira/mira-mobile/pull/406) 完成 MOB-105/107 的 V1 实例服务目录与标准 MCP 联调，覆盖 appId/serviceId/resource/revision、账号/设备/会话/过期校验。该 PR 报告 208 suites/1768 tests、类型检查和 lint 通过，并用真实 Desktop `#510` 路由验证 discovery/list/read；但仍明确是 fixture/候选证据，不是完整平台发布验收。
- [PR #407](https://github.com/uichat-mira/mira-mobile/pull/407) 修复审批文本的 U+2028/U+2029 转义和目录缓存竞态；[#409](https://github.com/uichat-mira/mira-mobile/pull/409) 移除静态 Who You UI，改从授权应用目录生成 Plugins；两项均增加回归覆盖，但没有宣称真实设备 T4。
- [PR #411](https://github.com/uichat-mira/mira-mobile/pull/411) 完成 V1/MCP dev→test；[#413](https://github.com/uichat-mira/mira-mobile/pull/413) 推进 `0.5.1` test→prod。随后 [#416](https://github.com/uichat-mira/mira-mobile/pull/416) 补 iOS 元数据，并记录此前 `0.5.1` CI/R2 失败、没有 tag 的事实；补丁后的 prod CI/R2 已重新成功，但仍缺 Android/iOS 完整真机接受证据。

### Mira ID、Who You：V1 断代完成，真实跨仓验收仍开放

- Cloud Auth 通过 [#215](https://github.com/uichat-mira/cloud-auth/pull/215)、[#217](https://github.com/uichat-mira/cloud-auth/pull/217)、[#218](https://github.com/uichat-mira/cloud-auth/pull/218)、[#220](https://github.com/uichat-mira/cloud-auth/pull/220) 完成 V1 应用注册、OAuth/grants、V0 注册/签发下线和 V1 open platform prod；[#221](https://github.com/uichat-mira/cloud-auth/pull/221)、[#224](https://github.com/uichat-mira/cloud-auth/pull/224)、[#226](https://github.com/uichat-mira/cloud-auth/pull/226) 继续收口 verified `appName`、目录/Portal 和 Mira ID 视觉发布。
- 生产部署曾出现一次失败（[#45921539671](https://github.com/uichat-mira/cloud-auth/actions/runs/45921539671)），随后 [#45923908728](https://github.com/uichat-mira/cloud-auth/actions/runs/45923908728) 成功恢复。这个恢复是已验证事实，不能把中间故障从周报中抹掉。
- Who You 的 [PR #92](https://github.com/uichat-mira/who-you/pull/92) 完成 V1 app-instance/MCP 直切，[#95](https://github.com/uichat-mira/who-you/pull/95) 完成品牌与 Mira ID 应用体验；生产部署工作流随后成功，但 [OPS-053](https://github.com/uichat-mira/cloud-auth/issues/213) 仍要求真实 Origin+APP_ID/AppSecret、OAuth 会话、Mobile MCP discovery/list/call、Desktop↔Mobile 互操作及旧 V0 负向矩阵，不能用单仓 CI 替代。

### Control Room、Docs 与关联 MCP

- Control Room 的 [#116](https://github.com/uichat-mira/control-room/pull/116)、[#118](https://github.com/uichat-mira/control-room/pull/118)、[#120](https://github.com/uichat-mira/control-room/pull/120)、[#123](https://github.com/uichat-mira/control-room/pull/123) 将当前 head、Worker escalation、OPS-033–038 和 Central Office/Attention Desk 送入 prod；本周相关 CI、Overview、AI Review Gateway smoke 均成功。观测面已从演示数据转向可追溯事实，但跨仓 acceptance 仍不等于已完成。
- Docs 的 Folio 0.2.0 迁移仍在开放 [PR #247](https://github.com/uichat-mira/uichat-mira-docs/pull/247)，尚未成为 prod 基线；因此本周的产品合同真相仍应以 Desktop/Mobile/Cloud Auth/Who You 仓内文档和已发布版本为准。`uichat-mira-relay` 本周没有新 PR，不能把消费端迁移当成 Relay 服务自身的新耐久证据。
- 相关 MCP 组件 `cloud-mcp-guanlan` 新增但尚未完成的 V1 cutover [Issue #28](https://github.com/uichat-mira/cloud-mcp-guanlan/issues/28) 与 Web Admin [Issue #34](https://github.com/uichat-mira/cloud-mcp-guanlan/issues/34)，仍是阻塞工作，不应提前写成上线能力。

## 主要回归、阻塞与推断

- **最高优先级阻塞：OPS-053 真实跨仓验收未完成。** 代码已对齐 V1/MCP 2026-07-28，仍需在受控账号和真实服务上跑正向及旧 V0 负向矩阵。
- **Mobile `0.5.1` 证据分层。** 前一轮 CI/R2 失败且无 tag，元数据修补后工作流成功；这证明发布链恢复，不证明 Android/iOS 真机、前后台恢复或长连接已验收。
- **Desktop `0.107.1` 有发布成功证据，但仍有证据债。** #513 允许在完整 CI/设备证据未齐时推进，#501 的安装/签名/路由守卫文档还未闭环。
- **Cloud Auth 出现一次可见部署回归后恢复。** 后续成功不代表过程无风险，建议保留失败 run 作为发布门禁的回归样本。
- **推断：**本周稳定性改善来自“把旧合同明确下线、把能力投影到授权目录、把观测绑定到当前 head”，但最后一公里仍是跨仓真实旅程，而不是单仓提交数量。

## 下周最重要的动作

1. 完成 [OPS-053](https://github.com/uichat-mira/cloud-auth/issues/213)：真实注册→OAuth→Mobile MCP discovery/list/call→Desktop↔Mobile，并保留 V0 负向证据。
2. 对 Mobile `0.5.1` 与 Desktop `0.107.1` 做签名产物、Android/iOS/macOS 真机和前后台/取消竞态验收；CI 绿灯不能代替 T4。
3. 完成 Desktop [#501](https://github.com/uichat-mira/mira-desktop/pull/501) 的 Node 26/三平台构建合同，并将缺失的路由守卫与签名证据纳入下一个发布门槛。
4. 将 Cloud Auth 失败部署 run 纳入发布演练；验证 `appName`、目录缓存和 V0 下线在真实环境仍保持一致。
5. 收束 Who You Owner 管理、Guanlan #28/#34 和 Docs #247；Relay 继续补正向握手/转发/重连耐久门禁后，再把“跨端可用”写进官网。
