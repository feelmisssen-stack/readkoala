const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite";

export interface GeminiConfig {
  apiKey: string;
  model: string;
}

export function getGeminiConfig(): GeminiConfig | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  return {
    apiKey,
    model: process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
  };
}

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

interface GeminiContent {
  role?: "user" | "model";
  parts: GeminiPart[];
}

export async function callGeminiGenerateContent(options: {
  systemInstruction?: string;
  contents: GeminiContent[];
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<string | null> {
  const config = getGeminiConfig();
  if (!config) return null;

  const body: Record<string, unknown> = {
    contents: options.contents,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxOutputTokens ?? 350,
    },
  };

  if (options.systemInstruction) {
    body.systemInstruction = { parts: [{ text: options.systemInstruction }] };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error("Gemini API error:", res.status);
    return null;
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text || "")
    .join("")
    .trim();

  return text || null;
}

export async function callGeminiWithImage(options: {
  prompt: string;
  imageBase64: string;
  mimeType: string;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<string | null> {
  return callGeminiGenerateContent({
    contents: [
      {
        role: "user",
        parts: [
          { text: options.prompt },
          {
            inlineData: {
              mimeType: options.mimeType,
              data: options.imageBase64,
            },
          },
        ],
      },
    ],
    temperature: options.temperature ?? 0,
    maxOutputTokens: options.maxOutputTokens ?? 120,
  });
}
