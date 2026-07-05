import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const STAGES_DIR = path.join(process.cwd(), "public", "images", "koala-stages");

/** 가장자리·크림색 배경 — 코알라 털(회색과 맞닿은 흰색)은 건드리지 않음 */
function isBackgroundColor(r, g, b, a) {
  if (a < 8) return true;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const spread = max - min;
  return max >= 200 && spread <= 32;
}

function pixelIndex(x, y, width, channels) {
  return (y * width + x) * channels;
}

function visitIndex(x, y, width) {
  return y * width + x;
}

function floodRemoveBackground(data, width, height, channels) {
  const visited = new Uint8Array(width * height);
  const queue = [];

  for (let x = 0; x < width; x += 1) {
    for (const y of [0, height - 1]) {
      const i = pixelIndex(x, y, width, channels);
      if (isBackgroundColor(data[i], data[i + 1], data[i + 2], data[i + 3])) {
        queue.push([x, y]);
      }
    }
  }

  for (let y = 0; y < height; y += 1) {
    for (const x of [0, width - 1]) {
      const i = pixelIndex(x, y, width, channels);
      if (isBackgroundColor(data[i], data[i + 1], data[i + 2], data[i + 3])) {
        queue.push([x, y]);
      }
    }
  }

  while (queue.length > 0) {
    const [x, y] = queue.pop();
    const vi = visitIndex(x, y, width);
    if (visited[vi]) continue;
    visited[vi] = 1;

    const i = pixelIndex(x, y, width, channels);
    if (!isBackgroundColor(data[i], data[i + 1], data[i + 2], data[i + 3])) continue;

    data[i + 3] = 0;

    if (x > 0) queue.push([x - 1, y]);
    if (x < width - 1) queue.push([x + 1, y]);
    if (y > 0) queue.push([x, y - 1]);
    if (y < height - 1) queue.push([x, y + 1]);
  }
}

/** 투명 영역과 맞닿은 흰색 테두리(헤일로) 제거 — 여러 번 반복 */
function erodeWhiteHalos(data, width, height, channels, passes = 6) {
  const alphaAt = (x, y) => data[pixelIndex(x, y, width, channels) + 3];

  for (let pass = 0; pass < passes; pass += 1) {
    const toClear = [];

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = pixelIndex(x, y, width, channels);
        const a = data[i + 3];
        if (a < 8) continue;

        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const max = Math.max(r, g, b);
        const spread = max - Math.min(r, g, b);
        if (max < 210 || spread > 28) continue;

        let transparentNeighbors = 0;
        for (const [nx, ny] of [
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
          [x, y + 1],
        ]) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
            transparentNeighbors += 1;
            continue;
          }
          if (alphaAt(nx, ny) < 8) transparentNeighbors += 1;
        }

        if (transparentNeighbors >= 1) {
          toClear.push([x, y]);
        }
      }
    }

    if (toClear.length === 0) break;

    for (const [x, y] of toClear) {
      data[pixelIndex(x, y, width, channels) + 3] = 0;
    }
  }
}

async function processKoalaImage(inputPath) {
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  floodRemoveBackground(data, width, height, channels);
  erodeWhiteHalos(data, width, height, channels);

  const trimmed = await sharp(data, { raw: { width, height, channels } })
    .trim({ threshold: 1 })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();

  fs.writeFileSync(inputPath, trimmed);

  const meta = await sharp(inputPath).metadata();
  console.log(`Updated ${path.basename(inputPath)} → ${meta.width}x${meta.height}, alpha=${meta.hasAlpha}`);
}

const files = fs
  .readdirSync(STAGES_DIR)
  .filter((name) => /^koala-lv\d+\.png$/i.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

for (const file of files) {
  await processKoalaImage(path.join(STAGES_DIR, file));
}
