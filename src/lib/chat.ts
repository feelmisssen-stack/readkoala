export const CHAT_MESSAGE_LIMIT_PER_USER = 5;
export const CHAT_SPEAKER_LIMIT = 5;

export function getRoomParticipantNames(
  messages: { roomId: string; userId: string; username: string; createdAt: string }[],
  roomId: string,
  displayMap?: Map<string, string>
): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  const roomMessages = messages
    .filter((m) => m.roomId === roomId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  for (const message of roomMessages) {
    if (seen.has(message.userId)) continue;
    seen.add(message.userId);
    names.push(displayMap?.get(message.userId) || message.username);
  }
  return names;
}

export function getRoomSpeakerIds(
  messages: { roomId: string; userId: string }[],
  roomId: string
): string[] {
  const speakers = new Set<string>();
  for (const message of messages) {
    if (message.roomId === roomId) speakers.add(message.userId);
  }
  return [...speakers];
}

export function canUserChatInRoom(
  messages: { roomId: string; userId: string }[],
  roomId: string,
  userId: string
): boolean {
  const speakers = getRoomSpeakerIds(messages, roomId);
  if (speakers.includes(userId)) return true;
  return speakers.length < CHAT_SPEAKER_LIMIT;
}

export function countUserMessagesInRoom(
  messages: { roomId: string; userId: string }[],
  roomId: string,
  userId: string
): number {
  return messages.filter((m) => m.roomId === roomId && m.userId === userId).length;
}

export function getMessageHeartCounts(
  hearts: { messageId: string; userId: string }[],
  messageIds: string[]
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const id of messageIds) counts.set(id, 0);
  for (const heart of hearts) {
    if (!messageIds.includes(heart.messageId)) continue;
    counts.set(heart.messageId, (counts.get(heart.messageId) || 0) + 1);
  }
  return counts;
}
