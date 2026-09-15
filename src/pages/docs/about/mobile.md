---
title: Mira Mobile
description: 随身使用 Mira：直接连接自己的模型，或连接桌面端 Mira。
group: 认识 Mira
order: 4
path: /mobile
type: page
---

<style>
.docs-app:has(.mobile-product-landing) .docs-mobile-bar,
.docs-app:has(.mobile-product-landing) .docnav,
.docs-app:has(.mobile-product-landing) .toc {
  display: none;
}
.docs-app:has(.mobile-product-landing) .docs-shell {
  display: block;
  width: 100%;
  max-width: none;
  padding: 0;
}
.docs-app:has(.mobile-product-landing) .doc-main {
  width: 100%;
  max-width: none;
  padding: 0;
}
.doc-main:has(.mobile-product-landing) > .doc-eyebrow,
.doc-main:has(.mobile-product-landing) > .doc-title-block {
  display: none;
}
.doc-main:has(.mobile-product-landing) .markdown {
  width: 100%;
  max-width: none;
  padding: 0;
}
.mobile-product-landing {
  --mobile-accent: var(--primary, #c15f3c);
  color: var(--ink);
  background: var(--canvas);
}
.mobile-product-landing * {
  box-sizing: border-box;
}
.mobile-product-wrap {
  width: min(1120px, calc(100% - 40px));
  margin: 0 auto;
}
.mobile-product-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(300px, .9fr);
  gap: 64px;
  align-items: center;
  min-height: 660px;
  padding: 72px 0 80px;
}
.mobile-product-kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  font: 600 12px/1.2 var(--font-mono);
  letter-spacing: .08em;
  color: var(--mobile-accent);
}
.mobile-product-kicker::before {
  content: "";
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--mobile-accent);
  box-shadow: 0 0 0 5px color-mix(in srgb, var(--mobile-accent) 14%, transparent);
}
.mobile-product-title {
  max-width: 720px;
  margin: 0;
  font: 500 clamp(48px, 7vw, 84px)/.98 var(--font-display);
  letter-spacing: -.055em;
}
.mobile-product-lede {
  max-width: 690px;
  margin: 28px 0 0;
  color: var(--muted);
  font: 400 clamp(17px, 2vw, 20px)/1.75 var(--font-sans);
}
.mobile-product-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 34px;
}
.mobile-product-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 18px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-md, 10px);
  color: var(--ink) !important;
  background: var(--surface-card);
  font: 600 14px/1 var(--font-sans);
  text-decoration: none !important;
}
.mobile-product-action.primary {
  border-color: var(--mobile-accent);
  color: #fff !important;
  background: var(--mobile-accent);
}
.mobile-product-note {
  margin-top: 14px;
  color: var(--muted-soft, var(--muted));
  font: 400 12px/1.6 var(--font-sans);
}
.mobile-phone-stage {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 520px;
}
.mobile-phone-orbit {
  position: absolute;
  inset: 8% 0;
  border: 1px solid color-mix(in srgb, var(--mobile-accent) 34%, var(--hairline));
  border-radius: 50%;
  transform: rotate(-13deg);
}
.mobile-phone-orbit::after {
  content: "";
  position: absolute;
  inset: 18%;
  border: 1px solid var(--hairline);
  border-radius: 50%;
  transform: rotate(31deg);
}
.mobile-phone {
  position: relative;
  z-index: 1;
  width: min(270px, 72vw);
  aspect-ratio: 9 / 19;
  padding: 10px;
  border: 1px solid color-mix(in srgb, var(--ink) 22%, var(--hairline));
  border-radius: 38px;
  background: color-mix(in srgb, var(--surface-card) 88%, var(--canvas));
  box-shadow: 0 28px 80px color-mix(in srgb, var(--ink) 13%, transparent);
}
.mobile-phone-screen {
  height: 100%;
  padding: 58px 18px 20px;
  border-radius: 29px;
  background: var(--canvas);
  overflow: hidden;
}
.mobile-phone-screen::before {
  content: "";
  position: absolute;
  top: 20px;
  left: 50%;
  width: 72px;
  height: 20px;
  border-radius: 999px;
  background: var(--ink);
  transform: translateX(-50%);
  opacity: .88;
}
.mobile-phone-brand {
  margin-bottom: 38px;
  font: 600 14px/1 var(--font-display);
}
.mobile-phone-bubble {
  margin: 0 0 12px;
  padding: 12px 13px;
  border: 1px solid var(--hairline);
  border-radius: 15px;
  background: var(--surface-card);
  color: var(--muted);
  font: 400 12px/1.55 var(--font-sans);
}
.mobile-phone-bubble.me {
  margin-left: 28px;
  color: var(--ink);
  background: color-mix(in srgb, var(--mobile-accent) 12%, var(--surface-card));
}
.mobile-phone-status {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 34px;
  color: var(--muted);
  font: 500 11px/1.4 var(--font-mono);
}
.mobile-phone-status::before {
  content: "";
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #4da66b;
}
.mobile-product-section {
  padding: 92px 0;
  border-top: 1px solid var(--hairline);
}
.mobile-product-section-head {
  display: grid;
  grid-template-columns: .75fr 1.25fr;
  gap: 48px;
  margin-bottom: 44px;
}
.mobile-product-section-head span {
  color: var(--mobile-accent);
  font: 600 12px/1.4 var(--font-mono);
  letter-spacing: .07em;
}
.mobile-product-section-head h2 {
  margin: 0;
  font: 500 clamp(32px, 4vw, 52px)/1.08 var(--font-display);
  letter-spacing: -.035em;
}
.mobile-path-grid,
.mobile-fact-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.mobile-path-card,
.mobile-fact-card {
  margin: 0;
  padding: 30px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-lg, 16px);
  background: var(--surface-card);
}
.mobile-path-index {
  display: inline-block;
  margin-bottom: 46px;
  color: var(--mobile-accent);
  font: 600 12px/1 var(--font-mono);
}
.mobile-path-card h3,
.mobile-fact-card h3 {
  margin: 0 0 12px;
  font: 500 24px/1.2 var(--font-display);
}
.mobile-path-card p,
.mobile-fact-card p {
  margin: 0;
  color: var(--muted);
  font: 400 15px/1.7 var(--font-sans);
}
.mobile-path-line {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 28px;
  color: var(--muted);
  font: 500 12px/1.4 var(--font-mono);
}
.mobile-path-line b {
  color: var(--ink);
  font-weight: 600;
}
.mobile-path-line i {
  flex: 1;
  height: 1px;
  background: var(--hairline);
}
.mobile-fact-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.mobile-fact-card {
  padding: 24px;
}
.mobile-fact-card h3 {
  font-size: 18px;
}
.mobile-product-principle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 70px;
  align-items: start;
}
.mobile-product-principle h2 {
  margin: 0;
  font: 500 clamp(36px, 5vw, 62px)/1.02 var(--font-display);
  letter-spacing: -.045em;
}
.mobile-product-principle div > p {
  margin: 0 0 18px;
  color: var(--muted);
  font: 400 17px/1.8 var(--font-sans);
}
.mobile-download-panel {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 36px;
  align-items: center;
  padding: 36px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-lg, 16px);
  background: var(--surface-card);
}
.mobile-download-panel h2 {
  margin: 0 0 8px;
  font: 500 30px/1.2 var(--font-display);
}
.mobile-download-panel p {
  margin: 0;
  color: var(--muted);
  font: 400 14px/1.65 var(--font-sans);
}
.mobile-download-buttons {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}
@media (max-width: 820px) {
  .mobile-product-wrap { width: min(100% - 28px, 680px); }
  .mobile-product-hero { grid-template-columns: 1fr; gap: 32px; padding: 54px 0 64px; }
  .mobile-phone-stage { min-height: 430px; }
  .mobile-product-section { padding: 68px 0; }
  .mobile-product-section-head,
  .mobile-product-principle { grid-template-columns: 1fr; gap: 22px; }
  .mobile-path-grid { grid-template-columns: 1fr; }
  .mobile-fact-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .mobile-download-panel { grid-template-columns: 1fr; }
  .mobile-download-buttons { justify-content: flex-start; }
}
@media (max-width: 520px) {
  .mobile-product-title { font-size: 48px; }
  .mobile-fact-grid { grid-template-columns: 1fr; }
  .mobile-path-card { padding: 24px; }
}
</style>

