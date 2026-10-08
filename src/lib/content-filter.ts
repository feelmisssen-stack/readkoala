/** watch: 막지는 않고 선생님 확인용으로 안전 검토에만 올린다 */
export type ContentFilterReason = "profanity" | "pii" | "watch";

export interface ContentFilterResult {
  ok: boolean;
  message?: string;
  reason?: ContentFilterReason;
}

export interface ValidateContentOptions {
  /** 닉네임 등 이름 입력이 허용되는 필드 */
  allowPersonalName?: boolean;
}

/**
 * 글 속 어디에 있든 막는 말. 책 제목·감상문에 흔한 말(똥, 바보, 쓰레기, 한심, 꺼져, 뒤져, 싫어해)은
 * "별똥별", "바보 온달", "불이 꺼져서"처럼 잘못 걸려서 넣지 않는다.
 */
const BANNED_WORDS = [
  "멍청",
  "미친",
  "병신",
  "개새",
  "씨발",
  "시발",
  "좆",
  "지랄",
  "닥쳐",
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
  "엿먹",
  "fuck",
  "shit",
  "bitch",
  "damn",
];

/** "가 보지 않았다", "잠을 자지 못했다"처럼 부정·권유 표현이 뒤따르면 막지 않는다 (공백 제거 후 검사) */
const NEGATABLE_BANNED_PATTERN = /(?:보지|자지)(?!않|못|마|말|도|만|는|그|요)/;

/** 이야기 속에서도 쓰이는 말이라 막지 않고 안전 검토에만 올린다. 예: "죽어버려" */
const WATCH_WORDS = ["죽어"];

const PROFANITY_MESSAGE =
  "부적절한 표현이 있어요. 다른 말로 바꿔주세요";

const PII_MESSAGE =
  "내 이름, 전화번호, 주소, 이메일 같은 개인정보는 입력할 수 없어요. 지워 주세요. (책 속 인물 이름은 괜찮아요)";

function normalizeForMatch(text: string): string {
  return text.toLowerCase().replace(/\s/g, "");
}

export function containsProfanity(text: string): boolean {
  if (!text?.trim()) return false;
  const normalized = normalizeForMatch(text);
  return (
    BANNED_WORDS.some((word) => normalized.includes(word.replace(/\s/g, ""))) ||
    NEGATABLE_BANNED_PATTERN.test(normalized)
  );
}

/** 막지는 않지만 선생님이 확인할 만한 글을 찾는다 */
export function findWatchedText(texts: string[]): string | undefined {
  return texts.find((text) => {
    if (!text?.trim()) return false;
    const normalized = normalizeForMatch(text);
    return WATCH_WORDS.some((word) => normalized.includes(word));
  });
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

/**
 * 본인 이름을 밝히는 문장만 막는다. 예: "제 이름은 김민수입니다"
 * 감상문에는 책 속 인물 이름이 자주 나오므로 "주인공 이름은 와니니이다", "나는 해리야" 같은
 * 문장은 막지 않는다. 다만 인물 대사가 "내 이름은 삐삐야"처럼 본인 소개 형태이면 함께 막힌다.
 */
const SELF_NAME_PATTERN =
  /(?:내|제|나의|저의)\s*(?:이름|실명|성함)\s*(?:은|는)\s*[가-힣]{2,4}\s*(?:이에요|입니다|이야|이다|예요|이고|이라고|라고|야|고|임|[.,!?~]|$)/m;

function hasExplicitNameDisclosure(text: string): boolean {
  return SELF_NAME_PATTERN.test(text);
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
