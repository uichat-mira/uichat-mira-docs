---
title: 源码地图
description: dev 分支中桌面端、服务端、共享包与文档的职责。
group: 工程
order: 14
---

# 源码地图

UIChat Mira 使用 pnpm workspace 组织多个运行边界。阅读源码时，先按职责定位，再沿调用链深入。

## desktop

`desktop/` 包含 React/Vite Renderer、页面路由、聊天界面与设置；`electron/` 负责唯一桌面壳的 main/preload、窗口与生命周期。Tauri 实现已从 `dev` 删除。

## server

server 基于 Fastify，承载 API、数据库访问、Provider、知识、评测、Agent、工具、集成和微应用后端。路由注册表是了解产品能力的可靠入口。

## packages

共享包沉淀类型、契约和跨端能力。修改公共类型时，要同时核对 Renderer、桌面桥接与服务端消费者，避免局部编译通过但运行契约漂移。

## docs

docs 不只是说明书，还包含架构入口、area map、current contract、知识系统规范和工程任务记录。packages/docs-site 则负责源码文档索引。

## 推荐阅读顺序

先读项目 README 与当前文档目录，再看 architecture 与 area maps；确认 current contract 后，进入对应路由、类型、数据库表和实现文件。
