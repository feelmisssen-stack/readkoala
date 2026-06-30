export const MEMORABLE_SCENE_MAX_BYTES = 500 * 1024;
export const MEMORABLE_SCENE_MAX_DIMENSION = 1600;

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("이미지를 줄이지 못했어요."));
      },
      type,
      quality
    );
  });
}

function fitDimensions(width: number, height: number, maxDimension: number) {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }
  const scale = maxDimension / Math.max(width, height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function toJpegFilename(name: string) {
  const base = name.replace(/\.[^.]+$/, "") || "memorable-scene";
  return `${base}.jpg`;
}

async function drawToCanvas(file: File, width: number, height: number) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("이미지를 줄이지 못했어요.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return canvas;
}

export async function compressImageForMemorableScene(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("그림 파일만 올릴 수 있어요.");
  }

  let width = MEMORABLE_SCENE_MAX_DIMENSION;
  let height = MEMORABLE_SCENE_MAX_DIMENSION;
  let quality = 0.82;
  let blob: Blob | null = null;

  const sourceBitmap = await createImageBitmap(file);
  const fitted = fitDimensions(
    sourceBitmap.width,
    sourceBitmap.height,
    MEMORABLE_SCENE_MAX_DIMENSION
  );
  sourceBitmap.close();
  width = fitted.width;
  height = fitted.height;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const canvas = await drawToCanvas(file, width, height);
    blob = await canvasToBlob(canvas, "image/jpeg", quality);

    if (blob.size <= MEMORABLE_SCENE_MAX_BYTES) {
      return new File([blob], toJpegFilename(file.name), {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
    }

    if (quality > 0.45) {
      quality -= 0.08;
      continue;
    }

    const next = fitDimensions(width, height, Math.round(Math.max(width, height) * 0.85));
    if (next.width === width && next.height === height) {
      break;
    }
    width = next.width;
    height = next.height;
    quality = 0.78;
  }

  if (!blob) {
    throw new Error("이미지를 줄이지 못했어요.");
  }

  if (blob.size > MEMORABLE_SCENE_MAX_BYTES) {
    throw new Error("그림이 너무 커요. 더 작은 그림으로 다시 시도해 주세요.");
  }

  return new File([blob], toJpegFilename(file.name), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}
