export interface User {
  id: string;
  username: string;
  nickname?: string;
  email?: string;
  passwordHash: string;
  isAdmin: boolean;
  createdAt: string;
  stats: UserStats;
}

export interface UserStats {
  booksRead: number;
  totalChars: number;
  chatParticipations: number;
  level: number;
}

export interface Book {
  id: string;
  userId: string;
  isbn?: string;
  title: string;
  author?: string;
  coverUrl?: string;
  publisher?: string;
  totalPages?: number;
  currentPage?: number;
  readingProgress: number;
  readingStartedAt?: string;
  finishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReflectionQuestion {
  question: string;
  answer: string;
}

export interface BeforeReadingActivity {
  key: string;
  label: string;
  checked: boolean;
}

export interface BeforeReadingPair {
  activityKey?: string;
  ask: string;
  guess: string;
}

/** @deprecated Use ReflectionActivity */
export type ReflectionActivity = BeforeReadingActivity;

/** @deprecated Use ReflectionActivityPair */
export type ReflectionActivityPair = BeforeReadingPair;

export interface Reflection {
  id: string;
  userId: string;
  bookId: string;
  beforeReading: ReflectionQuestion[];
  beforeReadingActivities?: BeforeReadingActivity[];
  beforeReadingPairs?: BeforeReadingPair[];
  duringReading: ReflectionQuestion[];
  duringReadingActivities?: BeforeReadingActivity[];
  duringReadingPairs?: BeforeReadingPair[];
  association: string;
  favoriteQuote: string;
  reviewTitle: string;
  reviewReason: string;
  reviewContent: string;
  reviewImpressiveScene: string;
  reviewThoughts: string;
  memorableSceneImage?: string;
  memorableScenePendingImage?: string;
  memorableSceneStatus?: "approved" | "pending";
  memorableScenePendingReason?: "api_unavailable" | "content_review";
  memorableScenePendingDetail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatRoom {
  id: string;
  bookId: string;
  bookTitle: string;
  creatorId: string;
  name: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  content: string;
  createdAt: string;
}

export interface ChatMessageHeart {
  id: string;
  messageId: string;
  roomId: string;
  userId: string;
  createdAt: string;
}

export interface ChatMembership {
  id: string;
  roomId: string;
  userId: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface VocabularyEntry {
  id: string;
  userId: string;
  word: string;
  definition: string;
  /** 표준국어대사전 동형어 번호 — 같은 낱말이 여러 뜻일 때 구분 */
  senseNo?: number;
  createdAt: string;
}

export interface SharedSentence {
  id: string;
  userId: string;
  username: string;
  vocabularyId?: string;
  word: string;
  definition: string;
  senseNo?: number;
  sentence: string;
  createdAt: string;
}


export interface StoryEmpathy {
  id: string;
  storyId: string;
  bookId: string;
  authorUserId: string;
  voterUserId: string;
  heartCount: number;
  createdAt: string;
  updatedAt: string;
}

export type ModerationReportSource =
  | "reflection"
  | "chat_message"
  | "chat_room"
  | "shared_sentence"
  | "dictionary"
  | "ai_helper"
  | "profile";

export interface ModerationReport {
  id: string;
  userId: string;
  source: ModerationReportSource;
  status: "pending" | "dismissed";
  reason?: "profanity" | "pii";
  preview: string;
  bookId?: string;
  bookTitle?: string;
  fieldLabel?: string;
  createdAt: string;
  reviewedAt?: string;
}

export interface AiHelperMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface AiHelperSession {
  id: string;
  userId: string;
  bookId?: string;
  bookTitle?: string;
  messages: AiHelperMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface Database {
  users: User[];
  books: Book[];
  reflections: Reflection[];
  chatRooms: ChatRoom[];
  chatMessages: ChatMessage[];
  chatMessageHearts: ChatMessageHeart[];
  chatMemberships: ChatMembership[];
  vocabulary: VocabularyEntry[];
  sharedSentences: SharedSentence[];
  storyEmpathies: StoryEmpathy[];
  moderationReports: ModerationReport[];
  aiHelperSessions: AiHelperSession[];
}

export type RandomFeedItem =
  | { type: "before_question"; text: string; bookTitle: string; username: string }
  | { type: "during_question"; text: string; bookTitle: string; username: string }
  | { type: "association"; text: string; bookTitle: string; username: string }
  | { type: "quote"; text: string; bookTitle: string; username: string }
  | { type: "shared_sentence"; text: string; word: string; username: string };

export type CarouselMomentKind =
  | "before_question"
  | "during_question"
  | "association"
  | "quote"
  | "memorable_scene";

export interface CarouselMoment {
  kind: CarouselMomentKind;
  text?: string;
  imageUrl?: string;
  bookTitle?: string;
}

export interface CarouselFeedItem {
  id: string;
  bookId: string;
  username: string;
  bookTitle: string;
  bookAuthor?: string;
  coverUrl?: string;
  moments: CarouselMoment[];
}

export interface BookSearchResult {
  isbn?: string;
  title: string;
  author?: string;
  coverUrl?: string;
  publisher?: string;
  totalPages?: number;
}
