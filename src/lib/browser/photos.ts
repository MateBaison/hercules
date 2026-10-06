export async function compressedPhoto(
  file: File,
  size = 1200,
): Promise<string> {
  if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024)
    throw new Error("Elegí una imagen menor a 8 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const ratio = Math.min(1, size / Math.max(image.width, image.height)),
      canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * ratio);
    canvas.height = Math.round(image.height * ratio);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo preparar la imagen.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.8);
  } finally {
    URL.revokeObjectURL(url);
  }
}
export function safePhoto(value: string | undefined): string | null {
  return value && /^data:image\/(jpeg|png|webp);base64,/.test(value)
    ? value
    : null;
}
