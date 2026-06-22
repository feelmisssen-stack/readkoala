import { NextResponse } from "next/server";
import { getWritingHelp, type ChatMessage, type ReviewDraft } from "@/lib/ai-helper";

export async function POST(request: Request) {
  const body = await request.json();
  const context = body.context || "review";
  const messages = (body.messages || []) as ChatMessage[];
  const reviewDraft = (body.reviewDraft || {}) as ReviewDraft;
  const isGreeting = Boolean(body.isGreeting);

  const reply = await getWritingHelp({
    context,
    messages,
    reviewDraft,
    isGreeting,
  });

  return NextResponse.json({ reply });
}
