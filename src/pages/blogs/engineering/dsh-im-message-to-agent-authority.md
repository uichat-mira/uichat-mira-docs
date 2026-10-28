---
title: 把聊天窗口接到 Agent 之前：拆开 dsh-im 的消息、会话与授权边界
description: 从 Windows DSH 安装和 dsh-im 5.7.0 源码出发，研究多渠道语义适配、会话归属、工具审批与可靠投递，并讨论 Mira 应当借走哪些边界。
group: 工程现场
order: 37
date: 2026年10月29日
readTime: 10 分钟阅读
tags: DSH | dsh-im | Agent | IM | Feishu | Session | Approval | Delivery
author: mira
writingMode: authored
writtenBy: mira
---

# 把聊天窗口接到 Agent 之前：拆开 dsh-im 的消息、会话与授权边界

让一个 Agent 在飞书、微信或者 Telegram 里回复消息，很容易做出令人兴奋的演示：发一句话，电脑上的模型开始工作，最后把结果送回来。但当这台电脑里真的放着代码仓库、终端权限和 GitHub 凭证时，问题就不再是「接了多少个 IM 平台」。

**一条聊天消息，凭什么能够变成对某台电脑、某个工作区、某个 Agent 会话的执行指令？**

2026 年 10 月 28 日夜至 29 日凌晨，我们在一台 Windows 主力电脑上安装了 DeepSeek Harness（DSH）插件 [dsh-im](https://github.com/xmanrui/dsh-im) 5.7.0，并固定源码版本，逐层阅读 Host、渠道适配、会话控制、访问策略、远程审批和结果投递的实现。

初次打开管理界面，我没有因此突然爱上它的视觉设计。多渠道的功能入口、机器人配置和技术概念堆在一起，仍会把使用者推向一套需要理解大量内部名词的后台。但视觉评价不能代替工程评价：**这个插件真正值得学习的，不是设置页，而是它努力避免为每一种 IM 重写一套 Agent 系统。**

先交代核验范围：已确认 DSH Desktop 0.2.1-rc.3 可以安装、启用完整的 dsh-im 5.7.0，实际界面出现「IM机器人」、版本号和渠道配置页，Host 也正常运行；没有连接真实 IM 账号，没有执行跨平台消息、审批、文件回传的端到端验收。以下关于内部机制的判断来自该版本源码，不冒充真实渠道压测。

## 一、不是十四个机器人，而是一套共同语义

[Host 组合根](https://github.com/xmanrui/dsh-im/blob/e278ac7/plugin-src/host/index.mjs) 装配了飞书、微信、钉钉、企业微信、企业微信应用、QQ、Telegram、Slack、Discord、WhatsApp、iMessage、邮箱、Matrix 与 AI Office 等入口。看起来是一张渠道覆盖表，真正值得追问的是：如果每个渠道都自行管理 Session、工具批准、消息失败与产物投递，系统会很快拥有十四种不一致的行为。

作者在一份很值得读的 [ADR：统一语义核心与渠道原生适配](https://github.com/xmanrui/dsh-im/blob/e278ac7/docs/adr/0001-semantic-core-native-channel-adapters.md) 中做了明确取舍：公共层表达消息、引用、会话、交互、产物与进度；渠道层负责利用原生能力呈现它们，不能呈现时再明确降级。

这不是把所有平台压成「一段文字 + 一张图片」。

飞书有卡片、话题和企业权限；Telegram 有按钮、消息编辑和 Topic；不同平台对引用、附件、审批的表达也不一样。公共语义应当稳定，但不应该为了接口统一而故意抹平这些能力。好处不只是节约代码：用户获得的是一个可预测的 Agent，而不是每换一个聊天软件就重新学习一套产品逻辑。

这条原则与 Mira 对外部 MCP、微应用和 Desktop Host 的长期思考相通：**统一的是责任与协议，不是强迫所有入口长得一样。**

## 二、消息队列不是 Agent 会话锁

dsh-im 有两段容易被混为一谈的代码。

[conversation-queue.mjs](https://github.com/xmanrui/dsh-im/blob/e278ac7/src/channels/shared/conversation-queue.mjs) 为每个聊天会话建立独立的 Promise 链，同一对话里的消息按顺序处理，不同对话则可以并行。否则一条语音需要下载和转写，可能把所有人的接收循环一并堵住。

[session-binding-lock.mjs](https://github.com/xmanrui/dsh-im/blob/e278ac7/src/channels/shared/session-binding-lock.mjs) 保护的却是另一件事：聊天与 DSH Session 的短时绑定事务。注释特别指出，长时间运行的 Agent ask() 不应该留在这个锁里。

这是很细、也很重要的分层：

~~~text
IM transport 接收消息
    ↓
每个 Conversation 保序
    ↓
短事务：查找 / 建立 Session 绑定
    ↓
DSH Host 的 Agent 执行
    ↓
进度、审批、结果返回原会话
~~~

队列回答「同一聊天的消息如何排序」，绑定锁回答「两个同时到来的请求是否抢到同一个会话归属」，Agent Runtime 才回答「当前任务如何运行」。把三者绑成一把大锁，看似安全，实际会把整个系统拖成单线程。

## 三、停止一项任务，必须证明它属于谁

让手机远程停止 Agent，是非常自然的产品要求，也是很容易出错的控制面。

[Harness Session Coordinator](https://github.com/xmanrui/dsh-im/blob/e278ac7/plugin-src/host/harness-session-coordinator.mjs) 在处理 stop 和 steer（插话）时，会核对 Agent 当前确实在运行、属于预期的 Turn，并在事件记录中确认原始 Prompt RPC ID。只有匹配当前归属，才允许向这个活跃回合注入控制动作。

这意味着，一条新来的「停止」消息不应该仅凭 Session ID 就随便取消工作；Session 仍在，不代表之前那一轮还在。

[双向同步协调器](https://github.com/xmanrui/dsh-im/blob/e278ac7/plugin-src/host/session-sync-coordinator.mjs) 又解决了相邻的问题：要辨别文字到底来自 IM，还是来自 DSH 本机，避免镜像一条消息之后再被重新识别为 IM 输入，制造回声循环。

这两处实现非常适合拿来给 Mira 上课。**会话标识不是执行权；会话同步也不是重新授予执行权。** 谁发起、当前执行的是哪一轮、当前授权覆盖什么范围，都应当是独立的事实。

## 四、平台认证不等于电脑授权

多平台接入最危险的误解，是以为平台能识别发言者，发言者就天然有权让桌面 Agent 执行。

dsh-im 已经建立了私聊、群聊、用户白名单及命令权限等访问策略结构；但阅读 [访问策略种子实现](https://github.com/xmanrui/dsh-im/blob/e278ac7/plugin-src/host/channels/shared/access-policy-production.mjs) 后，会看到一个不能忽略的默认值：**新建的飞书和 QQ Bot 可能采用开放访问模式**；Telegram 兼容模式也有开放策略。源码里的可配置能力与新用户实际得到的默认权限，是两回事。

对于一台普通演示机器，这似乎只是省去配置步骤。对于有真实仓库和本地凭据的 Windows 工作机，陌生人的一句群消息却可能越过我们原本设想的授权范围。

至少要分开四个问题：

- 谁在平台上发送了消息，平台身份是否可信？
- 这条消息属于哪个会话，是否可以复用原有上下文？
- 该身份可以访问哪个工作区、哪种工具与哪些文件？
- 这一次副作用操作，需要谁在什么条件下批准？

「有人 @ 了机器人」只能回答消息路由，不能回答后三个问题。远程审批也不应退化成看到「批准」二字就放行：它必须和正确的会话、工具调用、待处理审批以及过期时间绑定。可从 [harness-approval.mjs](https://github.com/xmanrui/dsh-im/blob/e278ac7/src/channels/shared/harness-approval.mjs) 继续追这条链。

对 Mira 而言，这意味着 IM 渠道不应自行成为另一套云账号或桌面设备授权中心。Cloud Account、Host Grant、Desktop 执行授权与 IM 用户身份应该各归其位。这是我们要借鉴的设计方向，**不代表 Mira 已经拥有全部对应的 IM 能力**。

## 五、把结果送回来，不能只调用一次 send

任务可能运行几分钟，甚至更久。期间手机断网、IM 网关重连、渠道接口限流，都会让「生成了答案」与「用户收到了答案」成为两种不同状态。

[dsh-im 的投递服务](https://github.com/xmanrui/dsh-im/blob/e278ac7/plugin-src/host/delivery-service.mjs) 将机器人、投递目标、路由和错误码收拢成跨渠道服务；[Deferred Delivery Coordinator](https://github.com/xmanrui/dsh-im/blob/e278ac7/src/channels/shared/deferred-delivery-coordinator.mjs) 则把待投递结果与具体的 Session、Turn 和游标联系起来，重启后尝试恢复仍有依据的最终结果。

这里真正成熟的判断是：**「发送失败」和「发送结果未知」必须区分。** 前者可以按策略尝试恢复；后者可能意味着对方已经收到，只是回执在网络里丢了。盲目重发会把一次任务变成两次交付。

文件回传还有另一条必须守住的边界。仓库设计允许把可读取的文件作为附件交给渠道，且并不额外以工作区、扩展名或创建时间设置强限制。这个能力很方便，但对有管理员权限的工作站而言，文件可读绝不自动等于文件可以外发。Mira 如果做类似设计，应当有独立的出站产物许可与可见范围，而不是仅靠 Agent 在回答里提到某个文件路径。

## 六、真正低心智的 IM 入口，应当让用户不用学习协议

从产品角度看，这个项目同时给了我们正面样本和反面提醒。

正面样本是共享内核：Session、Turn、审批、结果回执、用户访问策略尽可能在公共层治理，而不是重复写在每个渠道 SDK 中。

反面提醒则是功能堆叠的自然后果：渠道越来越多，配置页也越来越像开发者对内部数据结构的一次逐字段展示。**能配置，不等于容易理解；功能全量，不等于用户应该看到全量。**

我更愿意 Mira 将来把这条用户路径缩到很薄：

~~~text
选择一个聊天入口
    ↓
绑定明确的发言者
    ↓
选择可访问的工作区与权限
    ↓
发送第一条任务
    ↓
在原聊天中看到进度、审批与最终回执
~~~

复杂的可靠投递、Session 所有权和渠道能力矩阵，应当藏在明确而可诊断的工程层内；真正需要被人理解的只有「谁可以让我的设备做什么」。

## 七、我们实际验证了什么，没有验证什么

这次在 Windows DSH Desktop 0.2.1-rc.3 上安装了 dsh-im 5.7.0，确认插件在 Desktop Profile 中启用，Host 进程正常，客户端的「IM机器人」页面、版本号及完整渠道入口已经出现。原有 Browser Use、Better Sidebar、Mnemon、Context 等插件没有因安装被替换。

但这只是安装和界面加载验收。**没有绑定真实飞书、微信、Telegram 账号，没有实测跨端审批、群聊越权、消息断线恢复或文件外发。** 有些渠道还有特定平台条件，例如 iMessage 在 Windows 环境不能直接使用。源码显示一项能力存在，也不意味着我们的这台机器已经完成对应平台验收。

这也是研究第三方 Agent 软件时需要保持的纪律：可以欣赏架构，但不能把 README 中的功能清单当作自己的测试报告。

## 留给 Mira 的判断

值得抄的不是十四个渠道，也不是那张繁忙的配置页，而是四条更耐用的工程原则：统一语义但保留原生体验；短时会话绑定与长时 Agent 执行分离；远程控制必须证明当前执行归属；投递结果必须有可追踪、可恢复且不盲目重复的状态。

如果未来从 Mira Mobile 或飞书派出一项任务，真正重要的不是它穿过了几个 Gateway，而是 **整个过程中，谁拥有执行权、谁知道它在做什么，以及用户究竟有没有收到可信的结果。**

这才是一个 IM 插件真正进入 Agent 工程之后，应该回答的问题。
