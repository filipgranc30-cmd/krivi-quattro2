/** High score photo proofs. The image is not part of the game row. */
export const PROOF_ID = /^[A-Za-z0-9_-]{8,64}$/;
export const PROOF_MAX_STORED = 280 * 1024;

export function proofKey(id: string): string {
  if (!PROOF_ID.test(id)) throw new Error("Nepoznat rezultat.");
  return `hs:proof:${id}`;
}

export function decodeProofJpeg(image: string): Uint8Array | null {
  const raw = image.replace(/^data:image\/jpeg;base64,/i, "").replace(/\s/g, "");
  if (!raw || raw.length > 400_000) return null;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) return null;
  let bytes: Uint8Array;
  try {
    const binary = atob(raw);
    bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  } catch {
    return null;
  }
  if (bytes.length < 4 || bytes.length > PROOF_MAX_STORED) return null;
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return null;
  return bytes;
}

export function encodeProofJpeg(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}
