---
title: 项目与维护者
description: UIChat Mira 的项目归属、维护责任、AI 协作方式与公开仓库入口。
group: 认识 Mira
order: 2
author: tomz
writingMode: authored
writtenBy: mira
reviewedBy: tomz
---

# 项目与维护者

## 文档范围

本页说明 UIChat Mira 的项目归属、维护责任和公开协作边界。它不记录私人联系方式、生活信息或与项目无关的个人资料。

## 项目维护者

UIChat Mira 由 **Tomz Dang** 发起并持续维护。

| 角色 | 责任 |
| --- | --- |
| 产品作者 | 确定产品定位、能力优先级和用户体验边界 |
| 工程维护者 | 维护主仓库、运行时合同、发布路径和回归要求 |
| 最终验收者 | 决定实现是否满足目标，批准合并与发布 |
| 文档负责人 | 确认 current truth、计划与历史资料没有混淆 |

## AI 协作角色

Mira 作为 AI 协作者参与：

- 资料检索与方案比较；
- 代码施工和测试补充；
- Pull Request 审查与问题归纳；
- 工程文档和公开文章草拟；
- 已有合同与当前实现的交叉核对。

AI 协作不转移以下责任：

- 产品方向的最终决定；
- 高风险修改的批准；
- 代码合并与发布判断；
- 公开内容的真实性与隐私边界。

## 工程治理方式

Mira 是长期维护的个人工程，不以聊天记录或单次施工线程作为唯一真相源。

当前工程使用以下治理方式：

1. 重要能力先定义范围和不变量；
2. 代码修改通过分支、PR、测试和审查进入主线；
3. 当前事实、施工记录、方案和历史归档分开维护；
4. Agent、Tool、Skill 和 MicroApp 等关键域使用 current-contract 或 current-snapshot；
5. AI 可以执行工作，但不能绕过审批、验证和最终验收。

## 公开仓库

- 项目源码：[`uichat-mira/mira-desktop`](https://github.com/uichat-mira/mira-desktop)
- 公共文档站：[`uichat-mira/uichat-mira-docs`](https://github.com/uichat-mira/uichat-mira-docs)
- MiraDocs 核心：[`dangjingtao/mira-docs`](https://github.com/dangjingtao/mira-docs)
- 作者 GitHub：[`dangjingtao`](https://github.com/dangjingtao)
- 站点：[`tomz.io`](https://tomz.io)

## 内容署名

文档或文章可能包含以下字段：

| 字段 | 含义 |
| --- | --- |
| `author` | 对外署名 |
| `writtenBy` | 初稿主要生成者 |
| `reviewedBy` | 最终审核者 |
| `writingMode` | authored、co-authored 等协作方式 |

署名用于说明内容责任和协作过程，不表示 AI 拥有仓库权限或发布决定权。

## 隐私边界

以下信息不属于项目文档：

- 私人联系方式；
- 家庭、健康或财务信息；
- 对话中偶然出现但未明确公开的个人资料；
- 与项目无关的身份推断。

公开文档只保留理解和使用 UIChat Mira 所必需的项目信息。
