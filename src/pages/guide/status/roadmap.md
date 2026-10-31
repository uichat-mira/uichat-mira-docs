---
title: 下一段路
description: UIChat Mira 当前阶段的工程优先级、计划边界与完成判断。
group: 现状与方向
order: 18
---

# 下一段路

## 文档范围

本页记录从当前代码和已知缺陷出发的近期工程方向。

这里的内容属于计划和优先级，不代表已经交付。当前能力见：[当前实现快照](/guide/status/current)。

## 当前阶段

从 2026 年 8 月开始，Mira 进入**功能稳定迭代阶段**。

阶段目标：

```text
先确认已有能力真实可用
→ 修复合同漂移和失败路径
→ 建立回归保护
→ 再增加小步、可验证的新能力
```

当前不以扩大 Agent Graph、增加更多概念层或重做大型 UI 为主要目标。

## 优先级

| 优先级 | 方向 | 当前问题 | 完成判断 |
| --- | --- | --- | --- |
| P0 | Agent 恢复与终止语义 | recoverable recovery exhausted 与 settled C contract 不一致 | 恢复耗尽进入 guarded answer；terminal failure 保持 failed 且不 Generate |
| P0 | Exact Approval Identity | core matcher 尚未使用完整 `toolId + toolCallId + inputHash` | 参数或调用身份变化后不能复用旧批准 |
| P0 | 已有功能真实验收 | 页面存在不等于 Runtime Ready | 关键入口具备可重复 Smoke / E2E 与失败诊断 |
| P1 | Evidence 与 Artifact | 局部结果容易被提前解释为整体完成 | Evidence 来源清楚，Artifact 可访问，未完成项显式返回 |
| P1 | Tool / Skill 稳定性 | 动态工具、SubAgent 和私有 Runtime 边界仍需回归保护 | Public Surface、Exposure、Approval 和 Child 边界有稳定测试 |
| P1 | Provider 兼容与失败语义 | 多 Provider 协议差异可能被隐藏 | 连接、模型能力、请求失败和降级状态可诊断 |
| P1 | MicroApp 成熟度 | 产品入口、Definition、Runtime 和 Agent Access 容易混淆 | 每项能力有独立状态、验证和非目标说明 |
| P2 | 发布与迁移 | 桌面升级、备份和恢复仍需持续收稳 | 安装、升级、备份、迁移和回滚路径可验证 |
| P2 | 可观测与评测 | 优化缺少统一对照 | 固定数据集、Trace 和指标能够复现变化影响 |

## Agent 稳定工作

近期 Agent 工作聚焦：

- 修复已确认的终止合同漂移；
- 稳定 waiting approval 和 checkpoint resume；
- 减少 Planner 提前回答和局部 completed 误判；
- 验证 Skill-owned SubAgent 完成后不被 Main Planner 重做；
- 保护单层委派和禁止递归委派；
- 完善失败、Requirement、Evidence 和最终交付的一致性。

当前不主动重开：

- Agent V2；
- 通用 DAG Scheduler；
- 开放式多 Agent 编排；
- 并发 Tool Fan-out 主链；
- 长期记忆大系统。

## Tool 与 Harness 稳定工作

近期 Tool 工作聚焦：

- exact Invocation Identity；
- Public Surface 和 Runtime Registry 的一致性；
- `<=20` 全量暴露、`>20` 排名前 20 的回归保护；
- Workspace、Network、Approval 和 Artifact 的真实执行边界；
- GitHub、Mail、Browser、External Expert 和 External MCP 的动态可用性；
- Tool Result 到 Evidence 的稳定投影。

不通过增加正则或隐藏工具来替代 Schema、Availability 和 Policy。

## MicroApp 稳定工作

每项 MicroApp 或 Studio 单独推进：

1. 产品入口可用；
2. Runtime / Provider 状态可检测；
3. Task / Job 状态明确；
4. 失败可诊断；
5. Artifact 可验证；
6. Agent 或 Integration 接入有明确合同；
7. Smoke / E2E 可重复。

不会为了“统一”而强行把所有 Studio 塞进 strict MicroAppDefinition Invoke。

## Provider 与模型

近期方向：

- 保持多 Provider 和 OpenAI-compatible 基础路径；
- 明确火山等非标准协议的独立适配；
- 完善 Chat、Task、Embedding、Rerank、Voice 和 Image 能力画像；
- 不把连接存在解释为所有模型能力均可用；
- 改善同步、超时、限流和错误归一化。

## 知识与评测

近期方向：

- 保护文档解析、Chunk、索引和检索链；
- 使用真实问题和固定数据集验证变化；
- 让 Evaluation 覆盖 Provider、知识、Prompt 和 Agent 改动；
- 区分检索命中、回答质量和业务正确性；
- 保留来源、版本和运行参数。

## 桌面交付

持续完善：

- Electron 单一桌面壳的安装、升级与跨平台发布验证（Tauri 已从 `dev` 退役）；
- 安装包和更新；
- SQLite Migration；
- 本地 Runtime 与资源打包；
- Artifact 清理；
- 数据备份与迁移；
- Windows 平台诊断；
- Web 独立运行边界。

## 进入 Current 的条件

计划能力只有同时满足以下条件，才进入当前实现文档：

- 有真实产品入口；
- 有明确 Runtime 和状态持有者；
- 有失败语义；
- 有代码锚点；
- 有重复验证或回归测试；
- 文档明确已实现和未实现部分；
- 不依赖施工线程口头结论。

## 相关文档

- [当前实现快照](/guide/status/current)
- [Agent 当前运行真相](/api/architecture/agent)
- [Harness 与工具边界](/api/architecture/harness)
- [MicroApps 与独立 Runtime](/api/architecture/microapps)
- [开发与验证](/api/engineering/development)
