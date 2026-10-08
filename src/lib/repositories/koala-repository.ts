import { v4 as uuid } from "uuid";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { deleteSceneFromStorage, uploadSceneBufferToStorage } from "@/lib/firebase/scene-storage";
import { serializeForFirestore } from "@/lib/repositories/data-mode";
import {
  KOALA_CHANGE_MAX_STORED,
  KOALA_FREE_RETRIES,
  KOALA_PROMPT_MAX_LENGTH,
  koalaDisplayName,
  leavesUntilNextKoalaChange,
  earnedKoalaChanges,
  settleKoalaCredits,
  type KoalaAvatarView,
  type KoalaStatus,
} from "@/lib/koala-avatar";

const PROFILES = "koalaProfiles";
const AVATARS = "koalaAvatars";

export type KoalaAvatarStatus = "preview" | "active" | "replaced" | "deleted" | "discarded";

export interface KoalaAvatar {
  id: string;
  userId: string;
  prompt: string;
  name: string;
  imageUrl: string;
  status: KoalaAvatarStatus;
  createdAt: string;
  appliedAt?: string;
  deletedAt?: string;
}

interface KoalaProfile {
  stored: number;
  accountedEarned: number;
  activeAvatarId?: string;
  activeName?: string;
  activeImageUrl?: string;
  /** 그림을 만들었지만 아직 고르지 않은 후보들 */
  draft?: { previewIds: string[]; retriesLeft: number };
  updatedAt?: string;
}

export class KoalaCreditError extends Error {}

function profileRef(userId: string) {
  return getAdminFirestore().collection(PROFILES).doc(userId);
}

function avatarRef(id: string) {
  return getAdminFirestore().collection(AVATARS).doc(id);
}

function readProfile(data: FirebaseFirestore.DocumentData | undefined): KoalaProfile {
  return {
    stored: Number(data?.stored) || 0,
    accountedEarned: Number(data?.accountedEarned) || 0,
    activeAvatarId: data?.activeAvatarId,
    activeName: data?.activeName,
    activeImageUrl: data?.activeImageUrl,
    draft: data?.draft,
  };
}

function toView(avatar: Pick<KoalaAvatar, "id" | "name" | "imageUrl">): KoalaAvatarView {
  return { id: avatar.id, name: avatar.name, imageUrl: avatar.imageUrl };
}

/** 잎새 수에 맞춰 새로 생긴 변신권을 더해 저장하고 현재 상태를 돌려준다 */
export async function syncKoalaProfile(userId: string, leafCount: number): Promise<KoalaProfile> {
  return getAdminFirestore().runTransaction(async (tx) => {
    const snap = await tx.get(profileRef(userId));
    const profile = readProfile(snap.data());
    const settled = settleKoalaCredits(profile, leafCount);
    if (settled.changed || !snap.exists) {
      tx.set(
        profileRef(userId),
        {
          stored: settled.stored,
          accountedEarned: settled.accountedEarned,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }
    return { ...profile, stored: settled.stored, accountedEarned: settled.accountedEarned };
  });
}

async function listAvatarsByIds(ids: string[]): Promise<KoalaAvatar[]> {
  if (ids.length === 0) return [];
  const docs = await getAdminFirestore().getAll(...ids.map(avatarRef));
  return docs
    .filter((doc) => doc.exists)
    .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<KoalaAvatar, "id">) }));
}

export async function buildKoalaStatus(profile: KoalaProfile, leafCount: number): Promise<KoalaStatus> {
  const previews = await listAvatarsByIds(profile.draft?.previewIds ?? []);
  return {
    stored: profile.stored,
    maxStored: KOALA_CHANGE_MAX_STORED,
    nextChangeInLeaves: leavesUntilNextKoalaChange(leafCount),
    unlocked: earnedKoalaChanges(leafCount) > 0 || profile.accountedEarned > 0,
    active:
      profile.activeAvatarId && profile.activeImageUrl
        ? { id: profile.activeAvatarId, name: profile.activeName || "", imageUrl: profile.activeImageUrl }
        : null,
    previews: previews.map(toView),
    retriesLeft: profile.draft?.retriesLeft ?? 0,
    promptMaxLength: KOALA_PROMPT_MAX_LENGTH,
  };
}

export async function getActiveKoala(userId: string): Promise<KoalaAvatarView | null> {
  const profile = readProfile((await profileRef(userId).get()).data());
  if (!profile.activeAvatarId || !profile.activeImageUrl) return null;
  return { id: profile.activeAvatarId, name: profile.activeName || "", imageUrl: profile.activeImageUrl };
}

/** 그림을 만들기 전에 변신권(또는 무료 다시 만들기)이 남았는지 확인한다 */
export function canGenerateKoala(profile: KoalaProfile): boolean {
  return profile.draft ? profile.draft.retriesLeft > 0 : profile.stored > 0;
}

