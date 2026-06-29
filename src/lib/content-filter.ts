export type ContentFilterReason = "profanity" | "pii";

export interface ContentFilterResult {
  ok: boolean;
  message?: string;
  reason?: ContentFilterReason;
}

export interface ValidateContentOptions {
  /** 닉네임 등 이름 입력이 허용되는 필드 */
  allowPersonalName?: boolean;
}

const BANNED_WORDS = [
  "바보",
  "멍청",
  "죽어",
  "똥",
  "싫어해",
  "미친",
  "병신",
  "개새",
  "씨발",
  "시발",
  "좆",
  "지랄",
  "닥쳐",
  "꺼져",
  "쓰레기",
  "한심",
  "찌질",
  "븅신",
  "ㅅㅂ",
  "ㅂㅅ",
  "ㅈㄹ",
  "개같",
  "개같은",
  "미친놈",
  "미친년",
  "죽여",
  "뒤져",
  "엿먹",
  "보지",
  "자지",
  "fuck",
  "shit",
  "bitch",
  "damn",
];

const PROFANITY_MESSAGE =
  "부적절한 표현이 있어요. 다른 말로 바꿔주세요";

const PII_MESSAGE =
  "이름, 전화번호, 주소, 이메일 같은 개인정보는 입력할 수 없어요. 지워 주세요.";

function normalizeForMatch(text: string): string {
  return text.toLowerCase().replace(/\s/g, "");
}

export function containsProfanity(text: string): boolean {
  if (!text?.trim()) return false;
  const normalized = normalizeForMatch(text);
  return BANNED_WORDS.some((word) => normalized.includes(word.replace(/\s/g, "")));
}

function hasEmail(text: string): boolean {
  return /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
}

function hasPhoneNumber(text: string): boolean {
  const compact = text.replace(/\s/g, "");
  const patterns = [
    /01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}/,
    /0\d{1,2}[-\s.]?\d{3,4}[-\s.]?\d{4}/,
    /(?:전화|휴대폰|핸드폰|연락처|폰번호).{0,8}\d{7,11}/,
  ];
  return patterns.some((pattern) => pattern.test(compact) || pattern.test(text));
}

function hasResidentRegistrationNumber(text: string): boolean {
  const compact = text.replace(/\s/g, "");
  return (
    /\d{6}[-\s]?[1-4]\d{6}/.test(compact) ||
    /(?:주민등록|주민번호|주민).{0,6}\d{6}/.test(text)
  );
}

function hasAddressPattern(text: string): boolean {
  const patterns = [
    /(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주).{0,25}(?:시|군|구).{0,40}(?:동|읍|면|리|로|길)/,
    /\d{1,5}(?:번지|호)/,
    /(?:주소|사는 곳|집은).{0,10}(?:시|군|구|동|로|길)/,
  ];
  return patterns.some((pattern) => pattern.test(text));
}

function hasExplicitNameDisclosure(text: string): boolean {
  const patterns = [
    /(?:내\s*이름|제\s*이름|실명|성함).{0,10}[가-힣]{2,5}/,
    /(?:이름은|이름이)\s*[가-힣]{2,5}\s*(?:이에요|입니다|이야|이다|예요|야)/,
    /(?:저는|나는)\s*[가-힣]{2,4}\s*(?:이에요|입니다|이야|이다|예요|야)/,
  ];
  return patterns.some((pattern) => pattern.test(text));
}

export function containsPersonalInfo(text: string, options?: ValidateContentOptions): boolean {
  if (!text?.trim()) return false;
  if (options?.allowPersonalName) {
    return (
      hasEmail(text) ||
      hasPhoneNumber(text) ||
      hasResidentRegistrationNumber(text) ||
      hasAddressPattern(text)
    );
  }
  return (
    hasEmail(text) ||
    hasPhoneNumber(text) ||
    hasResidentRegistrationNumber(text) ||
    hasAddressPattern(text) ||
    hasExplicitNameDisclosure(text)
  );
}

export function containsInappropriateContent(text: string): boolean {
  return containsProfanity(text) || containsPersonalInfo(text);
}

export function validateContent(
  texts: string | string[],
  options?: ValidateContentOptions
): ContentFilterResult {
  const list = (Array.isArray(texts) ? texts : [texts]).filter(
    (text): text is string => typeof text === "string"
  );

  for (const text of list) {
    if (!text?.trim()) continue;
    if (containsProfanity(text)) {
      return { ok: false, message: PROFANITY_MESSAGE, reason: "profanity" };
    }
    if (containsPersonalInfo(text, options)) {
      return { ok: false, message: PII_MESSAGE, reason: "pii" };
    }
  }
  return { ok: true };
}

export function validateNickname(text: string): ContentFilterResult {
  return validateContent(text, { allowPersonalName: true });
}

function addText(target: string[], value: unknown) {
  if (typeof value === "string" && value.trim()) {
    target.push(value.trim());
  }
}

function addPairs(
  target: string[],
  pairs: unknown,
  keys: Array<"ask" | "guess" | "question" | "answer">
) {
  if (!Array.isArray(pairs)) return;
  for (const pair of pairs) {
    if (!pair || typeof pair !== "object") continue;
    for (const key of keys) {
      addText(target, (pair as Record<string, unknown>)[key]);
    }
  }
}

export function collectReflectionTexts(body: Record<string, unknown>): string[] {
  const texts: string[] = [];
  addText(texts, body.association);
  addText(texts, body.favoriteQuote);
  addText(texts, body.reviewTitle);
  addText(texts, body.reviewReason);
  addText(texts, body.reviewContent);
  addText(texts, body.reviewImpressiveScene);
  addText(texts, body.reviewThoughts);
  addPairs(texts, body.beforeReading, ["question", "answer"]);
  addPairs(texts, body.duringReading, ["question", "answer"]);
  addPairs(texts, body.beforeReadingPairs, ["ask", "guess"]);
  addPairs(texts, body.duringReadingPairs, ["ask", "guess"]);
  return texts;
}

export function collectAiUserTexts(messages: Array<{ role?: string; content?: string }>): string[] {
  return messages
    .filter((message) => message.role === "user")
    .map((message) => message.content?.trim() || "")
    .filter(Boolean);
}
