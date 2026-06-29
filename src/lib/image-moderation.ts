import { callGeminiWithImage, getGeminiConfig } from "@/lib/gemini";

export interface ImageModerationResult {
  safe: boolean;
  reason?: string;
  apiUnavailable?: boolean;
}

const MODERATION_PROMPT = `You are a content moderator for an elementary school reading app (ages 8-12).
Students upload drawings or photos of memorable scenes from books they read.

Analyze the image. Reply with ONLY valid JSON, no markdown:
{"safe": true or false, "reason": "brief Korean label if unsafe, empty string if safe"}

Mark safe=false if the image contains ANY of:
- graphic violence, blood, gore, fighting meant to harm
- weapons shown in a violent or threatening way
- sexual, suggestive, or nude content
- horror imagery clearly unsuitable for young children

If safe=false, set reason to ONE short Korean label that best describes the problem, such as:
- "폭력적인 장면"
- "선정적인 장면"
- "무기나 위협적인 장면"
- "어린이에게 맞지 않는 공포 장면"
- "부적절한 그림"
You may add a very brief detail after a comma if helpful.

Mark safe=true for:
- normal book illustrations, landscapes, characters, mild adventure
- child drawings, sketches, harmless scenes
- ambiguous or mild content`;

function moderationUnavailable(): ImageModerationResult {
  return { safe: false, apiUnavailable: true };
}

export async function moderateImageBuffer(
  buffer: Buffer,
  mimeType: string
): Promise<ImageModerationResult> {
  if (!getGeminiConfig()) {
    return moderationUnavailable();
  }

  try {
    const base64 = buffer.toString("base64");
    const raw = await callGeminiWithImage({
      prompt: MODERATION_PROMPT,
      imageBase64: base64,
      mimeType,
      temperature: 0,
      maxOutputTokens: 120,
    });

    if (!raw) {
      return moderationUnavailable();
    }

    const jsonText = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(jsonText) as { safe?: boolean; reason?: string };

    return {
      safe: parsed.safe !== false,
      reason: parsed.safe === false ? parsed.reason?.trim() || "부적절한 그림" : undefined,
    };
  } catch (error) {
    console.error("Image moderation failed:", error);
    return moderationUnavailable();
  }
}

export function isMemorableScenePublic(
  reflection: {
    memorableSceneImage?: string;
    memorableSceneStatus?: string;
  } | null | undefined
): boolean {
  if (!reflection?.memorableSceneImage?.trim()) return false;
  const status = reflection.memorableSceneStatus ?? "approved";
  return status === "approved";
}

export function hasMemorableSceneActivity(
  reflection: {
    memorableSceneImage?: string;
    memorableSceneStatus?: string;
  } | null | undefined
): boolean {
  if (!reflection) return false;
  if (reflection.memorableSceneStatus === "pending") return true;
  return !!reflection.memorableSceneImage?.trim();
}
