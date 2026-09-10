import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const statusPath = resolve(process.cwd(), "src/pages/docs/status/current.md");
const sourcePackagePath = resolve(
  process.cwd(),
  process.env.MIRA_SOURCE_PACKAGE || ".source/uichat-mira/package.json",
);
const sourceRoot = resolve(
  process.cwd(),
  process.env.MIRA_SOURCE_ROOT || ".source/uichat-mira",
);
const remoteSourcePackageUrl =
  "https://raw.githubusercontent.com/uichat-mira/mira-desktop/dev/package.json";
const maxAgeDays = Number(process.env.CURRENT_STATUS_MAX_AGE_DAYS || "14");
const strictEnvironment =
  process.env.CI === "true" ||
  process.env.GITHUB_ACTIONS === "true" ||
  process.env.CF_PAGES === "1";
const failures = [];
const warnings = [];

if (!existsSync(statusPath)) {
  failures.push("Current implementation page not found: " + statusPath);
}

let sourcePackage = null;
let sourceMode = "";

if (existsSync(sourcePackagePath)) {
  sourcePackage = JSON.parse(readFileSync(sourcePackagePath, "utf8"));
  sourceMode = "checked-out dev source";
} else {
  try {
    const response = await fetch(remoteSourcePackageUrl, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }
    sourcePackage = await response.json();
    sourceMode = "remote dev package";
    warnings.push(
      "Checked-out Mira dev source was unavailable; freshness used the public dev package.json.",
    );
  } catch (error) {
    const message =
      "Could not read Mira dev package from checkout or " +
      remoteSourcePackageUrl + ": " +
      (error instanceof Error ? error.message : String(error));
    if (strictEnvironment) {
      failures.push(message);
    } else {
      console.warn("Current status freshness warning: " + message);
      console.warn(
        "Current status freshness skipped outside CI. Set MIRA_SOURCE_PACKAGE for deterministic local verification.",
      );
      process.exit(0);
    }
  }
}

const raw = existsSync(statusPath) ? readFileSync(statusPath, "utf8") : "";
const frontmatterMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
if (raw && !frontmatterMatch) {
  failures.push("Current implementation page is missing frontmatter.");
}

const frontmatter = frontmatterMatch?.[1] || "";
const scalar = (key) => {
  const match = frontmatter.match(new RegExp("^" + key + ":\\s*(.+)$", "m"));
  if (!match) return "";
  return match[1].trim().replace(/^["']|["']$/g, "");
};

const sourceBranch = scalar("sourceBranch");
const sourceVersion = scalar("sourceVersion");
const sourceCommit = scalar("sourceCommit");
const verifiedAt = scalar("verifiedAt");
const actualVersion =
  sourcePackage && typeof sourcePackage.version === "string"
    ? sourcePackage.version.trim()
    : "";

if (sourceBranch !== "dev") {
  failures.push('sourceBranch must be dev, got "' + (sourceBranch || "<missing>") + '".');
}
if (!actualVersion) {
  failures.push("Mira dev package.json does not contain a valid version.");
} else if (sourceVersion !== actualVersion) {
  failures.push(
    "Current implementation version is stale: docs=" +
      (sourceVersion || "<missing>") + ", dev=" + actualVersion + ".",
  );
}

const verifiedMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(verifiedAt);
let verifiedDate = null;
if (!verifiedMatch) {
  failures.push('verifiedAt must use YYYY-MM-DD, got "' + (verifiedAt || "<missing>") + '".');
} else {
  const year = Number(verifiedMatch[1]);
  const month = Number(verifiedMatch[2]);
  const day = Number(verifiedMatch[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  const isRealCalendarDate =
    !Number.isNaN(candidate.getTime()) &&
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day;

  if (!isRealCalendarDate) {
    failures.push("verifiedAt is not a real calendar date: " + verifiedAt + ".");
  } else {
    verifiedDate = candidate;
    const ageDays = Math.floor((Date.now() - verifiedDate.getTime()) / 86400000);
    if (ageDays < -1) {
      failures.push("verifiedAt is in the future: " + verifiedAt + ".");
    } else if (ageDays > maxAgeDays) {
      failures.push(
        "Current implementation verification is " + ageDays +
          " days old; maximum allowed age is " + maxAgeDays + " days.",
      );
    }
  }
}

if (actualVersion && !raw.includes("当前根包版本为 \`" + actualVersion + "\`")) {
  failures.push("Current implementation body does not state root version " + actualVersion + ".");
}
if (verifiedMatch) {
  const zhDate =
    Number(verifiedMatch[1]) + " 年 " +
    Number(verifiedMatch[2]) + " 月 " +
    Number(verifiedMatch[3]) + " 日";
  if (!raw.includes(zhDate)) {
    failures.push("Current implementation body does not state verification date " + zhDate + ".");
  }
}

let actualCommit = "";
if (existsSync(sourceRoot)) {
  try {
    actualCommit = execFileSync("git", ["-C", sourceRoot, "rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    warnings.push("Could not resolve checked-out Mira dev commit; sourceCommit audit skipped.");
  }
}

if (sourceCommit && actualCommit && sourceCommit !== actualCommit) {
  warnings.push(
    "Mira dev advanced since the recorded audit commit: docs=" +
      sourceCommit.slice(0, 7) + ", dev=" + actualCommit.slice(0, 7) +
      ". Version and verification-age gates still decide freshness.",
  );
}

for (const warning of warnings) {
  console.warn("Current status freshness warning: " + warning);
}

if (failures.length > 0) {
  console.error("Current implementation freshness check failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log(
  "Current implementation freshness passed via " + sourceMode +
    ": dev version " + actualVersion + ", verified " + verifiedAt +
    ", max age " + maxAgeDays + " days.",
);
