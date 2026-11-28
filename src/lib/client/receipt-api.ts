import { deleteLocalReceipt, saveLocalReceipt } from "./local-receipt";
import { proofBlobBase64 } from "./proof-image";
import type { Action } from "../shared/types";

type Mode = "local" | "shared";
type Act = (action: Action) => Promise<string | null>;

export async function saveLedgerReceipt(mode: Mode, id: string, blob: Blob, act: Act): Promise<string | null> {
  if (mode === "local") {
    try {
      saveLocalReceipt(id, `data:image/jpeg;base64,${await proofBlobBase64(blob)}`);
    } catch (error) {
      return error instanceof Error ? error.message : "Nema mjesta za račun na ovom uređaju.";
    }
    const message = await act({ op: "setLedgerReceipt", id, hasReceipt: true });
    if (message) deleteLocalReceipt(id);
    return message;
  }
  const response = await fetch("/api/blagajna/receipt", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, image: await proofBlobBase64(blob) }),
  });
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) return body?.error || "Račun nije spremljen.";
  return null;
}