/** 만든 그림을 후보로 저장하고 변신권(처음) 또는 무료 다시 만들기(두 번째)를 쓴다 */
export async function createKoalaPreview(input: {
  userId: string;
  prompt: string;
  buffer: Buffer;
  contentType: string;
}): Promise<void> {
  const id = uuid();
  const ext = input.contentType === "image/webp" ? "webp" : "png";
  const imageUrl = await uploadSceneBufferToStorage(
    input.buffer,
    `koala-avatars/${input.userId}/${id}.${ext}`,
    input.contentType
  );

  const avatar: KoalaAvatar = {
    id,
    userId: input.userId,
    prompt: input.prompt,
    name: koalaDisplayName(input.prompt),
    imageUrl,
    status: "preview",
    createdAt: new Date().toISOString(),
  };

  try {
    await getAdminFirestore().runTransaction(async (tx) => {
      const snap = await tx.get(profileRef(input.userId));
      const profile = readProfile(snap.data());
      if (!canGenerateKoala(profile)) throw new KoalaCreditError("NO_CREDIT");

      const draft = profile.draft
        ? { previewIds: [...profile.draft.previewIds, id], retriesLeft: profile.draft.retriesLeft - 1 }
        : { previewIds: [id], retriesLeft: KOALA_FREE_RETRIES };

      tx.set(
        profileRef(input.userId),
        {
          stored: profile.draft ? profile.stored : profile.stored - 1,
          draft,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      const { id: _id, ...payload } = avatar;
      tx.set(avatarRef(id), serializeForFirestore(payload));
    });
  } catch (error) {
    await deleteSceneFromStorage(imageUrl).catch(() => {});
    throw error;
  }
}

/** 후보 중 하나를 내 코알라로 정한다. 고르지 않은 후보는 지운다 */
export async function applyKoalaPreview(userId: string, avatarId: string): Promise<boolean> {
  const discarded: KoalaAvatar[] = [];

  const ok = await getAdminFirestore().runTransaction(async (tx) => {
    const snap = await tx.get(profileRef(userId));
    const profile = readProfile(snap.data());
    const previewIds = profile.draft?.previewIds ?? [];
    if (!previewIds.includes(avatarId)) return false;

    const previews = await Promise.all(previewIds.map((id) => tx.get(avatarRef(id))));
    const chosen = previews.find((doc) => doc.id === avatarId);
    if (!chosen?.exists) return false;
    const chosenData = chosen.data() as Omit<KoalaAvatar, "id">;
    const now = new Date().toISOString();

    if (profile.activeAvatarId) {
      tx.set(avatarRef(profile.activeAvatarId), { status: "replaced" }, { merge: true });
    }
    tx.set(avatarRef(avatarId), { status: "active", appliedAt: now }, { merge: true });
    for (const doc of previews) {
      if (doc.id === avatarId || !doc.exists) continue;
      tx.set(avatarRef(doc.id), { status: "discarded" }, { merge: true });
      discarded.push({ id: doc.id, ...(doc.data() as Omit<KoalaAvatar, "id">) });
    }
    tx.set(
      profileRef(userId),
      {
        activeAvatarId: avatarId,
        activeName: chosenData.name,
        activeImageUrl: chosenData.imageUrl,
        draft: FieldValue.delete(),
        updatedAt: now,
      },
      { merge: true }
    );
    return true;
  });

  await Promise.all(discarded.map((avatar) => deleteSceneFromStorage(avatar.imageUrl).catch(() => {})));
  return ok;
}

/** 관리자 화면용: 학생이 골라서 쓴(쓰는) 코알라만 */
export async function listAppliedKoalaAvatars(): Promise<KoalaAvatar[]> {
  const snapshot = await getAdminFirestore()
    .collection(AVATARS)
    .where("status", "in", ["active", "replaced", "deleted"])
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<KoalaAvatar, "id">) }));
}

/**
 * 관리자 삭제: 그림 파일을 지우고, 쓰고 있던 코알라면 바로 전 코알라(없으면 기본 단계 그림)로 되돌린다.
 * 변신권은 돌려주지 않는다.
 */
export async function adminDeleteKoalaAvatar(avatarId: string): Promise<boolean> {
  const snap = await avatarRef(avatarId).get();
  if (!snap.exists) return false;
  const avatar = { id: snap.id, ...(snap.data() as Omit<KoalaAvatar, "id">) };
  if (avatar.status === "deleted") return true;

  const now = new Date().toISOString();
  await avatarRef(avatarId).set({ status: "deleted", deletedAt: now }, { merge: true });

  const profile = readProfile((await profileRef(avatar.userId).get()).data());
  if (profile.activeAvatarId === avatarId) {
    const previous = (
      await getAdminFirestore()
        .collection(AVATARS)
        .where("userId", "==", avatar.userId)
        .where("status", "==", "replaced")
        .get()
    ).docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<KoalaAvatar, "id">) }))
      .sort((a, b) => (b.appliedAt ?? "").localeCompare(a.appliedAt ?? ""))[0];

    if (previous) {
      await avatarRef(previous.id).set({ status: "active" }, { merge: true });
      await profileRef(avatar.userId).set(
        {
          activeAvatarId: previous.id,
          activeName: previous.name,
          activeImageUrl: previous.imageUrl,
          updatedAt: now,
        },
        { merge: true }
      );
    } else {
      await profileRef(avatar.userId).set(
        {
          activeAvatarId: FieldValue.delete(),
          activeName: FieldValue.delete(),
          activeImageUrl: FieldValue.delete(),
          updatedAt: now,
        },
        { merge: true }
      );
    }
  }

  await deleteSceneFromStorage(avatar.imageUrl).catch(() => {});
  return true;
}
