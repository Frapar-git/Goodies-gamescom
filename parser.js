const HEADER_INLINE =
  /^(.+?)\s+[—–-]\s+(Today at \d{1,2}:\d{2}(?:\s?[AP]M)?|Yesterday at \d{1,2}:\d{2}(?:\s?[AP]M)?|Aujourd'hui à \d{1,2}:\d{2}|Hier à \d{1,2}:\d{2}|\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}(?:\s+\d{1,2}:\d{2})?|\w+ \d{1,2},? \d{4} \d{1,2}:\d{2}(?:\s?[AP]M)?|[A-Za-zàâäéèêëïîôùûüç]+(?:\.?)\s+\d{1,2}:\d{2})$/i;

const HEADER_TIME_ONLY =
  /^(Today at \d{1,2}:\d{2}(?:\s?[AP]M)?|Yesterday at \d{1,2}:\d{2}(?:\s?[AP]M)?|Aujourd'hui à \d{1,2}:\d{2}|Hier à \d{1,2}:\d{2}|\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}(?:\s+\d{1,2}:\d{2})?)$/i;

function isUrlLine(line) {
  return /^https?:\/\/\S+$/i.test(line.trim());
}

function looksLikeAuthorLine(line) {
  const trimmed = line.trim();
  if (!trimmed || isUrlLine(trimmed) || HEADER_TIME_ONLY.test(trimmed)) return false;
  if (trimmed.length > 80) return false;
  if (/^[#*>\-|]/.test(trimmed)) return false;
  return true;
}

function isNewMessageStart(lines, index) {
  const trimmed = (lines[index] || "").trim();
  if (!trimmed) return false;
  if (HEADER_INLINE.test(trimmed)) return true;

  const next = (lines[index + 1] || "").trim();
  return Boolean(next && looksLikeAuthorLine(trimmed) && HEADER_TIME_ONLY.test(next));
}

function splitBlocks(text) {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const lines = normalized.split("\n");
  const blocks = [];
  let current = [];

  const push = () => {
    const content = current.join("\n").trim();
    if (content) blocks.push(content);
    current = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();

    if (current.length && isNewMessageStart(lines, i)) {
      push();
    }

    if (!trimmed && !current.length) continue;

    current.push(line);
  }

  if (current.length) push();
  return blocks;
}

function parseBlock(block) {
  const lines = block.split("\n").map((l) => l.trimEnd());
  let author = "";
  let bodyLines = lines;

  const first = (lines[0] || "").trim();
  const inline = first.match(HEADER_INLINE);
  if (inline) {
    author = inline[1].trim();
    bodyLines = lines.slice(1);
  } else if (lines.length >= 2 && HEADER_TIME_ONLY.test((lines[1] || "").trim())) {
    author = first;
    bodyLines = lines.slice(2);
  }

  const body = bodyLines.join("\n").trim();
  if (!body) return null;

  const bodyParts = body.split("\n").map((l) => l.trim()).filter(Boolean);
  const titleSource = bodyParts.find((line) => !isUrlLine(line)) || bodyParts[0];
  const title = titleSource.slice(0, 120);
  const description = bodyParts.filter((line) => line !== titleSource).join("\n").trim();

  return {
    title,
    description: description || body,
    stand: "",
    author,
    raw: body,
  };
}

export function parseDiscordPaste(text) {
  const blocks = splitBlocks(text);
  const items = [];

  for (const block of blocks) {
    const parsed = parseBlock(block);
    if (parsed) items.push(parsed);
  }

  if (!items.length && text.trim()) {
    const fallback = parseBlock(text.trim());
    if (fallback) items.push(fallback);
  }

  return items;
}
