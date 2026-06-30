import { NextResponse } from "next/server";
import { getWritingHelp, type ChatMessage, type ReviewDraft } from "@/lib/ai-helper";
import {
  AI_HELPER_FAREWELL_MESSAGE,
  AI_HELPER_MAX_USER_MESSAGES,
} from "@/lib/ai-helper-limits";
import { appendAiHelperExchange } from "@/lib/ai-helper-log";
import { rejectInvalidAiMessages } from "@/lib/content-filter-api";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getSession();
  const body = await request.json();
  const context = body.context || "review";
  const messages = (body.messages || []) as ChatMessage[];
  const reviewDraft = (body.reviewDraft || {}) as ReviewDraft;
  const isGreeting = Boolean(body.isGreeting);
  const bookId = typeof body.bookId === "string" ? body.bookId : undefined;

  const blocked = rejectInvalidAiMessages(messages, session.userId
    ? {
        userId: session.userId,
        bookId,
        bookTitle: reviewDraft.bookTitle,
      }
    : undefined);
  if (blocked) return blocked;

  const userMessageCount = messages.filter((message) => message.role === "user").length;
  if (!isGreeting && userMessageCount > AI_HELPER_MAX_USER_MESSAGES) {
    return NextResponse.json(
      { error: AI_HELPER_FAREWELL_MESSAGE, limitReached: true },
      { status: 429 }
    );
  }

  const reply = await getWritingHelp({
    context,
    messages,
    reviewDraft,
    isGreeting,
  });

  if (session.userId && !isGreeting) {
    const lastUser = [...messages].reverse().find((message) => message.role === "user");
    void appendAiHelperExchange({
      userId: session.userId,
      bookId,
      bookTitle: reviewDraft.bookTitle,
      userMessage: lastUser?.content,
      assistantReply: reply,
    }).catch((error) => {
      console.error("Failed to log AI helper exchange:", error);
    });
  }

  return NextResponse.json({ reply });
}
