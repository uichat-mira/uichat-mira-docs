import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const mobilePath = resolve(process.cwd(), "dist/mobile/index.html");

if (!existsSync(mobilePath)) {
  console.error(`Mira Mobile static output missing: ${mobilePath}`);
  process.exit(1);
}

const html = readFileSync(mobilePath, "utf8");
const sectionCount = (html.match(/class="mobile-product-section"/g) || []).length;
const leakedMarkup =
  html.includes("&lt;section class=&quot;mobile-product-section&quot;&gt;") ||
  html.includes("&lt;section class=\"mobile-product-section\"&gt;");

const failures = [];

if (sectionCount !== 4) {
  failures.push(`expected 4 rendered mobile-product-section elements, found ${sectionCount}`);
}

if (leakedMarkup) {
  failures.push("escaped Mira Mobile section markup leaked into the rendered page");
}

if (!html.includes("同一个 Mira，两条进入方式。")) {
  failures.push("Mira Mobile dual-entry section content is missing");
}

if (failures.length) {
  console.error("Mira Mobile static output check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Mira Mobile static output passed: product sections render as HTML instead of source code.");
