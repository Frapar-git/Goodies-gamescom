import {
  extractStand,
  extractUrls,
  isImageUrl,
  pickPageAndImageUrls,
  shopFromUrl,
} from "./parser.js";

const STORAGE_KEY = "gamescom-goodies-v1";

export function normalizeGoodie(item) {
  const raw = item?.raw || item?.description || item?.title || "";
  const fromRaw = pickPageAndImageUrls(extractUrls(raw));
  const url = String(item?.url || fromRaw.url || "").trim();
  const image = String(
    item?.image || fromRaw.image || (url && isImageUrl(url) ? url : "") || ""
  ).trim();
  const shop = String(item?.shop || (url ? shopFromUrl(url) : "") || "").trim();
  const stand = String(item?.stand || extractStand(raw) || "").trim();

  return {
    id: item.id,
    title: item.title || "Goodie",
    description: item.description || "",
    url,
    image,
    shop,
    stand,
    author: item.author || "",
    raw: item.raw || `${item.title || ""}\n${item.description || ""}`.trim(),
    source: item.source || "manual",
    status: item.status || "pending",
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
  };
}

export function loadGoodies() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeGoodie);
  } catch {
    return [];
  }
}

export function saveGoodies(goodies) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goodies.map(normalizeGoodie)));
}

export function createId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `g_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function fingerprint(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function toCsv(goodies) {
  const headers = [
    "id",
    "title",
    "description",
    "url",
    "image",
    "shop",
    "stand",
    "author",
    "status",
    "source",
    "created_at",
    "updated_at",
  ];

  const escape = (value) => {
    const str = value == null ? "" : String(value);
    if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };

  const lines = [headers.join(",")];
  for (const item of goodies) {
    const g = normalizeGoodie(item);
    lines.push(
      [
        g.id,
        g.title,
        g.description,
        g.url,
        g.image,
        g.shop,
        g.stand,
        g.author,
        g.status,
        g.source,
        g.createdAt,
        g.updatedAt,
      ]
        .map(escape)
        .join(",")
    );
  }
  return lines.join("\r\n");
}
