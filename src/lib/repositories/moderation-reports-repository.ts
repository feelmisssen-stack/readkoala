import { v4 as uuid } from "uuid";
import type { ModerationReport } from "@/lib/types";
import type { ContentFilterReason } from "@/lib/content-filter";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { serializeForFirestore } from "@/lib/repositories/data-mode";

const COLLECTION = "moderationReports";

export interface ModerationReportInput {
  userId: string;
  source: ModerationReport["source"];
  preview: string;
  reason?: ContentFilterReason;
  bookId?: string;
  bookTitle?: string;
  fieldLabel?: string;
}

export async function createModerationReport(input: ModerationReportInput) {
  const preview = input.preview.trim().slice(0, 500);
  if (!preview) return;

  const report: ModerationReport = {
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
  };

  const { id, ...payload } = report;
  await getAdminFirestore().collection(COLLECTION).doc(id).set(serializeForFirestore(payload));
}

export async function listPendingModerationReports(): Promise<ModerationReport[]> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTION)
    .where("status", "==", "pending")
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<ModerationReport, "id">),
  }));
}

export async function dismissModerationReport(reportId: string): Promise<boolean> {
  const now = new Date().toISOString();
  const ref = getAdminFirestore().collection(COLLECTION).doc(reportId);
  const doc = await ref.get();
  if (!doc.exists) return false;
  await ref.update({ status: "dismissed", reviewedAt: now });
  return true;
}

export async function deleteModerationReportsForUser(userId: string) {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTION)
    .where("userId", "==", userId)
    .get();

  if (snapshot.empty) return;
  const batch = getAdminFirestore().batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}
