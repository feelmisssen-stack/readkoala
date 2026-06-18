import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  getStdictApiKey,
  isDictionaryApiConfigured,
  writeDictionaryConfig,
} from "@/lib/dictionary-config";
import { lookupWord } from "@/lib/dictionary-api";

export async function GET() {
  const configured = isDictionaryApiConfigured();
  return NextResponse.json({
    configured,
    source: process.env.STDICT_API_KEY?.trim()
      ? "env"
      : configured
        ? "saved"
        : "none",
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { apiKey } = await request.json();
  const trimmed = apiKey?.trim();
  if (!trimmed || trimmed.length < 16) {
    return NextResponse.json({ error: "올바른 API 키를 입력해 주세요." }, { status: 400 });
  }

  writeDictionaryConfig({ stdictApiKey: trimmed });

  const test = await lookupWord("나무");
  if (test?.error === "api_error" || test?.source !== "api") {
    writeDictionaryConfig({});
    return NextResponse.json({
      error: "API 키가 올바르지 않거나 사전 서버에 연결할 수 없어요. 키를 다시 확인해 주세요.",
    }, { status: 400 });
  }

  return NextResponse.json({ ok: true, configured: true });
}
