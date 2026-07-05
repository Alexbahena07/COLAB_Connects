export type PixelCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type CropResult = {
  blob: Blob;
  dataUrl: string;
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = src;
  });

export async function getCroppedImage(
  imageSrc: string,
  pixelCrop: PixelCrop,
  outputSize = 512,
  type: "image/jpeg" | "image/png" = "image/jpeg",
  quality = 0.92
): Promise<CropResult> {
  const image = await loadImage(imageSrc);

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize
  );

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (output) => (output ? resolve(output) : reject(new Error("Failed to export image"))),
      type,
      quality
    )
  );

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Failed to read image"));
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(blob);
  });

  return { blob, dataUrl };
}
