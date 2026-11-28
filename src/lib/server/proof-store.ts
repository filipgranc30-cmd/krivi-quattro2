import { proofKey, PROOF_ID } from "../shared/proof";
import { redis } from "./redis";

export async function putProof(id: string, base64: string) {
  const saved = await redis(["SET", proofKey(id), base64]);
  if (saved !== "OK") throw new Error("Spremanje slike nije uspjelo.");
}

export async function getProof(id: string): Promise<string | null> {
  if (!PROOF_ID.test(id)) return null;
  const value = await redis(["GET", proofKey(id)]);
  return typeof value === "string" && value ? value : null;
}

export async function deleteProof(id: string) {
  if (!PROOF_ID.test(id)) return;
  await redis(["DEL", proofKey(id)]);
}
