import {
  extractHeadings,
  type FolioDoc,
  type FolioHeading,
} from "@uichat-mira/folio";
import folioContent, {
  roots as folioRoots,
} from "virtual:folio/content";
import {
  mobileLandingMeta,
  mobileLandingSearchText,
} from "./mobile-landing";

export type AuthorKey = "tomz" | "mira";
export type WritingMode = "authored" | "co-authored";

export const pageDirectories = folioRoots;

export function slug(value: string): string {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/[\s/]+/g, "-")
    .replace(/[^\w\u4e00-\u9fff-]/g, "")
    .toLowerCase();
}

export type Doc = Omit<FolioDoc, "body" | "headings" | "path"> & {
  path: string;
  readTime?: string;
  source: string;
  root: string;
  directory: string;
  nav?: string;
  merge?: string;
  mergeIndex?: boolean;
  author?: AuthorKey[];
  writingMode?: WritingMode;
  writtenBy?: AuthorKey;
  reviewedBy?: AuthorKey;
  commitUrl?: string;
  headings: { text: string; id: string }[];
};

function dataString(data: Record<string, unknown>, key: string): string | undefined {
  const value = data[key];
  if (Array.isArray(value)) return value.length ? String(value[0]) : undefined;
  if (value == null || value === "") return undefined;
  return String(value);
}

function dataList(data: Record<string, unknown>, key: string): string[] {
  const value = data[key];
  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean);
  }
  if (typeof value !== "string" || !value.trim()) return [];
  return value
    .split(/[|,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeAuthorKey(value?: string): AuthorKey | undefined {
  const lowered = value?.trim().toLowerCase();
  return lowered === "tomz" || lowered === "mira" ? lowered : undefined;
}

function inferDocAuthors(
  path: string,
  group: string,
  data: Record<string, unknown>,
): Pick<
  Doc,
  "author" | "writingMode" | "writtenBy" | "reviewedBy" | "commitUrl"
> {
  const explicitAuthors = dataList(data, "author")
    .map((item) => normalizeAuthorKey(item))
    .filter(Boolean) as AuthorKey[];
  const explicitWritingMode = dataString(data, "writingMode");
  const explicitWrittenBy = normalizeAuthorKey(dataString(data, "writtenBy"));
  const explicitReviewedBy = normalizeAuthorKey(dataString(data, "reviewedBy"));
  const commitUrl = dataString(data, "commitUrl");

  if (explicitAuthors.length) {
    return {
      author: explicitAuthors,
      writingMode:
        explicitWritingMode === "co-authored" ? "co-authored" : "authored",
      writtenBy: explicitWrittenBy,
      reviewedBy: explicitReviewedBy,
      commitUrl,
    };
  }

  if (group === "Mira 来信") {
    return {
      author: ["mira"],
      writingMode: "authored",
      writtenBy: "mira",
      reviewedBy: "tomz",
      commitUrl,
    };
  }

  if (group === "共同思考") {
    return {
      author: ["tomz", "mira"],
      writingMode: "co-authored",
      writtenBy: "mira",
      reviewedBy: "tomz",
      commitUrl,
    };
  }

  return {
    author: ["tomz"],
    writingMode: "authored",
    writtenBy: path.includes("/mira-letters/") ? "mira" : "tomz",
    reviewedBy: path.includes("/mira-letters/") ? "tomz" : undefined,
    commitUrl,
  };
}

function legacyLevelTwoHeadings(source: string): Doc["headings"] {
  const headings: FolioHeading[] = extractHeadings(source);
  const seen = new Set<string>();
  return headings
    .filter((heading: FolioHeading) => heading.depth === 2)
    .filter((heading: FolioHeading) => {
      const id = slug(heading.text);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .map((heading: FolioHeading) => ({
      text: heading.text,
      id: slug(heading.text),
    }));
}

function adaptSiteDoc(core: FolioDoc): Doc {
  const root = core.sourcePath.split("/")[0] || "docs";
  const prefix = `${root}/`;
  const relativePath = (
    core.sourcePath.startsWith(prefix)
      ? core.sourcePath.slice(prefix.length)
      : core.sourcePath
  ).replace(/\.md$/i, "");
  const segments = relativePath.split("/");
  const group = core.group || "文档";
  const authorInfo = inferDocAuthors(core.path, group, core.data);

  return {
    ...core,
    path: core.path,
    title: dataString(core.data, "title") || core.title || core.path,
    description: core.description || "",
    group,
    order: core.order,
    date: core.date,
    readTime:
      dataString(core.data, "readTime") ||
      dataString(core.data, "readtime") ||
      dataString(core.data, "read_time"),
    tags: core.tags,
    cover: core.cover || dataString(core.data, "image"),
    source: core.body,
    root,
    directory: segments.slice(0, -1).join("/"),
    nav: dataString(core.data, "nav"),
    merge: dataString(core.data, "merge"),
    mergeIndex: dataString(core.data, "mergeIndex") === "true",
    ...authorInfo,
    headings: legacyLevelTwoHeadings(core.body),
  };
}

export function compareDocs(a: Doc, b: Doc): number {
  return (
    a.order - b.order ||
    a.directory.localeCompare(b.directory) ||
    a.path.localeCompare(b.path)
  );
}

function parseChineseDate(value?: string): number {
  if (!value) return 0;
  const match = value.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (!match) return 0;
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
}

export function compareBlogDocs(a: Doc, b: Doc): number {
  return (
    parseChineseDate(b.date) - parseChineseDate(a.date) ||
    b.order - a.order ||
    a.path.localeCompare(b.path)
  );
}

const specialDocs = [
  {
    path: mobileLandingMeta.path,
    title: mobileLandingMeta.title,
    description: mobileLandingMeta.description,
    group: mobileLandingMeta.group,
    order: mobileLandingMeta.order,
    sourcePath: "guide/about/mobile",
    data: {},
    date: undefined,
    tags: ["Mobile", "Android", "iOS"],
    cover: "/images/product/mira-hero-desktop-mobile.svg",
    source: mobileLandingSearchText,
    root: mobileLandingMeta.root,
    directory: mobileLandingMeta.directory,
    nav: undefined,
    merge: undefined,
    mergeIndex: false,
    author: ["tomz"],
    writingMode: "authored",
    writtenBy: "tomz",
    reviewedBy: undefined,
    commitUrl: undefined,
    headings: [],
  } as unknown as Doc,
];

const parsedDocs = [
  ...(folioContent as FolioDoc[]).map(adaptSiteDoc),
  ...specialDocs,
];

export const allDocs = parsedDocs
  .filter((doc) => !doc.merge || doc.mergeIndex)
  .map((doc) => {
    if (!doc.merge) return doc;
    const mergedSource = parsedDocs
      .filter((section) => section.merge === doc.merge)
      .sort(compareDocs)
      .map((section) => section.source)
      .join("\n\n");
    return {
      ...doc,
      source: mergedSource,
      headings: legacyLevelTwoHeadings(mergedSource),
    };
  })
  .sort(compareDocs);
