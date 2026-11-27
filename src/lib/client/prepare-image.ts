const MAX_BYTES = 4.5 * 1024 * 1024;

export async function prepareImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Datoteka mora biti slika.");
  if (file.size <= MAX_BYTES) return file;
  const bitmap = await createImageBitmap(file);
  const edge = Math.max(bitmap.width, bitmap.height);
  const scale = Math.min(1, 1800 / edge);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Sliku nisam mogao smanjiti.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let quality = 0.82;
  let blob = await toJpeg(canvas, quality);
  while (blob.size > MAX_BYTES && quality > 0.4) {
    quality -= 0.12;
    blob = await toJpeg(canvas, quality);
  }
  if (blob.size > MAX_BYTES) throw new Error("Slika je prevelika i nakon smanjenja.");
  return blob;
}

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Sliku nisam mogao smanjiti."))), "image/jpeg", quality);
  });
}
