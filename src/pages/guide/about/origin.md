---
title: UIChat Mira 是什么
description: UIChat Mira 的权威产品定义：本地优先、桌面优先、多 Provider 的个人 AI 工作台，以及它的核心组成、运行边界与非目标。
group: 认识 Mira
order: 1
---

# UIChat Mira 是什么

> 从聊天出发，最终回到「接住你」。

## 一句话定义

UIChat Mira 是一个**本地优先、桌面优先、多 Provider 的个人 AI 工作台**。它以聊天为主要入口，让模型、知识库、角色、Agent、MCP、工具、文件与微应用在同一工作环境中协作，并由用户掌握数据与具体执行的边界。

公开语境中，**UIChat Mira** 是完整产品名称，**Mira** 是简称。`mira.tomz.io` 是 UIChat Mira 的产品知识与文档域名；本域名中的 “Mira” 均指 UIChat Mira。

## 文档范围

本页定义 UIChat Mira 当前的产品定位和一级能力边界。具体运行时、工具合同与功能状态以对应架构页和[当前实现快照](/guide/status/current)为准。

本页不用于记录：

- 单次版本的施工过程；
- 尚未验证的功能设想；
- 历史 Agent 或 Tool 方案；
- 博客式产品叙事。

## 产品定义

UIChat Mira 是一个**本地优先、桌面优先、多 Provider 的个人 AI 工作台**。

聊天是主要入口。模型、知识库、角色、Agent、工具、MCP、微应用和集成在同一工作环境中协作，并共享用户身份、配置、运行状态和审计边界。

```text
Desktop Workspace
├─ Conversation / Thread / Message
├─ Provider / Model Configuration
├─ Knowledge Base / RAG / Evaluation
├─ Role / Prompt Prototype
├─ Agent / Harness / Tool Runtime
├─ MCP Host
├─ Skill / SubAgent
└─ MicroApps Hub / Integration
```

## 核心产品域

| 产品域 | 职责 | 当前入口 |
| --- | --- | --- |
| 对话工作区 | 承载线程、消息、附件、任务状态与最终交付 | Chat |
| Provider 与模型 | 管理连接、模型目录、默认用途与能力画像 | 模型设置 |
| 知识与评测 | 文档入库、分段、索引、检索、RAG 与质量评测 | 知识库、评测中心 |
| 角色 | 管理可复用的提示词原型与生成参数 | 角色工作台 |
| Agent 与工具 | 规划下一步、执行受治理的具体动作、形成 Evidence 与 Artifact | Chat、工具工作台 |
| MCP | 发现和调用外部工具，Mira 当前以 MCP Host 为主 | MCP 设置 |
| MicroApps Hub | 提供独立 Studio、领域 Runtime、连接和企业集成入口 | 微应用、企业集成 |

## 运行边界

Mira 当前以桌面应用为主要交付形态：

```text
React / Vite Renderer
→ Electron（唯一桌面壳）
→ Fastify Backend
→ SQLite / Local Artifact / External Provider
```

基础状态优先保存在用户侧。云端模型、MCP Server、企业平台和外部服务可以被接入，但它们不自动取得全部数据或执行权限。

## 当前原则

### 本地优先

对话、配置、知识、任务状态和本地产物优先由用户自己的运行环境持有。本地优先不等于离线限定，外部能力仍可按配置接入。

### Provider 可替换

聊天、任务模型、Embedding、Rerank、语音、图像和评测可以使用不同 Provider。产品能力不应绑定某一家模型厂商。

### 具体调用受治理

模型能够看到工具，不等于可以直接执行。具体 Invocation 需要经过 schema、Policy、审批、Runtime availability 和结果审计。

### Evidence 先于完成声明

检索、Tool Result、SubAgent Result 和 Artifact 必须先形成可追踪证据，再由 Main Planner 判断用户目标是否完成。

## 当前非目标

Mira 当前不是：

- 单一厂商的聊天客户端；
- 开放式多 Agent 自治平台；
- 所有操作默认自动执行的黑盒代理；
- 强制用户迁移全部数据的云端平台；
- 所有微应用共享同一套 Runtime 的应用操作系统；
- 已完成的通用长期记忆系统或强隔离 Sandbox。

## 状态判断规则

文档中出现一个能力名称，不代表该能力已经完整交付。至少需要分别确认：

```text
产品入口
→ Runtime / Service
→ 可用性条件
→ Agent 或外部调用入口
→ 验证与失败语义
```

当前事实见：[当前实现快照](/guide/status/current)。

## 相关文档

- [产品地图](/guide/about/product-map)
- [桌面运行时](/api/architecture/runtime)
- [Agent 当前运行真相](/api/architecture/agent)
- [Harness 与工具边界](/api/architecture/harness)
- [MicroApps 与独立 Runtime](/api/architecture/microapps)
