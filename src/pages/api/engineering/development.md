---
title: 开发与验证
description: 安装、运行、测试和修改跨边界契约时的检查清单。
group: 工程
order: 16
---

# 开发与验证

Mira 使用 pnpm workspace。具体脚本应以 dev 分支 package.json 与各包 README 为准。

## 开始之前

使用仓库声明的 Node 与 pnpm 版本安装依赖。先阅读根目录 AGENTS.md 和目标 area map，确认改动属于 Renderer、Desktop Shell、Server 还是共享包。

## 本地运行

开发通常需要同时启动桌面 Renderer 与本地后端。涉及 Electron 时，还要验证 preload/IPC 边界和打包环境，而不只是在浏览器中确认页面。Tauri 已从开发主线退役。

## 按边界测试

- UI 改动检查路由、状态与可访问性。
- API 改动检查 schema、错误码和数据库迁移。
- Agent 改动检查每个节点的唯一职责与状态字段。
- Harness 改动分别测试 match、exposure、invocation、policy 和 evidence。
- Provider 改动至少验证能力降级与不可用状态。


## Agent Benchmark

Agent Core 的长期公开回归入口见 [Mira Agent Core Benchmark](/guide/benchmark)。正式题库和结果投影都固定到对应 Mira Desktop commit；官网不维护第二套评分合同。

## 文档也属于变更

如果公共行为、架构契约或配置发生变化，应同步 current contract 与用户文档。规划材料要标明状态，避免“想做”被搜索结果误读成“已经实现”。