export function zapisnikPath(eventUrl: string | null | undefined): string | null {
  if (!eventUrl) return null;
  const path = eventUrl.startsWith("http") ? safePath(eventUrl) : eventUrl;
  const match = path.match(/^\/event\/([A-Za-z0-9]+)\/?$/);
  if (!match) return null;
  return `/utakmica/${match[1]}`;
}

export function zapisnikSource(id: string): string {
  return `https://psgz.hr/event/${id}`;
}

function safePath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return "";
  }
}
