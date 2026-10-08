import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { validateContent } from "@/lib/content-filter";
import { generateKoalaImage } from "@/lib/koala-image";
import { moderateImageBuffer } from "@/lib/image-moderation";
import { KOALA_PROMPT_MAX_LENGTH, koalaDisplayName, normalizeKoalaPrompt } from "@/lib/koala-avatar";
import { loadKoalaStatus } from "@/lib/koala-service";
import {
  KoalaCreditError,
  buildKoalaStatus,
  canGenerateKoala,
  createKoalaPreview,
  syncKoalaProfile,
} from "@/lib/repositories/koala-repository";

export const runtime = "nodejs";
export const maxDuration = 60;

function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.userId) return fail("로그인이 필요해요.", 401);
  const userId = session.userId;

  const body = (await request.json().catch(() => ({}))) as { prompt?: string };
  const prompt = normalizeKoalaPrompt(String(body.prompt ?? ""));
  if (!prompt) return fail("어떤 코알라로 바꿀지 적어 주세요.");
  if (prompt.length > KOALA_PROMPT_MAX_LENGTH) {
    return fail(`${KOALA_PROMPT_MAX_LENGTH}자 이내로 적어 주세요.`);
  }
  const check = validateContent(prompt, { allowPersonalName: true });
  if (!check.ok) return fail(check.message || "다른 말로 바꿔 주세요.");

  const { profile, leafCount } = await loadKoalaStatus(userId);
  if (!canGenerateKoala(profile)) return fail("지금은 코알라를 바꿀 수 있는 변신권이 없어요.");

  const image = await generateKoalaImage(koalaDisplayName(prompt));
  if (!image) return fail("코알라를 그리지 못했어요. 잠시 후 다시 해 주세요.", 503);

  const moderation = await moderateImageBuffer(image.buffer, image.contentType);
  if (!moderation.safe && !moderation.apiUnavailable) {
    return fail("이 말로는 코알라를 만들 수 없어요. 다른 말로 적어 주세요.");
  }

  try {
    await createKoalaPreview({ userId, prompt, ...image });
  } catch (error) {
    if (error instanceof KoalaCreditError) {
      return fail("지금은 코알라를 바꿀 수 있는 변신권이 없어요.");
    }
    console.error("[koala/generate] save failed:", error);
    return fail("코알라 그림을 저장하지 못했어요.", 500);
  }

  const updated = await syncKoalaProfile(userId, leafCount);
  return NextResponse.json({ koala: await buildKoalaStatus(updated, leafCount) });
}
