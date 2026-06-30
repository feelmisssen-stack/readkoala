import { createModerationReport, type ModerationReportInput } from "@/lib/repositories/moderation-reports-repository";

export type { ModerationReportInput };

export function logModerationReport(input: ModerationReportInput) {
  void createModerationReport(input).catch((error) => {
    console.error("Failed to log moderation report:", error);
  });
}
