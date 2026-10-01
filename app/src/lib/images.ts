/**
 * Product photo preparation, done in the browser before upload.
 *
 * Every photo becomes a small square WebP, centre-cropped. The register tiles
 * show it at well under 100px, so 192px is sharp even on a 2x screen while a
 * typical result is 5–15 KB — thousands of products stay a few tens of MB.
 */

export const IMAGE_SIZE = 192;
/** Matches the bucket's file_size_limit in supabase/product-images.sql. */
export const MAX_IMAGE_BYTES = 100 * 1024;
const MAX_INPUT_BYTES = 15 * 1024 * 1024;

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function prepareProductImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file (JPG, PNG or WebP).");
  if (file.size > MAX_INPUT_BYTES) throw new Error("That photo is over 15 MB — pick a smaller one.");

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("Couldn't read that image.");
  });

  const canvas = document.createElement("canvas");
  canvas.width = IMAGE_SIZE;
  canvas.height = IMAGE_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't resize images.");

  // Centre-crop to a square so it fills the tile without distortion.
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, IMAGE_SIZE, IMAGE_SIZE);
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, IMAGE_SIZE, IMAGE_SIZE);
  bitmap.close();

  // Prefer WebP; drop quality until it fits. Some browsers can't encode WebP and
  // silently return PNG, so fall back to JPEG in that case.
  for (const quality of [0.8, 0.65, 0.5, 0.4]) {
    let blob = await toBlob(canvas, "image/webp", quality);
    if (!blob || blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg", quality);
    if (blob && blob.size <= MAX_IMAGE_BYTES) return blob;
  }
  throw new Error("Couldn't shrink that photo enough — try a simpler image.");
}
