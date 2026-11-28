import { PROOF_ID } from "../shared/proof";
import { redis } from "./redis";

export function receiptKey(id: string): string {
  if (!PROOF_ID.test(id)) throw new Error("Nepoznat unos.");
  return `bl:receipt:${id}`;
}

export async function putReceipt(id: string, base64: string) {
  const saved = await redis(["SET", receiptKey(id), base64]);
  if (saved !== "OK") throw new Error("Spremanje računa nije uspjelo.");
}

export async function getReceipt(id: string): Promise<string | null> {
  if (!PROOF_ID.test(id)) return null;
  const value = await redis(["GET", receiptKey(id)]);
  return typeof value === "string" && value ? value : null;
}

export async function deleteReceipt(id: string) {
  if (!PROOF_ID.test(id)) return;
  await redis(["DEL", receiptKey(id)]);
}
