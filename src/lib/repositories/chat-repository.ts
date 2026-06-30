import { v4 as uuid } from "uuid";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { serializeForFirestore } from "@/lib/repositories/data-mode";
import { incrementChatParticipation } from "@/lib/repositories/user-stats-repository";
import type {
  ChatMembership,
  ChatMessage,
  ChatMessageHeart,
  ChatRoom,
} from "@/lib/types";

const ROOMS = "chatRooms";
const MESSAGES = "chatMessages";
const HEARTS = "chatMessageHearts";
const MEMBERSHIPS = "chatMemberships";

function sortByCreatedAt<T extends { createdAt: string }>(items: T[]) {
  return [...items].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

async function setDoc(collection: string, id: string, payload: object) {
  await getAdminFirestore().collection(collection).doc(id).set(serializeForFirestore(payload));
}

async function deleteDocs(collection: string, ids: string[]) {
  if (ids.length === 0) return;
  const db = getAdminFirestore();
  const batch = db.batch();
  ids.forEach((id) => batch.delete(db.collection(collection).doc(id)));
  await batch.commit();
}

export async function listVisibleChatRooms(): Promise<ChatRoom[]> {
  const snapshot = await getAdminFirestore()
    .collection(ROOMS)
    .where("status", "in", ["approved", "pending"])
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<ChatRoom, "id">) }));
}

export async function listPendingChatRooms(): Promise<ChatRoom[]> {
  const snapshot = await getAdminFirestore()
    .collection(ROOMS)
    .where("status", "==", "pending")
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<ChatRoom, "id">) }));
}

export async function getChatRoomById(roomId: string): Promise<ChatRoom | null> {
  const doc = await getAdminFirestore().collection(ROOMS).doc(roomId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as Omit<ChatRoom, "id">) };
}

export async function createChatRoomWithMembership(input: {
  room: ChatRoom;
  membership: ChatMembership;
}) {
  const { id: roomId, ...roomPayload } = input.room;
  const { id: membershipId, ...membershipPayload } = input.membership;
  const db = getAdminFirestore();
  const batch = db.batch();
  batch.set(db.collection(ROOMS).doc(roomId), serializeForFirestore(roomPayload));
  batch.set(db.collection(MEMBERSHIPS).doc(membershipId), serializeForFirestore(membershipPayload));
  await batch.commit();
}

export async function updateChatRoomStatus(
  roomId: string,
  status: ChatRoom["status"]
): Promise<boolean> {
  const ref = getAdminFirestore().collection(ROOMS).doc(roomId);
  const doc = await ref.get();
  if (!doc.exists) return false;
  await ref.update({ status });
  return true;
}

export async function approveChatRoomIfPending(roomId: string) {
  const room = await getChatRoomById(roomId);
  if (room?.status === "pending") {
    await updateChatRoomStatus(roomId, "approved");
  }
}

export async function listChatMessagesByRoom(roomId: string): Promise<ChatMessage[]> {
  const snapshot = await getAdminFirestore()
    .collection(MESSAGES)
    .where("roomId", "==", roomId)
    .get();

  return sortByCreatedAt(
    snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<ChatMessage, "id">) }))
  );
}

export async function listAllChatMessages(): Promise<ChatMessage[]> {
  const snapshot = await getAdminFirestore().collection(MESSAGES).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<ChatMessage, "id">) }));
}

export async function createChatMessage(message: ChatMessage): Promise<ChatMessage> {
  const { id, ...payload } = message;
  await setDoc(MESSAGES, id, payload);
  return message;
}

export async function listChatHeartsByRoom(roomId: string): Promise<ChatMessageHeart[]> {
  const snapshot = await getAdminFirestore()
    .collection(HEARTS)
    .where("roomId", "==", roomId)
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<ChatMessageHeart, "id">) }));
}

export async function toggleChatMessageHeart(input: {
  roomId: string;
  messageId: string;
  userId: string;
}): Promise<{ hearted: boolean; heartCount: number }> {
  const db = getAdminFirestore();
  const snapshot = await db.collection(HEARTS).where("messageId", "==", input.messageId).get();

  const existing = snapshot.docs.find((doc) => doc.data().userId === input.userId);
  if (existing) {
    await existing.ref.delete();
  } else {
    const heart: ChatMessageHeart = {
      id: uuid(),
      messageId: input.messageId,
      roomId: input.roomId,
      userId: input.userId,
      createdAt: new Date().toISOString(),
    };
    const { id, ...payload } = heart;
    await setDoc(HEARTS, id, payload);
  }

  const refreshed = await db.collection(HEARTS).where("messageId", "==", input.messageId).get();
  return { hearted: !existing, heartCount: refreshed.size };
}

