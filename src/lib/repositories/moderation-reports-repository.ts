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

function isSameDraft(a: string, b: string) {
  return a.startsWith(b) || b.startsWith(a);
}

/**
 * 감상문은 쓰는 도중에도 자동 저장되므로, 같은 학생·같은 곳의 검토 대기 항목이 있고
 * 내용이 이어 쓴 글이면 새로 만들지 않고 최신 내용으로 바꾼다.
 * 확인 필요(watch) 항목은 저장된 글이 계속 다시 저장되므로, 선생님이 이미 확인한 글이면 다시 올리지 않는다.
 */
async function updatePendingDraftReport(input: ModerationReportInput, preview: string) {
  const isWatch = input.reason === "watch";
  let query = getAdminFirestore().collection(COLLECTION).where("userId", "==", input.userId);
  if (!isWatch) query = query.where("status", "==", "pending");
  const snapshot = await query.get();

  const sameDraft = snapshot.docs.find((doc) => {
    const data = doc.data() as Omit<ModerationReport, "id">;
    return (
      data.kind !== "scene_image" &&
      (data.reason === "watch") === isWatch &&
      data.source === input.source &&
      (data.bookId ?? null) === (input.bookId ?? null) &&
      (data.bookTitle ?? null) === (input.bookTitle ?? null) &&
      isSameDraft(String(data.preview ?? ""), preview)
    );
  });
  if (!sameDraft) return false;
  if (sameDraft.data().status !== "pending") return true;

  if (sameDraft.data().preview !== preview) {
    await sameDraft.ref.update(
      serializeForFirestore({
        preview,
        reason: input.reason,
        createdAt: new Date().toISOString(),
      })
    );
  }
  return true;
}

export async function createModerationReport(input: ModerationReportInput) {
  const preview = input.preview.trim().slice(0, 500);
  if (!preview) return;

  if (await updatePendingDraftReport(input, preview)) return;

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

export async function listModerationReports(): Promise<ModerationReport[]> {
  const snapshot = await getAdminFirestore().collection(COLLECTION).get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<ModerationReport, "id">),
  }));
}

export interface SceneImageReviewInput {
  userId: string;
  reflectionId: string;
  bookId?: string;
  bookTitle?: string;
  submittedAt: string;
  status: "approved" | "rejected";
  imageUrl?: string;
  detail?: string;
}

export async function recordSceneImageReview(input: SceneImageReviewInput) {
  const report: ModerationReport = {
    id: uuid(),
    kind: "scene_image",
    userId: input.userId,
    source: "reflection",
    status: input.status,
    preview: "",
    reflectionId: input.reflectionId,
    bookId: input.bookId,
    bookTitle: input.bookTitle,
    fieldLabel: "기억에 남는 장면",
    imageUrl: input.imageUrl,
    detail: input.detail,
    createdAt: input.submittedAt,
    reviewedAt: new Date().toISOString(),
  };

  const { id, ...payload } = report;
  await getAdminFirestore().collection(COLLECTION).doc(id).set(serializeForFirestore(payload));
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
