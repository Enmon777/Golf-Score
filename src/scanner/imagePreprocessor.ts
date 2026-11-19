export type Crop = { left: number; right: number; top: number; bottom: number };
export const fullImage: Crop = { left: 0, right: 0, top: 0, bottom: 0 };
export async function preprocessImage(
  file: Blob,
  rotation: number,
  crop: Crop,
  enhance = true,
  outputType = "image/png",
) {
  const image = await createImageBitmap(file).catch(() => {
    throw new Error(
      "Could not open this image. Try a JPEG, PNG, or WebP photo.",
    );
  });
  try {
    if (crop.left + crop.right >= 90 || crop.top + crop.bottom >= 90)
      throw new Error("Increase the crop area.");
    const scale = Math.min(1, 2400 / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    const sideways = rotation % 180 !== 0;
    canvas.width = sideways ? height : width;
    canvas.height = sideways ? width : height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Image preprocessing is unavailable.");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    if (enhance) ctx.filter = "grayscale(1) contrast(1.4)";
    ctx.drawImage(image, -width / 2, -height / 2, width, height);
    const output = document.createElement("canvas");
    const x = Math.floor((canvas.width * crop.left) / 100);
    const y = Math.floor((canvas.height * crop.top) / 100);
    output.width = Math.max(
      1,
      Math.floor((canvas.width * (100 - crop.left - crop.right)) / 100),
    );
    output.height = Math.max(
      1,
      Math.floor((canvas.height * (100 - crop.top - crop.bottom)) / 100),
    );
    const outputContext = output.getContext("2d");
    if (!outputContext) throw new Error("Image cropping is unavailable.");
    outputContext.drawImage(
      canvas,
      x,
      y,
      output.width,
      output.height,
      0,
      0,
      output.width,
      output.height,
    );
    return await new Promise<Blob>((resolve, reject) =>
      output.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("Image conversion failed.")),
        outputType,
        0.93,
      ),
    );
  } finally {
    image.close();
  }
}
