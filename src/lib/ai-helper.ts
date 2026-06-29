import { callGeminiGenerateContent } from "@/lib/gemini";

export type WritingContext =
  | "before_reading"
  | "during_reading"
  | "association"
  | "quote"
  | "review";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ReviewDraft {
  bookTitle?: string;
  reviewTitle?: string;
  reviewReason?: string;
  reviewContent?: string;
  reviewImpressiveScene?: string;
  reviewThoughts?: string;
}

export const REVIEW_HELPER_GREETING =
  "안녕? 나는 감상문 기록 도우미야. 감상문 기록에서 어떤 점이 어렵니?";

const REVIEW_FIELDS: { key: keyof ReviewDraft; label: string; hint: string }[] = [
  { key: "reviewTitle", label: "감상문 제목", hint: "이 책을 한 줄로 표현하면 어떤 제목이 어울릴까요?" },
  {
    key: "reviewReason",
    label: "책을 읽은 까닭",
    hint: "이 책을 읽게 된 이유가 있나요? 친구 추천, 표지, 제목 중 뭐가 끌렸나요?",
  },
  {
    key: "reviewContent",
    label: "책의 내용",
    hint: "이야기를 짧게 말해 볼까요? 누가, 어디서, 무슨 일이 있었는지요.",
  },
  {
    key: "reviewImpressiveScene",
    label: "인상 깊은 장면",
    hint: "가장 기억에 남는 장면은 어떤 장면이었나요?",
  },
  {
    key: "reviewThoughts",
    label: "읽고 떠오른 생각이나 느낌",
    hint: "책을 다 읽고 나서 어떤 생각이나 느낌이 들었나요?",
  },
];

function buildReviewDraftSummary(draft: ReviewDraft): string {
  const lines: string[] = [];
  if (draft.bookTitle?.trim()) lines.push(`책 제목: ${draft.bookTitle.trim()}`);
  for (const field of REVIEW_FIELDS) {
    const value = draft[field.key]?.trim();
    lines.push(`${field.label}: ${value ? value : "(아직 비어 있음)"}`);
  }
  return lines.join("\n");
}

function buildReviewSystemPrompt(draft: ReviewDraft): string {
  return `당신은 초등학생을 돕는 따뜻한 독서 도우미입니다. 지금 학생은 「감상문」을 쓰는 중입니다.

[지금까지 감상문에 적어 둔 내용 — 참고만 하세요]
${buildReviewDraftSummary(draft)}

[대화 방식 — 꼭 지켜 주세요]
1. 학생이 방금 한 말에 가장 먼저 반응하세요. 짧게 되짚거나 공감해 주세요.
2. 감상문 항목 순서(제목→까닭→내용→장면→느낌)를 맞추려고 억지로 끌고 가지 마세요.
3. 학생이 궁금해한 것, 힘들어한 것, 좋아한 것에 맞춰 대화를 이어 가세요.
4. 질문은 한 번에 하나만 하세요.
5. 답을 대신 길게 쓰지 말고, 학생이 스스로 감상문 칸에 쓸 수 있게 이끌어 주세요. 필요하면 문장 한 줄 예시만 제시하세요.
6. 쉬운 말, 2~4문장 이내로 답하세요. 이모지는 0~1개만 써도 됩니다.
7. 욕설이나 부적절한 표현은 사용하지 마세요.
8. 아직 비어 있는 칸이 있어도, 지금 대화 흐름이 더 중요합니다. 필요할 때만 자연스럽게 감상문 작성을 돕으세요.`;
}

function snippet(text: string, max = 28): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function getReviewFallbackReply(
  draft: ReviewDraft,
  messages: ChatMessage[],
  isGreeting?: boolean
): string {
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content?.trim();
  const book = draft.bookTitle?.trim() ? `「${draft.bookTitle.trim()}」` : "이 책";

  if (isGreeting) {
    return REVIEW_HELPER_GREETING;
  }

  if (!lastUser) {
    return `안녕! ${book} 감상문을 같이 생각해 볼까?\n\n지금 떠오르는 말이나 어려운 점을 편하게 말해 줘.`;
  }

  const lower = lastUser.toLowerCase();

  if (lower.includes("예시") || lower.includes("예를")) {
    return `좋아! 예를 들면 이렇게 쓸 수 있어.\n\n"주인공이 친구를 도와준 장면이 가장 기억에 남아요."\n\n꼭 똑같이 쓰지 말고, 네 말로 바꿔 볼래?`;
  }

  if (
    lower.includes("뭐") ||
    lower.includes("어떻") ||
    lower.includes("모르") ||
    lower.includes("힘들") ||
    lower.includes("어려")
  ) {
    return `괜찮아, 처음엔 다들 어려워.\n\n"${snippet(lastUser)}"라고 한 부분부터 천천히 말해 볼까?\n\n한 문장만 적어도 충분해!`;
  }

  return `"${snippet(lastUser)}" 이야기 고마워!\n\n그 생각을 감상문 칸에 옮겨 적어 보면 좋겠어. 더 말하고 싶은 게 있니?`;
}

export async function getWritingHelp(options: {
  context: WritingContext;
  messages?: ChatMessage[];
  reviewDraft?: ReviewDraft;
  isGreeting?: boolean;
}): Promise<string> {
  const { context, messages = [], reviewDraft = {}, isGreeting } = options;

  if (context === "review") {
    if (isGreeting && messages.length === 0) {
      return REVIEW_HELPER_GREETING;
    }

    try {
      const reply = await callGeminiGenerateContent({
        systemInstruction: buildReviewSystemPrompt(reviewDraft),
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        temperature: 0.7,
        maxOutputTokens: 350,
      });
      if (reply) return reply;
    } catch {
      /* fallback below */
    }

    return getReviewFallbackReply(reviewDraft, messages, isGreeting);
  }

  // 다른 단계는 도우미 미사용 — review 전용으로 유지
  return getReviewFallbackReply(reviewDraft, messages, isGreeting);
}
