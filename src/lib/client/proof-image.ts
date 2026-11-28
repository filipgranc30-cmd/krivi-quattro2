const ORIGINAL_LIMIT = 5 * 1024 * 1024;
const TARGET_BYTES = 250 * 1024;
const START_EDGE = 1280;

const HEIC_MESSAGE = "Ovaj preglednik ne može otvoriti HEIC. Spremi fotografiju kao JPEG ili odaberi drugu sliku.";

export async function prepareProofImage(file: File): Promise<Blob> {
  if (file.size > ORIGINAL_LIMIT) throw new Error("Slika je veća od 5 MB. Odaberi manju.");
  if (!looksLikeImage(file)) throw new Error("Datoteka mora biti slika.");
  let decoded: Decoded;
  try {
    decoded = await decodeImage(file);
  } catch (error) {
    if (isHeic(file)) throw new Error(HEIC_MESSAGE);
    throw error instanceof Error ? error : new Error("Sliku nisam mogao otvoriti.");
  }
  const { source } = decoded;
  const width = source instanceof HTMLImageElement ? source.naturalWidth : "width" in source ? Number(source.width) : 0;
  const height = source instanceof HTMLImageElement ? source.naturalHeight : "height" in source ? Number(source.height) : 0;
  if (!width || !height) {
    closeDecoded(decoded);
    throw new Error(isHeic(file) ? HEIC_MESSAGE : "Sliku nisam mogao otvoriti.");
  }
  try {
    let edge = START_EDGE;
    let quality = 0.82;
    let blob: Blob | null = null;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const scale = Math.min(1, edge / Math.max(width, height));
      const canvas = draw(source, Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
      blob = await toJpeg(canvas, quality);
      if (blob.size <= TARGET_BYTES) break;
      if (quality > 0.56) quality = Math.round((quality - 0.12) * 100) / 100;
      else edge = Math.round(edge * 0.75);
      if (edge < 640 && quality <= 0.56) break;
    }
    if (!blob || blob.size > 280 * 1024) throw new Error("Sliku nisam mogao dovoljno smanjiti.");
    return blob;
  } finally {
    closeDecoded(decoded);
  }
}

function looksLikeImage(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|gif|heic|heif|bmp)$/i.test(file.name);
}

function isHeic(file: File): boolean {
  return file.type === "image/heic" || file.type === "image/heif" || /\.heic$|\.heif$/i.test(file.name);
}

type Decoded = { source: CanvasImageSource; url?: string };

async function decodeImage(file: File): Promise<Decoded> {
  try {
    return { source: await createImageBitmap(file) };
  } catch {
    // HEIC and some camera files only decode through an image element, when the browser supports them.
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(isHeic(file) ? HEIC_MESSAGE : "Sliku nisam mogao otvoriti."));
      image.src = url;
    });
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
  return { source: image, url };
}

function draw(source: CanvasImageSource, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Sliku nisam mogao smanjiti.");
  context.drawImage(source, 0, 0, width, height);
  return canvas;
}

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Sliku nisam mogao smanjiti."))), "image/jpeg", quality);
  });
}

function closeDecoded(decoded: Decoded) {
  if ("close" in decoded.source && typeof decoded.source.close === "function") decoded.source.close();
  if (decoded.url) URL.revokeObjectURL(decoded.url);
}

export async function proofBlobBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}
