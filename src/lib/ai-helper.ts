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

function getFirstEmptyReviewField(draft: ReviewDraft) {
  return REVIEW_FIELDS.find((f) => !draft[f.key]?.trim()) ?? null;
}

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
  const nextField = getFirstEmptyReviewField(draft);
  return `당신은 초등학생을 돕는 따뜻한 독서 도우미입니다. 지금 학생은 「감상문」을 쓰는 중입니다.

[지금까지 적은 내용]
${buildReviewDraftSummary(draft)}

[대화 방식 — 꼭 지켜 주세요]
1. 학생이 한 말을 먼저 짧게 되짚어 주세요. (예: "○○ 장면이 제일 기억에 남는다고 했구나.")
2. 질문은 한 번에 하나만 하세요.
3. 답을 대신 길게 쓰지 말고, 학생이 스스로 쓰게 이끌어 주세요. 필요하면 문장 한 줄 예시만 제시하세요.
4. 감상문 순서를 자연스럽게 안내하세요: 감상문 제목 → 읽은 까닭 → 책의 내용 → 인상 깊은 장면 → 읽고 떠오른 생각.
5. 쉬운 말, 2~4문장 이내로 답하세요. 이모지는 0~1개만 써도 됩니다.
6. 욕설이나 부적절한 표현은 사용하지 마세요.
${nextField ? `\n[지금 우선 도와줄 칸]\n「${nextField.label}」 — ${nextField.hint}` : "\n[지금]\n대부분의 칸이 채워졌어요. 전체를 다듬거나 마음에 드는 부분을 칭찬해 주세요."}`;
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
  const nextField = getFirstEmptyReviewField(draft);
  const book = draft.bookTitle?.trim() ? `「${draft.bookTitle.trim()}」` : "이 책";

  if (isGreeting) {
    return REVIEW_HELPER_GREETING;
  }

  if (!lastUser) {
    if (nextField) {
      return `안녕! ${book} 감상문을 같이 써 볼까?\n\n먼저 「${nextField.label}」부터 생각해 보자.\n${nextField.hint}`;
    }
    return `안녕! ${book} 감상문을 많이 써 두었네.\n\n가장 마음에 드는 부분이 어느 칸인지 말해 줄래?`;
  }

  const lower = lastUser.toLowerCase();

  if (lower.includes("예시") || lower.includes("예를")) {
    const examples: Record<string, string> = {
      reviewTitle: "용기를 배운 하루",
      reviewReason: "친구가 재미있다고 해서 빌려 읽었어요.",
      reviewContent: "주인공이 어려운 일을 겪지만 친구들과 함께 해결해요.",
      reviewImpressiveScene: "주인공이 친구를 도와준 장면이 가장 기억에 남아요.",
      reviewThoughts: "나도 친구에게 먼저 다가가 봐야겠다고 생각했어요.",
    };
    const key = nextField?.key ?? "reviewThoughts";
    return `예를 들면 이렇게 쓸 수 있어.\n\n"${examples[key]}"\n\n꼭 똑같이 쓰지 말고, 네 말로 바꿔 볼래?`;
  }

  if (
    lower.includes("뭐") ||
    lower.includes("어떻") ||
    lower.includes("모르") ||
    lower.includes("힘들") ||
    lower.includes("어려")
  ) {
    if (nextField) {
      return `괜찮아, 처음엔 다들 어려워.\n\n「${nextField.label}」은 ${nextField.hint}\n\n한 문장만 적어도 충분해!`;
    }
    return `괜찮아! 이미 많이 썼어.\n\n"${snippet(lastUser)}"라고 한 부분을 감상문 칸에 옮겨 적어 보면 돼.`;
  }

  if (nextField) {
    return `"${snippet(lastUser)}" 이야기 고마워!\n\n그 생각을 「${nextField.label}」 칸에 쓰면 좋겠어.\n${nextField.hint}`;
  }

  return `"${snippet(lastUser)}" 정말 좋은 생각이야!\n\n이미 감상문이 잘 채워지고 있어. 마음에 드는 문장을 한 번 더 다듬어 볼까?`;
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

    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      try {
        const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
          { role: "system", content: buildReviewSystemPrompt(reviewDraft) },
        ];

        for (const m of messages) {
          chatMessages.push({ role: m.role, content: m.content });
        }

        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: chatMessages,
            max_tokens: 350,
            temperature: 0.7,
          }),
        });
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content?.trim();
        if (reply) return reply;
      } catch {
        /* fallback below */
      }
    }

    return getReviewFallbackReply(reviewDraft, messages, isGreeting);
  }

  // 다른 단계는 도우미 미사용 — review 전용으로 유지
  return getReviewFallbackReply(reviewDraft, messages, isGreeting);
}
