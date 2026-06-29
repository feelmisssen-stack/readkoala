import { v4 as uuid } from "uuid";
import { updateDb } from "@/lib/db";
import type { ModerationReportSource } from "@/lib/types";
import type { ContentFilterReason } from "@/lib/content-filter";

export interface ModerationReportInput {
  userId: string;
  source: ModerationReportSource;
  preview: string;
  reason?: ContentFilterReason;
  bookId?: string;
  bookTitle?: string;
  fieldLabel?: string;
}

export function logModerationReport(input: ModerationReportInput) {
  const preview = input.preview.trim().slice(0, 500);
  if (!preview) return;

  updateDb((db) => {
    db.moderationReports.push({
      id: uuid(),
      userId: input.userId,
      source: input.source,
      status: "pending",
      reason: input.reason,
      preview,
      bookId: input.bookId,
      bookTitle: input.bookTitle,
      fieldLabel: input.fieldLabel,
      createdAt: new Date().toISOString(),
    });
  });
}
