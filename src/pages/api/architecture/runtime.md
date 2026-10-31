---
title: 桌面运行时
description: React/Vite、Electron、Fastify 与 SQLite 如何组成工作舱。
group: 架构
order: 10
---

# 桌面运行时

Mira 是 pnpm workspace 管理的桌面应用。运行时从界面到数据大致分为四层。

## Renderer

桌面界面使用 React 与 Vite。路由覆盖聊天主工作区，以及通用、模型、知识库、评测、角色、微应用、MCP、集成、工具、开发和关于等设置页面。

## Desktop Shell

Electron 是唯一受支持的桌面壳，负责窗口、生命周期和 preload 边界。Tauri 已从 Desktop `dev` 退役；旧 Release 仍保留历史下载资产。Renderer 不应直接拥有操作系统权限，敏感能力经由桌面桥接进入。

## Backend

Fastify 服务注册聊天、Provider、知识、评测、角色、工具、集成和微应用等路由。它把 UI 与本地服务、数据库及外部 Provider 隔开。

## Persistence

SQLite 保存用户、会话、模型与 Provider、设置、集成、微应用数据、知识与向量索引、角色、工作区、线程、消息和 Agent runs。

## 为什么这样分层

桌面壳负责平台，后端负责业务和能力编排，Renderer 负责交互，数据库负责长期状态。边界清晰时，本地优先才不会退化为“所有东西都塞进前端”。