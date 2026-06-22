import { v4 as uuid } from "uuid";
import { calculateLevel } from "./gamification";
import type { ChatMembership, Database } from "./types";

export const CHAT_MESSAGE_LIMIT_PER_USER = 5;

export function getRoomParticipantNames(
  messages: { roomId: string; userId: string; username: string; createdAt: string }[],
  roomId: string
): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  const roomMessages = messages
    .filter((m) => m.roomId === roomId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  for (const message of roomMessages) {
    if (seen.has(message.userId)) continue;
    seen.add(message.userId);
    names.push(message.username);
  }
  return names;
}

export function countUserMessagesInRoom(
  messages: { roomId: string; userId: string }[],
  roomId: string,
  userId: string
): number {
  return messages.filter((m) => m.roomId === roomId && m.userId === userId).length;
}

export function ensureApprovedMembership(
  db: Database,
  roomId: string,
  userId: string
): ChatMembership {
  const existing = db.chatMemberships.find((m) => m.roomId === roomId && m.userId === userId);

  if (existing) {
    if (existing.status !== "approved") {
      existing.status = "approved";
      const user = db.users.find((u) => u.id === userId);
      if (user) {
        user.stats.chatParticipations += 1;
        user.stats.level = calculateLevel(user.stats);
      }
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
  db.chatMemberships.push(membership);

  const user = db.users.find((u) => u.id === userId);
  if (user) {
    user.stats.chatParticipations += 1;
    user.stats.level = calculateLevel(user.stats);
  }

  return membership;
}
