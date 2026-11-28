import { proofBlobBase64 } from "./proof-image";
import { deleteLocalProof, saveLocalProof } from "./local-proof";
import type { Action } from "../shared/types";

type Mode = "local" | "shared";
type Act = (action: Action) => Promise<string | null>;

export async function saveHighScoreProof(mode: Mode, id: string, blob: Blob, act: Act): Promise<string | null> {
  if (mode === "local") {
    const dataUrl = `data:image/jpeg;base64,${await proofBlobBase64(blob)}`;
    try {
      saveLocalProof(id, dataUrl);
    } catch (error) {
      return error instanceof Error ? error.message : "Nema mjesta za sliku na ovom uređaju.";
    }
    const message = await act({ op: "setGameProof", id, hasProof: true });
    if (message) deleteLocalProof(id);
    return message;
  }
  const image = await proofBlobBase64(blob);
  const response = await fetch("/api/training/proof", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, image }),
  });
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) return body?.error || "Slika nije spremljena.";
  return null;
}

export async function deleteHighScoreProof(mode: Mode, id: string, act: Act): Promise<string | null> {
  if (mode === "local") {
    const message = await act({ op: "setGameProof", id, hasProof: false });
    if (!message) deleteLocalProof(id);
    return message;
  }
  const response = await fetch("/api/training/proof", {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) return body?.error || "Dokaz nije obrisan.";
  return null;
}
