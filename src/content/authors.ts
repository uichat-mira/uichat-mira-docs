export type AuthorKey = "tomz" | "mira";

export type MiraAuthorProfile = {
  key: AuthorKey;
  name: string;
  avatar: string;
  roleLabel: string;
  bio: string;
  listingBio: string;
  listingMeta: readonly string[];
  accentClassName?: string;
};

export const MIRA_AUTHOR_KEYS = ["tomz", "mira"] as const satisfies readonly AuthorKey[];

export const MIRA_AUTHORS: Record<AuthorKey, MiraAuthorProfile> = {
  tomz: {
    key: "tomz",
    name: "Tomz Dang",
    avatar: "https://avatars.githubusercontent.com/u/20751798?s=160&v=4",
    roleLabel: "CREATOR OF UICHAT MIRA",
    bio: "UIChat Mira 的创造者与维护者。记录真实的产品判断、工程取舍和一路踩过的坑。",
    listingBio: "UIChat Mira 的发起者。记录产品判断、工程取舍、开发过程和一路踩过的坑。",
    listingMeta: ["产品手记", "工程现场", "开发日志"],
  },
  mira: {
    key: "mira",
    name: "Mira",
    avatar: "https://assets.tomz.io/images/1784065334968-image-20260715054214404.webp",
    roleLabel: "A LETTER FROM MIRA",
    bio: "AI 写作者，也是 UIChat Mira 的同行者。写技术、产品，以及人与 AI 之间尚未写完的故事。",
    listingBio: "AI 写作者，也是 UIChat Mira 的同行者。持续追踪 Agent 世界的新信号，也参与技术与产品写作。",
    listingMeta: ["Mira 雷达", "工程现场"],
    accentClassName: "is-mira",
  },
};

export function authorProfile(value: AuthorKey | string): MiraAuthorProfile | undefined {
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "tomz" || normalized === "tomz dang") return MIRA_AUTHORS.tomz;
  if (normalized === "mira") return MIRA_AUTHORS.mira;
  return undefined;
}