<div class="mobile-product-landing">
  <div class="mobile-product-wrap">
    <section class="mobile-product-hero">
      <div>
        <span class="mobile-product-kicker">MIRA MOBILE · PREVIEW</span>
        <h1 class="mobile-product-title">Mira，跟你一起出门。</h1>
        <p class="mobile-product-lede">在手机上直接使用自己的模型，也可以连接桌面端 Mira，把更重的能力留在电脑。Mobile 不是 Desktop 的缩小版，而是一个更贴身的入口。</p>
        <div class="mobile-product-actions">
          <a class="mobile-product-action primary" href="https://assets.tomz.io/mira/mobile/dev/latest/uichat-mira-mobile-release.apk">下载 Android</a>
          <a class="mobile-product-action" href="https://assets.tomz.io/mira/mobile/dev/latest/uichat-mira-mobile-ios-unsigned-device.ipa">iOS 测试包</a>
          <a class="mobile-product-action" href="https://github.com/uichat-mira/mira-mobile">查看源码 ↗</a>
        </div>
        <p class="mobile-product-note">Android 为已签名 dev APK；iOS 当前提供未签名真机 IPA，需要自行签名或侧载。</p>
      </div>
      <div class="mobile-phone-stage" aria-hidden="true">
        <div class="mobile-phone-orbit"></div>
        <div class="mobile-phone">
          <div class="mobile-phone-screen">
            <div class="mobile-phone-brand">Mira</div>
            <div class="mobile-phone-bubble me">今晚回去继续刚才那段对话。</div>
            <div class="mobile-phone-bubble">可以。你可以直接在手机上继续，也可以连接桌面 Mira，让电脑承接更重的工作。</div>
            <div class="mobile-phone-status">DESKTOP HOST CONNECTED</div>
          </div>
        </div>
      </div>
    </section>

    <section class="mobile-product-section">
      <div class="mobile-product-section-head">
        <span>DUAL ENTRY / 双链路</span>
        <h2>同一个 Mira，两条进入方式。</h2>
      </div>
      <div class="mobile-path-grid">
        <article class="mobile-path-card">
          <span class="mobile-path-index">01 · LOCAL</span>
          <h3>直接使用自己的模型</h3>
          <p>在手机端配置兼容的 Provider 与凭据，由 Mobile 自己的 Agent Runtime 完成对话。离开桌面端，它仍然是一条独立可用的链路。</p>
          <div class="mobile-path-line"><b>PHONE</b><i></i><span>PROVIDER / API</span></div>
        </article>
        <article class="mobile-path-card">
          <span class="mobile-path-index">02 · REMOTE</span>
          <h3>连接你的桌面 Mira</h3>
          <p>与 Desktop Host 配对后，从手机发起和继续远程会话。需要本地环境与更重能力时，让电脑留在它最擅长的位置。</p>
          <div class="mobile-path-line"><b>PHONE</b><i></i><span>DESKTOP HOST</span></div>
        </article>
      </div>
    </section>

    <section class="mobile-product-section">
      <div class="mobile-product-section-head">
        <span>CURRENT / 现在已经有的</span>
        <h2>不画饼，只写已经跑起来的部分。</h2>
      </div>
      <div class="mobile-fact-grid">
        <article class="mobile-fact-card"><h3>自配 Provider</h3><p>在手机端保存自己的模型服务配置与凭据。</p></article>
        <article class="mobile-fact-card"><h3>本地 Agent Runtime</h3><p>手机端已有独立的 Provider Runtime 与 Agent Loop。</p></article>
        <article class="mobile-fact-card"><h3>远程配对</h3><p>连接 Desktop Host，在移动端进入远程会话链路。</p></article>
        <article class="mobile-fact-card"><h3>双平台构建</h3><p>Android 提供签名 APK；iOS 提供未签名真机测试 IPA。</p></article>
      </div>
    </section>

    <section class="mobile-product-section">
      <div class="mobile-product-principle">
        <h2>不是把 Desktop 塞进一块更小的屏幕。</h2>
        <div>
          <p>手机更适合发起、继续、查看和确认。文件、终端以及依赖桌面环境的重能力，不必为了“功能齐全”强行搬进 Mobile。</p>
          <p>这也是双链路存在的意义：需要轻的时候，手机可以自己完成；需要重的时候，它知道桌面 Mira 还在那里。</p>
        </div>
      </div>
    </section>

    <section class="mobile-product-section">
      <div class="mobile-download-panel">
        <div>
          <h2>Mobile 仍在 Preview。</h2>
          <p>可以用，也还在快速变化。Android 是目前更直接的体验入口；iOS 真机包仍属于测试分发。</p>
        </div>
        <div class="mobile-download-buttons">
          <a class="mobile-product-action primary" href="https://assets.tomz.io/mira/mobile/dev/latest/uichat-mira-mobile-release.apk">Android APK</a>
          <a class="mobile-product-action" href="https://assets.tomz.io/mira/mobile/dev/latest/uichat-mira-mobile-ios-unsigned-device.ipa">iOS IPA</a>
        </div>
      </div>
    </section>
  </div>
</div>
