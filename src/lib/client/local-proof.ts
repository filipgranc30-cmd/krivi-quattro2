const KEY = "kq.hsproof.v1";

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

function writeMap(map: Record<string, string>) {
  localStorage.setItem(KEY, JSON.stringify(map));
}

export function localProofUrl(id: string): string | null {
  const value = readMap()[id];
  return value && value.startsWith("data:image/jpeg") ? value : null;
}

export function saveLocalProof(id: string, dataUrl: string) {
  const map = readMap();
  map[id] = dataUrl;
  try {
    writeMap(map);
  } catch {
    throw new Error("Nema mjesta za sliku na ovom uređaju.");
  }
}

export function deleteLocalProof(id: string) {
  const map = readMap();
  if (!(id in map)) return;
  delete map[id];
  try {
    writeMap(map);
  } catch {
    localStorage.removeItem(KEY);
  }
}

export function pruneLocalProofs(keep: Set<string>) {
  const map = readMap();
  let changed = false;
  for (const id of Object.keys(map)) {
    if (!keep.has(id)) {
      delete map[id];
      changed = true;
    }
  }
  if (changed) writeMap(map);
}

export function clearLocalProofs() {
  localStorage.removeItem(KEY);
}
