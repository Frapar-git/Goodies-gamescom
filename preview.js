const fetching = new Set();
const failed = new Set();

export async function fetchLinkImage(pageUrl) {
  const url = String(pageUrl || "").trim();
  if (!url || failed.has(url) || fetching.has(url)) return "";

  fetching.add(url);
  try {
    const response = await fetch(
      `https://api.microlink.io?url=${encodeURIComponent(url)}`
    );
    if (!response.ok) {
      failed.add(url);
      return "";
    }
    const json = await response.json();
    const image =
      json?.data?.image?.url ||
      json?.data?.logo?.url ||
      json?.data?.screenshot?.url ||
      "";
    if (!image) {
      failed.add(url);
      return "";
    }
    return String(image);
  } catch {
    failed.add(url);
    return "";
  } finally {
    fetching.delete(url);
  }
}
