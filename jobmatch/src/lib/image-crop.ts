export type CropState = {
  offsetX: number;
  offsetY: number;
  zoom: number;
  cropSize: number;
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
  crop: CropState,
  outputSize = 512,
  type: "image/jpeg" | "image/png" = "image/jpeg",
  quality = 0.92
): Promise<CropResult> {
  const image = await loadImage(imageSrc);
  const { cropSize, offsetX, offsetY, zoom } = crop;

  const baseScale = Math.max(cropSize / image.width, cropSize / image.height);
  const scale = baseScale * zoom;
  const displayWidth = image.width * scale;
  const displayHeight = image.height * scale;

  const imageLeft = cropSize / 2 - displayWidth / 2 + offsetX;
  const imageTop = cropSize / 2 - displayHeight / 2 + offsetY;

  const sx = Math.max(0, (-imageLeft / scale));
  const sy = Math.max(0, (-imageTop / scale));
  const sWidth = Math.min(image.width - sx, cropSize / scale);
  const sHeight = Math.min(image.height - sy, cropSize / scale);

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas not supported");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, outputSize, outputSize);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (output) => {
        if (!output) {
          reject(new Error("Failed to export image"));
          return;
        }
        resolve(output);
      },
      type,
      quality
    );
  });

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read image"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(blob);
  });

  return { blob, dataUrl };
}
