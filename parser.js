const HEADER_INLINE =
  /^(.+?)\s+[—–-]\s+(Today at \d{1,2}:\d{2}(?:\s?[AP]M)?|Yesterday at \d{1,2}:\d{2}(?:\s?[AP]M)?|\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}(?:\s+\d{1,2}:\d{2})?|\w+ \d{1,2},? \d{4} \d{1,2}:\d{2}(?:\s?[AP]M)?|[A-Za-zàâäéèêëïîôùûüç]+(?:\.?)\s+\d{1,2}:\d{2})$/i;

const HEADER_TIME_ONLY =
  /^(Today at \d{1,2}:\d{2}(?:\s?[AP]M)?|Yesterday at \d{1,2}:\d{2}(?:\s?[AP]M)?|Aujourd'hui à \d{1,2}:\d{2}|Hier à \d{1,2}:\d{2}|\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}(?:\s+\d{1,2}:\d{2})?|[A-Za-zàâäéèêëïîôùûüç]+(?:\.?)\s+\d{1,2}:\d{2})$/i;

function isProbablyHeader(line) {
  return HEADER_INLINE.test(line.trim()) || HEADER_TIME_ONLY.test(line.trim());
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
    const next = (lines[i + 1] || "").trim();

    if (!trimmed) {
      if (current.length) push();
      continue;
    }

    const inline = trimmed.match(HEADER_INLINE);
    if (inline) {
      if (current.length) push();
      current.push(trimmed);
      continue;
    }

    if (
      HEADER_TIME_ONLY.test(trimmed) &&
      current.length === 1 &&
      !isProbablyHeader(current[0])
    ) {
      current.push(trimmed);
      continue;
    }

    if (
      !current.length &&
      next &&
      HEADER_TIME_ONLY.test(next) &&
      !HEADER_INLINE.test(trimmed)
    ) {
      current.push(trimmed);
      continue;
    }

    if (
      current.length &&
      HEADER_TIME_ONLY.test(next) === false &&
      HEADER_INLINE.test(trimmed) === false &&
      i > 0 &&
      !lines[i - 1].trim() &&
      next &&
      HEADER_TIME_ONLY.test((lines[i + 2] || "").trim())
    ) {
      push();
      current.push(trimmed);
      continue;
    }

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

  const bodyParts = body.split("\n").filter((l) => l.trim());
  const title = bodyParts[0].slice(0, 120);
  const description = bodyParts.slice(1).join("\n").trim();

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
