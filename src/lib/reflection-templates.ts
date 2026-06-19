import type { BeforeReadingActivity, BeforeReadingPair } from "./types";

export type ReflectionSection =
  | "before_reading"
  | "during_reading"
  | "association"
  | "quote"
  | "review"
  | "memorable_scene";

export const SECTION_LABELS: Record<ReflectionSection, string> = {
  before_reading: "읽기 전",
  during_reading: "읽는 중",
  association: "이 책은 이럴때",
  quote: "책속 한마디",
  review: "감상문",
  memorable_scene: "기억에 남는 장면",
};

export const BEFORE_READING_QUESTIONS = [
  { key: "title", question: "제목을 보고 어떤 생각이 들었나요?" },
  { key: "toc", question: "차례를 훑어봤나요? 어떤 부분이 궁금했나요?" },
  { key: "pictures", question: "책속 그림을 훑어보며 떠오른 생각은?" },
  { key: "skim", question: "글을 가볍게 훑어보며 알 수 있었던 것은?" },
];

export const DURING_READING_QUESTIONS = [
  { key: "fact", question: "책 내용에서 바로 답을 찾을 수 있는 질문과 답" },
  { key: "guess", question: "책 내용에서 답을 짐작하는 질문과 답" },
  { key: "feeling", question: "책을 읽고 떠오른 생각이나 느낌" },
  { key: "life", question: "자신의 삶과 관련지어 생각해 본 점" },
];

export const SECTION_ORDER: ReflectionSection[] = [
  "before_reading",
  "during_reading",
  "association",
  "quote",
  "review",
  "memorable_scene",
];

export function pairsToLegacyReflection(
  pairs: BeforeReadingPair[],
  activities?: BeforeReadingActivity[]
) {
  return pairs
    .filter((p) => {
      if (!p.ask.trim() && !p.guess.trim()) return false;
      if (p.activityKey) {
        const activity = activities?.find((a) => a.key === p.activityKey);
        if (activity && !activity.checked) return false;
      }
      return true;
    })
    .map((p) => {
      const label = activities?.find((a) => a.key === p.activityKey)?.label;
      if (label) {
        const parts = [label];
        if (p.ask.trim()) parts.push(`질문: ${p.ask.trim()}`);
        if (p.guess.trim()) parts.push(`짐작: ${p.guess.trim()}`);
        return { question: parts[0], answer: parts.slice(1).join(" / ") || p.guess };
      }
      return { question: p.ask, answer: p.guess };
    });
}

export const pairsToLegacyBeforeReading = pairsToLegacyReflection;
export const pairsToLegacyDuringReading = pairsToLegacyReflection;

export function defaultReadingActivities(
  questions: { key: string; question: string }[]
): BeforeReadingActivity[] {
  return questions.map((q) => ({
    key: q.key,
    label: q.question,
    checked: false,
  }));
}

export function defaultBeforeReadingActivities(): BeforeReadingActivity[] {
  return defaultReadingActivities(BEFORE_READING_QUESTIONS);
}

export function defaultDuringReadingActivities(): BeforeReadingActivity[] {
  return defaultReadingActivities(DURING_READING_QUESTIONS);
}

export function defaultBeforeReadingPairs(): BeforeReadingPair[] {
  return [];
}

export function defaultDuringReadingPairs(): BeforeReadingPair[] {
  return [];
}

export function loadReadingActivities(
  questions: { key: string; question: string }[],
  stored?: BeforeReadingActivity[],
  legacy?: { question: string; answer: string }[]
): BeforeReadingActivity[] {
  const answered = new Set(
    (legacy || []).filter((q) => q.answer?.trim()).map((q) => q.question)
  );
  return questions.map((q) => {
    const fromStored = stored?.find((a) => a.key === q.key);
    return {
      key: q.key,
      label: q.question,
      checked: fromStored?.checked ?? answered.has(q.question),
    };
  });
}

