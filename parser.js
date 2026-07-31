const TIME_PART =
  "(?:Today at \\d{1,2}:\\d{2}(?:\\s?[AP]M)?|Yesterday at \\d{1,2}:\\d{2}(?:\\s?[AP]M)?|Aujourd'hui à \\d{1,2}:\\d{2}|Hier à \\d{1,2}:\\d{2}|\\d{1,2}[/.-]\\d{1,2}[/.-]\\d{2,4}(?:\\s+\\d{1,2}:\\d{2})?|\\w+ \\d{1,2},? \\d{4} \\d{1,2}:\\d{2}(?:\\s?[AP]M)?|[A-Za-zàâäéèêëïîôùûüç]+(?:\\.)?\\s+\\d{1,2}:\\d{2}|\\d{1,2}:\\d{2}(?:\\s?[AP]M)?)";

const HEADER_INLINE = new RegExp(`^(.+?)\\s+[—–-]\\s+(${TIME_PART})$`, "i");
const HEADER_TIME_ONLY = new RegExp(`^${TIME_PART}$`, "i");
const URL_RE = /https?:\/\/\S+/gi;

function isUrlLine(line) {
  return /^https?:\/\/\S+$/i.test(line.trim());
}

function looksLikeAuthorLine(line) {
  const trimmed = line.trim();
  if (!trimmed || isUrlLine(trimmed) || HEADER_TIME_ONLY.test(trimmed)) return false;
  if (trimmed.length > 80) return false;
  if (/^[#*>•\-|]/.test(trimmed)) return false;
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

function cleanAuthor(author) {
  return author.replace(/,\s*$/, "").replace(/\s+/g, " ").trim();
}

function extractUrls(text) {
  return [...text.matchAll(URL_RE)].map((match) => match[0]);
}

function buildTitle(bodyParts) {
  const firstContent = bodyParts.find((line) => !isUrlLine(line) && !/^•/.test(line));
  if (!firstContent) {
    return (bodyParts[0] || "Goodie").slice(0, 120);
  }

  const urls = extractUrls(firstContent);
  if (!urls.length) return firstContent.slice(0, 120);

  let remainder = firstContent;
  urls.forEach((url) => {
    remainder = remainder.replace(url, " ");
  });
  remainder = remainder.replace(/\s+/g, " ").trim();
  return (remainder || urls[0]).slice(0, 120);
}

function parseBlock(block) {
  const lines = block.split("\n").map((l) => l.trimEnd());
  let author = "";
  let bodyLines = lines;

  const first = (lines[0] || "").trim();
  const inline = first.match(HEADER_INLINE);
  if (inline) {
    author = cleanAuthor(inline[1]);
    bodyLines = lines.slice(1);
  } else if (lines.length >= 2 && HEADER_TIME_ONLY.test((lines[1] || "").trim())) {
    author = cleanAuthor(first);
    bodyLines = lines.slice(2);
  }

  const body = bodyLines.join("\n").trim();
  if (!body) return null;

  const bodyParts = body
    .split("\n")
    .map((l) => l.replace(/\t/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const title = buildTitle(bodyParts);
  const urls = extractUrls(body);
  const descriptionParts = bodyParts.filter((line) => {
    if (line === title) return false;
    const withoutUrls = line.replace(URL_RE, "").replace(/\s+/g, " ").trim();
    return withoutUrls !== title;
  });

  const uniqueDesc = [];
  for (const part of descriptionParts) {
    if (!uniqueDesc.includes(part)) uniqueDesc.push(part);
  }

  if (urls.length && !uniqueDesc.some((line) => line.includes(urls[0]))) {
    uniqueDesc.unshift(urls[0]);
  }

  return {
    title,
    description: uniqueDesc.join("\n").trim() || body,
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
