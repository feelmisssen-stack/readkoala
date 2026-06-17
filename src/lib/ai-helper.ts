type WritingContext =
  | "before_reading"
  | "during_reading"
  | "association"
  | "quote"
  | "review";

const TIPS: Record<WritingContext, string[]> = {
  before_reading: [
    "책 표지를 보고 어떤 이야기일지 상상해 보세요.",
    "차례를 펼쳐 보며 가장 읽고 싶은 부분을 골라 보세요.",
    "그림이 있다면 그림만 보고 떠오르는 생각을 적어 보세요.",
    "제목만 보고 이 책이 무엇에 관한 책인지 짐작해 보세요.",
  ],
  during_reading: [
    "방금 읽은 부분에서 가장 기억에 남는 장면을 적어 보세요.",
    "주인공이 왜 그렇게 행동했을까요?",
    "만약 내가 주인공이라면 어떻게 했을까요?",
    "이 장면을 읽으며 어떤 기분이 들었나요?",
  ],
  association: [
    "이 책이 떠오르는 상황을 하나 골라 보세요. 예: 비가 올 때, 친구와 싸울 때…",
    "책 속 인물이 나와 비슷한 점이 있나요?",
    "이 책을 한 단어로 표현한다면 어떤 말이 좋을까요?",
  ],
  quote: [
    "마음에 남는 문장을 그대로 적어 보세요.",
    "왜 그 문장이 좋았는지 한 줄 덧붙여 보세요.",
    "책에서 가장 감동받은 말을 찾아 보세요.",
  ],
  review: [
    "책을 읽게 된 이유부터 차근차근 적어 보세요.",
    "가장 인상 깊었던 장면을 자세히 묘사해 보세요.",
    "이 책을 친구에게 추천한다면 어떤 말을 해 줄까요?",
    "책을 읽고 나서 달라진 생각이 있나요?",
  ],
};

export async function getWritingHelp(
  context: WritingContext,
  userMessage?: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey && userMessage?.trim()) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `당신은 초등학생 독서 도우미 코알라입니다. 친근하고 쉬운 말로 감상문 작성을 도와주세요. 현재 작성 단계: ${context}. 욕설이나 부적절한 표현은 사용하지 마세요.`,
            },
            { role: "user", content: userMessage },
          ],
          max_tokens: 300,
        }),
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content;
      if (reply) return reply;
    } catch {
      /* fallback below */
    }
  }

  const tips = TIPS[context];
  const tip = tips[Math.floor(Math.random() * tips.length)];

  if (!userMessage?.trim()) {
    return `안녕! 나는 독서 도우미 코알라야 🐨\n\n${tip}\n\n궁금한 게 있으면 편하게 물어봐!`;
  }

  const lower = userMessage.toLowerCase();
  if (lower.includes("뭐") || lower.includes("어떻") || lower.includes("모르")) {
    return `괜찮아! 처음엔 어려울 수 있어.\n\n💡 ${tip}\n\n짧게 한 문장만 적어도 좋아. 네 생각이 가장 중요해!`;
  }
  if (lower.includes("예시") || lower.includes("예")) {
    return `예시를 들어 볼게!\n\n"${getExample(context)}"\n\n이건 참고만 하고, 네 말로 바꿔서 적어 봐!`;
  }

  return `좋은 질문이야!\n\n💡 ${tip}\n\n천천히 생각해 보고, 네 느낌을 솔직하게 적어 봐.`;
}

function getExample(context: WritingContext): string {
  switch (context) {
    case "before_reading":
      return "표지에 그려진 숲을 보니 모험 이야기일 것 같아요.";
    case "during_reading":
      return "주인공이 친구를 도와준 장면이 가장 기억에 남아요.";
    case "association":
      return "이 책은 용기가 필요할 때 생각나는 책이에요.";
    case "quote":
      return "『친구는 함께 있으면 든든해』";
    case "review":
      return "이 책을 읽고 나서 친구에게 더 잘 해주고 싶다는 생각이 들었어요.";
  }
}
