import { NextResponse } from "next/server";
import {
  AI_ETHICS_COPY_FIELD_IDS,
  getEthicsBlankAnswersMap,
  isEthicsCopyAnswerCorrect,
  type EthicsGateMode,
} from "@/lib/ai-ethics-content";
import { recordEthicsAcknowledgement } from "@/lib/ethics-user";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

function isEthicsGateMode(value: unknown): value is EthicsGateMode {
  return value === "copy" || value === "simple";
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.firebaseUid || session.isAdmin || session.googleAdminEmail) {
    return NextResponse.json({ error: "권한이 없어요." }, { status: 403 });
  }

  if (session.ethicsAckedAt) {
    return NextResponse.json({ ok: true, alreadyAcked: true });
  }

  const body = await request.json();
  const mode = body.mode;
  const answers = Array.isArray(body.answers) ? body.answers.map(String) : [];

  if (!isEthicsGateMode(mode)) {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  if (mode === "copy") {
    const answerMap = getEthicsBlankAnswersMap();
    const fieldIds = [...AI_ETHICS_COPY_FIELD_IDS];

    if (answers.length !== fieldIds.length) {
      return NextResponse.json({ error: "따라 쓸 내용을 모두 입력해 주세요." }, { status: 400 });
    }

    const allCorrect = fieldIds.every((fieldId, index) =>
      isEthicsCopyAnswerCorrect(answers[index] ?? "", answerMap[fieldId] ?? "")
    );

    if (!allCorrect) {
      return NextResponse.json(
        { error: "노란색으로 칠한 글자를 정확히 따라 써 주세요." },
        { status: 400 }
      );
    }
  }

  await recordEthicsAcknowledgement(session.firebaseUid, { mode });
  session.ethicsAckedAt = new Date().toISOString();
  await session.save();

  return NextResponse.json({ ok: true });
}
