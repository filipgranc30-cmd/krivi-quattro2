const KEY = "kq.blreceipt.v1";

function readMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

export function localReceiptUrl(id: string): string | null {
  const value = readMap()[id];
  return value && value.startsWith("data:image/jpeg") ? value : null;
}

export function saveLocalReceipt(id: string, dataUrl: string) {
  const map = readMap();
  map[id] = dataUrl;
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    throw new Error("Nema mjesta za račun na ovom uređaju.");
  }
}

export function deleteLocalReceipt(id: string) {
  const map = readMap();
  if (!(id in map)) return;
  delete map[id];
  localStorage.setItem(KEY, JSON.stringify(map));
}

export function pruneLocalReceipts(keep: Set<string>) {
  const map = readMap();
  let changed = false;
  for (const id of Object.keys(map)) {
    if (!keep.has(id)) {
      delete map[id];
      changed = true;
    }
  }
  if (changed) localStorage.setItem(KEY, JSON.stringify(map));
}

export function clearLocalReceipts() {
  localStorage.removeItem(KEY);
}