export function loadBeforeReadingActivities(
  stored?: BeforeReadingActivity[],
  legacy?: { question: string; answer: string }[]
): BeforeReadingActivity[] {
  return loadReadingActivities(BEFORE_READING_QUESTIONS, stored, legacy);
}

export function loadDuringReadingActivities(
  stored?: BeforeReadingActivity[],
  legacy?: { question: string; answer: string }[]
): BeforeReadingActivity[] {
  return loadReadingActivities(DURING_READING_QUESTIONS, stored, legacy);
}

export function loadReadingPairs(
  questions: { key: string; question: string }[],
  stored?: BeforeReadingPair[],
  legacy?: { question: string; answer: string }[]
): BeforeReadingPair[] {
  if (stored?.length) return stored;
  const fromLegacy = (legacy || []).filter((q) => q.question?.trim() || q.answer?.trim());
  if (fromLegacy.length > 0) {
    return fromLegacy.map((q) => {
      const matched = questions.find(
        (bq) => q.question === bq.question || q.question?.startsWith(bq.question)
      );
      if (matched) {
        return { activityKey: matched.key, ask: q.answer || "", guess: "" };
      }
      return { ask: q.question, guess: q.answer };
    });
  }
  return [];
}

export function loadBeforeReadingPairs(
  stored?: BeforeReadingPair[],
  legacy?: { question: string; answer: string }[]
): BeforeReadingPair[] {
  return loadReadingPairs(BEFORE_READING_QUESTIONS, stored, legacy);
}

export function loadDuringReadingPairs(
  stored?: BeforeReadingPair[],
  legacy?: { question: string; answer: string }[]
): BeforeReadingPair[] {
  return loadReadingPairs(DURING_READING_QUESTIONS, stored, legacy);
}

export function syncPairsWithActivities(
  pairs: BeforeReadingPair[],
  activities: BeforeReadingActivity[]
): BeforeReadingPair[] {
  let next = [...pairs];
  for (const activity of activities) {
    if (activity.checked && !next.some((p) => p.activityKey === activity.key)) {
      next.push({ activityKey: activity.key, ask: "", guess: "" });
    }
  }
  return next;
}

export function bookTopicLabel(title: string): string {
  if (!title) return "이 책은";
  const last = title.charCodeAt(title.length - 1);
  if (last >= 0xac00 && last <= 0xd7a3) {
    const hasBatchim = (last - 0xac00) % 28 !== 0;
    return `${title}${hasBatchim ? "은" : "는"}`;
  }
  return `${title}은`;
}

export function getAssociationPrefix(bookTitle: string): string {
  return bookTitle ? `${bookTopicLabel(bookTitle)} ` : "이 책은 ";
}

export function stripBookTitleFromAssociation(bookTitle: string, text: string): string {
  if (!text) return "";
  if (!bookTitle) return text;

  const trimmed = text.trim();
  const prefixes = [
    getAssociationPrefix(bookTitle),
    `${bookTopicLabel(bookTitle)} `,
    `${bookTitle}은 `,
    `${bookTitle}는 `,
  ];

  for (const prefix of prefixes) {
    if (trimmed.startsWith(prefix)) return trimmed.slice(prefix.length);
  }

  const escaped = bookTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*");
  const match = trimmed.match(new RegExp(`^${escaped}\\s*(은|는)\\s*`));
  if (match) return trimmed.slice(match[0].length);

  const compactTitle = bookTitle.replace(/\s+/g, "");
  if (compactTitle !== bookTitle) {
    const compactEscaped = compactTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const compactMatch = trimmed.match(new RegExp(`^${compactEscaped}\\s*(은|는)\\s*`));
    if (compactMatch) return trimmed.slice(compactMatch[0].length);
  }

  return trimmed;
}

export function buildAssociationSentence(bookTitle: string, whenPart: string): string {
  const suffix = stripBookTitleFromAssociation(bookTitle, whenPart.trim());
  if (!suffix) return "";
  if (!bookTitle) return suffix;
  return getAssociationPrefix(bookTitle) + suffix;
}
