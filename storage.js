const STORAGE_KEY = "gamescom-goodies-v1";

export function loadGoodies() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGoodies(goodies) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goodies));
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
    lines.push(
      [
        item.id,
        item.title,
        item.description,
        item.stand,
        item.author,
        item.status,
        item.source,
        item.createdAt,
        item.updatedAt,
      ]
        .map(escape)
        .join(",")
    );
  }
  return lines.join("\r\n");
}
