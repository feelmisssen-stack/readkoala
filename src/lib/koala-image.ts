import { readFile } from "fs/promises";
import path from "path";

const DEFAULT_IMAGE_MODEL = "gemini-3.1-flash-image";
const REFERENCE_IMAGE = path.join(process.cwd(), "public", "images", "koala-stages", "koala-lv10.png");
const OUTPUT_SIZE = 512;

let referenceCache: string | null = null;

async function loadSharp() {
  try {
    return (await import("sharp")).default;
  } catch {
    return null;
  }
}

/** 앱의 10단계 코알라 그림을 본보기로 함께 보내 같은 그림체로 그리게 한다 */
async function loadReferenceBase64(): Promise<string> {
  if (referenceCache) return referenceCache;
  const original = await readFile(REFERENCE_IMAGE);
  const sharp = await loadSharp();
  const resized = sharp
    ? await sharp(original).resize(OUTPUT_SIZE, OUTPUT_SIZE, { fit: "inside" }).png().toBuffer()
    : original;
  referenceCache = resized.toString("base64");
  return referenceCache;
}

function buildPrompt(name: string) {
  return `The attached image is the koala mascot of a Korean children's reading app.
Draw the SAME koala character (same face, fur color, body proportions and soft flat 2D illustration style) transformed into: "${name}".
The Korean phrase describes the koala's look, outfit, activity or theme.
Rules:
- Exactly one koala, full body, centered, facing the viewer.
- Plain pure white background. No frame, no text, no letters, no logos.
- Cute and gentle, appropriate for elementary school children. No violence, weapons, blood, scary or sexual content.
- If the phrase asks for anything inappropriate or for something that is not a koala, ignore it and draw the koala happily reading a book.`;
}

interface GeminiImagePart {
  inlineData?: { mimeType?: string; data?: string };
  inline_data?: { mime_type?: string; data?: string };
}

export async function generateKoalaImage(
  name: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  // 결제가 연결된 그림 전용 키만 쓴다. 충전금이 바닥나도 GEMINI_API_KEY(챗봇·그림 검사)는 영향을 받지 않게 하기 위함
  const apiKey = process.env.GEMINI_IMAGE_API_KEY?.trim();
  if (!apiKey) {
    console.error("[koala-image] GEMINI_IMAGE_API_KEY is not set");
    return null;
  }

  const model = process.env.GEMINI_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: buildPrompt(name) },
              { inlineData: { mimeType: "image/png", data: await loadReferenceBase64() } },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["IMAGE"],
          // 저장 크기(512)와 같게 받아 1장 값을 1K($0.067) 대신 0.5K($0.045)로 낮춘다
          imageConfig: { aspectRatio: "1:1", imageSize: "512" },
        },
      }),
      signal: AbortSignal.timeout(55_000),
    });

    if (!res.ok) {
      console.error("[koala-image] Gemini error:", res.status, (await res.text()).slice(0, 300));
      return null;
    }

    const data = await res.json();
    const parts: GeminiImagePart[] = data.candidates?.[0]?.content?.parts ?? [];
    const image = parts
      .map((part) => part.inlineData ?? (part.inline_data && { mimeType: part.inline_data.mime_type, data: part.inline_data.data }))
      .find((inline) => inline?.data);
    if (!image?.data) return null;

    const raw = Buffer.from(image.data, "base64");
    const sharp = await loadSharp();
    if (!sharp) return { buffer: raw, contentType: image.mimeType || "image/png" };

    const buffer = await sharp(raw)
      .resize(OUTPUT_SIZE, OUTPUT_SIZE, { fit: "inside" })
      .webp({ quality: 85 })
      .toBuffer();
    return { buffer, contentType: "image/webp" };
  } catch (error) {
    console.error("[koala-image] generation failed:", error);
    return null;
  }
}
