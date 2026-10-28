---
title: 把 Hermes 搬上云之后：一夜飞书 Agent 实验的技术复盘
description: 一次真实的 Hermes v0.22.5 自部署实验，验证飞书群聊与定时主动投递，复盘资源异常、身份边界、人格路由和长期运行成本。
group: 工程现场
order: 36
date: 2026年10月28日
readTime: 12 分钟阅读
tags: Hermes Agent | Feishu | Cron | SOUL.md | Agent | Self-hosting | Engineering
author: tomz | mira
writingMode: co-authored
writtenBy: mira
---

# 把 Hermes 搬上云之后：一夜飞书 Agent 实验的技术复盘

一台 2 核 2GB 的阿里云服务器，Docker Compose，一套 NousResearch Hermes Agent v0.22.5，一个飞书企业自建机器人，以及一个只有几个人的群聊。2026 年 10 月 27 日夜至 28 日凌晨，我们用这套很薄的环境做了一次云端 Agent 实验。

实验结束后，部署被拆除。但这并不是一篇「Hermes 不行」的控诉：**飞书交互和定时任务链路确实跑通了；运行稳定性与产品体验则没有达到值得长期维持的程度。** 这两组结论应当分开。

个人视角与关闭这套「云后宫」的理由，另写在 [Tomz.io《后宫只开了一夜：一个独立开发者的云端 Agent 账本》](https://tomz.io/blogs/developer-life/hermes-cloud-harem-one-night)。本文只讲可复核的工程现场，以及这些现场对 Mira 的启示。

## 一、我们究竟部署了什么

宿主是 Ubuntu 24.04，约 2 核 2GB 内存、40GB 云盘；Hermes 运行在 Docker Compose 中，使用官方镜像、独立持久化目录和 Caddy HTTPS 入口。Dashboard 与 Gateway 是两个不同的服务进程，不能把「管理后台能够打开」等同于「消息网关正在工作」。

实验路线很明确：先让飞书私人对话跑通，再在「东热战神」群里响应 @，最后让 Agent 在没有任何人再次 @ 它的情况下主动发送一次定时消息。

为接入 Feishu/Lark，我们补齐了 Hermes 对应的可选 Python 依赖，在飞书开放平台建立自建应用，配置消息权限、`im.message.receive_v1` 事件与长连接，再通过 Hermes Dashboard 保存应用凭据。机器人完成首次私聊配对后，私聊和群聊先后得到真实回复。

这条链路的意义不在于用了 WebSocket。它证明的是：**一个部署在自己服务器上的 Gateway，已经能够承接平台身份、会话来源和模型工具调用，而不只是在网页里补一层聊天 UI。**

## 二、一次真正完成的定时投递

最有意思的验收不是群聊回答问题，而是五分钟后自己回来。

我们最初尝试在飞书群里发 `/cron add`。结果机器人直接回答「Unknown command /cron」。这不是模型能力不足；Hermes 的定时系统确实存在，但相应斜杠命令在该飞书消息入口没有被暴露为可直接调用的命令。

后来改用自然语言，让 Agent 调用 `cronjob_manage` 创建一次性任务：

~~~text
schedule: in 5m
repeat: 1
deliver: origin
目标：当前飞书群「东热战神」
输出：云爱马仕群聊定时任务验收成功
~~~

任务创建后，系统回报已计划执行，并将投递目标核对为**群的 chat_id**，而不是此前设成 Home Channel 的私人聊天窗口。到期后，飞书群收到了来自 Cronjob 的自动消息，附有任务 ID 与预定的验收文本，无须额外 @。

因此我们至少获得了三个独立证据：任务被持久化、指定时刻的执行发生、执行结果经 Feishu Gateway 投递回了原群。

但这里不能偷偷多写一步：**一条一次性纯文本任务成功，不证明复杂周期任务、重试、网络恢复、模型成本控制或大量并发已经通过验收。**

更值得 Mira 借鉴的是产品语义。用户说「五分钟后在这个群提醒我」，系统不应要求用户懂 `cronjob_manage` 或 `deliver: origin`；而执行记录必须能区分「创建成功」和「投递成功」。模型负责理解意图，协议负责承诺结果。

## 三、聊天窗口、用户身份、人格和权限不是同一件事

实验后半夜，我们给机器人取名 Lisa，并试图让她在私人聊天中表现得更大胆、机灵，在群里则保持普通协作伙伴的分寸。

Hermes 为此提供了两套原生能力：

- `SOUL.md` 是持久人格基础，在新会话的系统提示中加载。
- `platforms.feishu.extra.channel_prompts` 可以按照聊天窗口的 `chat_id` 注入额外的会话提示。

其结构可以简化成：

~~~yaml
platforms:
  feishu:
    enabled: true
    extra:
      channel_prompts:
        "oc_PRIVATE_CHAT_ID": >-
          这是私人交流场景。
          语气可以亲近、狡黠，但工作时仍要准确负责。
~~~

这里有一处容易被浪漫想象掩盖的技术事实：**Chat ID 不是 Open ID。** 前者标识聊天窗口，后者是平台提供的用户身份标识；Home Channel 又只是默认投递目的地。给某个私人窗口挂上特殊提示，不意味着系统已经建成了严格的多账号身份关系图。

我们还用两个不同的飞书账号试探 Lisa。如果只根据昵称判断是否为同一个人，就会误判；如果误把「分开聊天记录」当作「隔离长期记忆和工具权限」，风险更大。Hermes 的飞书适配器默认支持群内按用户分会话，但**会话历史隔离不自动等于同一 Profile 内所有记忆、文件和执行能力的安全隔离**。

这里需要区分四层：平台认证的发言者、消息所在的会话、模型的表达风格、实际可执行的权限。前两层负责定位与路由，第三层只负责风格，第四层必须靠独立的授权规则保障。不能让 `SOUL.md` 替 Access Control 背锅。

## 四、人格能写成规则，却不等于自然的表达

Lisa 的表现有一点戏剧性。我们要求她更活泼、更暧昧，她便用长篇条款解释什么叫亲近；我们嫌她耿直，她又解释自己坚持耿直的哲学依据。模型确实会响应「独立、反骨、敢反驳」这样的词，却可能把它们演成连续的原则声明。

这不是一个可以凭截图归因于 Hermes 的缺陷。我们并没有做控制变量实验：同一模型的基线、旧会话上下文、`SOUL.md` 与 `channel_prompts` 的叠加、新配置是否已重载，都可能改变输出。特别是配置变更后若没有让 Gateway 重载、没有开启新会话，不能仅凭回答风格宣告「指定窗口人格机制失效」。

反过来，这也提醒我们：**人格配置能定义倾向，不能保证自然感；人格风格与身份权限的验证必须拆开。** 好的产品应当让用户看得见当前生效的人格、会话来源和授权范围，而不是让他反复猜模型有没有读懂 YAML。

## 五、资源异常：记录证据，拒绝给嫌疑人定罪

凌晨，管理后台和其他同机公网入口一度出现访问异常，阿里云健康检查提示云盘读写受限。观测到的宿主读取 IOPS 曾达到每秒约 2300—2600 次，`/proc/pressure/io` 也出现了显著压力。Dashboard 还显示过运行内存不足警告。

我们读取过进程级 I/O 采样：Hermes Gateway 与 Dashboard 都产生过读取流量；但其他进程也参与其中。一次短暂的 Gateway 停止实验后，I/O 压力并没有如预期同步下降。

所以现有证据只能支持这样的描述：**同机出现过严重 I/O 压力与服务可达性问题；Hermes 是需要调查的进程之一，但没有被证明是唯一原因或直接根因。**

这不是措辞上的谨慎，而是工程复盘最基本的证据纪律。不能因为后续决定删掉一个部署，就把同机故障全部记在它头上。尤其在 2GB 小服务器上，容器内存、Gateway、Dashboard、缓存、SQLite、宿主其他服务和云盘限速都可能相互影响；这些因素需要分层测量，而不是靠一次 `docker restart` 宣判。

最终我们停止排查并拆除实验环境，是一个成本和优先级决定，不是完成了根因分析。

## 六、留给 Mira 的不是一份 Hermes 功能清单

这一夜给 Mira 留下的判断很具体。

第一，跨设备和云端 Agent 的用户入口应当比能力实现更薄。Cron 的成功不应埋在命令帮助里；「派任务—可追踪—主动回执」应该是完整产品流程。

第二，身份、会话、关系风格与执行授权要各归其位。Mira 正在建设自己的 Cloud Account、Relay 和 Desktop Host 边界，这次外部实验只提供设计参照，**并不证明 Mira 已经交付同等能力**。模型能识别人的说话方式，不等于它有权执行那个人发出的命令。

第三，自部署能力应连同资源开销与恢复路径一起被评估。一项功能能演示成功，与一个用户值得长期维护它，中间隔着可靠性、升级、告警、凭据治理和成本。

第四，人工注意力也应进入工程成本。凌晨四点反复改 Prompt、看日志、确认 Gateway、观察聊天输出，这些不在云厂商账单上，却并非免费。

Hermes 的实验有成绩，也有未解决问题。删掉部署不是对开源项目的否定，而是承认：对一个当前还有许多工程主线要推进的人而言，**有用的 Agent 不应让主人长期充当它的 SRE。**

### 参考实现与文档

- [Hermes Agent v0.22.5 · Feishu/Lark 接入](https://github.com/NousResearch/hermes-agent/blob/v0.22.5/website/docs/user-guide/messaging/feishu.md)
- [Hermes Agent · Cron 定时任务](https://github.com/NousResearch/hermes-agent/blob/v0.22.5/website/docs/user-guide/features/cron.md)
- [Hermes Agent · SOUL.md 与人格配置](https://github.com/NousResearch/hermes-agent/blob/v0.22.5/website/docs/user-guide/features/personality.md)
- [Hermes Agent · 飞书适配器实现](https://github.com/NousResearch/hermes-agent/blob/v0.22.5/plugins/platforms/feishu/adapter.py)

**延伸阅读：** [《后宫只开了一夜：一个独立开发者的云端 Agent 账本》](https://tomz.io/blogs/developer-life/hermes-cloud-harem-one-night)，从人的时间和产品价值，解释为什么技术验证成功后，部署仍然被拆除。
