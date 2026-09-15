import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const mobilePath = resolve(process.cwd(), "dist/mobile/index.html");

if (!existsSync(mobilePath)) {
  console.error(`Mira Mobile 静态页缺失: ${mobilePath}`);
  process.exit(1);
}

const html = readFileSync(mobilePath, "utf8");
const failures = [];

if (!html.includes('class="mobile-product-landing"')) {
  failures.push("缺少 Mira Mobile landing 容器");
}

if (!html.includes('class="mobile-product-section"')) {
  failures.push("Mobile 产品区块没有作为 HTML 渲染");
}

if (/<pre><code[\s\S]*?mobile-product-section/i.test(html)) {
  failures.push("Mobile 产品区块被 Markdown 渲染成代码块");
}

if (/&lt;section[\s\S]{0,240}?mobile-product-section/i.test(html)) {
  failures.push("Mobile 产品区块以转义 HTML 泄漏到页面");
}

if (failures.length) {
  console.error("Mira Mobile 静态页面检查失败：");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Mira Mobile static rendering passed: product sections render as HTML, not code.");
