import { NextResponse } from "next/server";
import {
  collectReflectionTexts,
  validateContent,
  validateNickname,
  type ContentFilterResult,
  type ValidateContentOptions,
} from "@/lib/content-filter";
import { logModerationReport, type ModerationReportInput } from "@/lib/moderation-reports";

export function contentFilterError(check: ContentFilterResult): NextResponse | null {
  if (check.ok) return null;
  return NextResponse.json({ error: check.message }, { status: 400 });
}

function rejectWithOptionalReport(
  texts: string[],
  meta?: Omit<ModerationReportInput, "preview" | "reason"> & { preview?: string }
): NextResponse | null {
  const check = validateContent(texts);
  if (!check.ok) {
    if (meta?.userId) {
      const preview = meta.preview || texts.find((text) => text?.trim()) || "";
      logModerationReport({
        userId: meta.userId,
        source: meta.source,
        bookId: meta.bookId,
        bookTitle: meta.bookTitle,
        fieldLabel: meta.fieldLabel,
        preview,
        reason: check.reason,
      });
    }
    return contentFilterError(check);
  }
  return null;
}

export function rejectInvalidContent(
  ...texts: string[]
): NextResponse | null {
  return contentFilterError(validateContent(texts));
}

export function rejectInvalidContentForUser(
  texts: string[],
  meta: Omit<ModerationReportInput, "preview" | "reason"> & { preview?: string }
): NextResponse | null {
  return rejectWithOptionalReport(texts, meta);
}

export function rejectInvalidNickname(text: string): NextResponse | null {
  return contentFilterError(validateNickname(text));
}

export function rejectInvalidReflectionBody(
  body: Record<string, unknown>,
  meta: Omit<ModerationReportInput, "preview" | "reason" | "source" | "fieldLabel">
): NextResponse | null {
  const texts = collectReflectionTexts(body);
  return rejectWithOptionalReport(texts, {
    ...meta,
    source: "reflection",
    fieldLabel: "감상 기록",
  });
}

export function rejectInvalidAiMessages(
  messages: Array<{ role?: string; content?: string }>,
  meta?: Omit<ModerationReportInput, "preview" | "reason" | "source" | "fieldLabel">
): NextResponse | null {
  const lastUser = [...messages].reverse().find((message) => message.role === "user");
  const content = lastUser?.content?.trim();
  if (!content) return null;

  return rejectWithOptionalReport(
    [content],
    meta?.userId
      ? { ...meta, source: "ai_helper", fieldLabel: "감상문 도우미", preview: content }
      : undefined
  );
}

export { collectReflectionTexts, validateContent, validateNickname };
export type { ValidateContentOptions };