export async function listChatMemberships(): Promise<ChatMembership[]> {
  const snapshot = await getAdminFirestore().collection(MEMBERSHIPS).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<ChatMembership, "id">) }));
}

export async function getChatMembership(
  roomId: string,
  userId: string
): Promise<ChatMembership | null> {
  const snapshot = await getAdminFirestore()
    .collection(MEMBERSHIPS)
    .where("roomId", "==", roomId)
    .get();

  const match = snapshot.docs.find((doc) => doc.data().userId === userId);
  if (!match) return null;
  return { id: match.id, ...(match.data() as Omit<ChatMembership, "id">) };
}

export async function ensureApprovedChatMembership(
  roomId: string,
  userId: string,
  firebaseUid?: string
): Promise<ChatMembership> {
  const existing = await getChatMembership(roomId, userId);
  if (existing) {
    if (existing.status !== "approved") {
      await updateChatMembershipStatus(existing.id, "approved", existing.userId, firebaseUid);
      return { ...existing, status: "approved" };
    }
    return existing;
  }

  const membership: ChatMembership = {
    id: uuid(),
    roomId,
    userId,
    status: "approved",
    createdAt: new Date().toISOString(),
  };

  const { id, ...payload } = membership;
  await setDoc(MEMBERSHIPS, id, payload);
  await incrementChatParticipation(userId, firebaseUid);
  return membership;
}

export async function updateChatMembershipStatus(
  membershipId: string,
  status: ChatMembership["status"],
  _userId?: string,
  firebaseUid?: string
): Promise<boolean> {
  const ref = getAdminFirestore().collection(MEMBERSHIPS).doc(membershipId);
  const doc = await ref.get();
  if (!doc.exists) return false;
  const data = doc.data() as Omit<ChatMembership, "id">;
  const wasApproved = data.status === "approved";
  await ref.update({ status });
  if (status === "approved" && !wasApproved) {
    await incrementChatParticipation(data.userId, firebaseUid);
  }
  return true;
}

export async function deleteChatRoomsByBookId(bookId: string) {
  const db = getAdminFirestore();
  const rooms = await db.collection(ROOMS).where("bookId", "==", bookId).get();
  const roomIds = rooms.docs.map((doc) => doc.id);
  if (roomIds.length === 0) return;

  await deleteDocs(ROOMS, roomIds);

  for (const roomId of roomIds) {
    const [messages, hearts, memberships] = await Promise.all([
      db.collection(MESSAGES).where("roomId", "==", roomId).get(),
      db.collection(HEARTS).where("roomId", "==", roomId).get(),
      db.collection(MEMBERSHIPS).where("roomId", "==", roomId).get(),
    ]);
    await deleteDocs(MESSAGES, messages.docs.map((doc) => doc.id));
    await deleteDocs(HEARTS, hearts.docs.map((doc) => doc.id));
    await deleteDocs(MEMBERSHIPS, memberships.docs.map((doc) => doc.id));
  }
}

export async function deleteChatDataForUser(userId: string) {
  const db = getAdminFirestore();
  const [rooms, messages, hearts, memberships] = await Promise.all([
    db.collection(ROOMS).where("creatorId", "==", userId).get(),
    db.collection(MESSAGES).where("userId", "==", userId).get(),
    db.collection(HEARTS).where("userId", "==", userId).get(),
    db.collection(MEMBERSHIPS).where("userId", "==", userId).get(),
  ]);

  const removedMessageIds = messages.docs.map((doc) => doc.id);
  await deleteDocs(ROOMS, rooms.docs.map((doc) => doc.id));
  await deleteDocs(MESSAGES, removedMessageIds);
  await deleteDocs(HEARTS, hearts.docs.map((doc) => doc.id));
  await deleteDocs(MEMBERSHIPS, memberships.docs.map((doc) => doc.id));

  if (removedMessageIds.length > 0) {
    for (const messageId of removedMessageIds) {
      const relatedHearts = await db.collection(HEARTS).where("messageId", "==", messageId).get();
      await deleteDocs(HEARTS, relatedHearts.docs.map((doc) => doc.id));
    }
  }
}
