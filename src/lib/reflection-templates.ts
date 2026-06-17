export type ReflectionSection =
  | "before_reading"
  | "during_reading"
  | "association"
  | "quote"
  | "review";

export const SECTION_LABELS: Record<ReflectionSection, string> = {
  before_reading: "읽기 전",
  during_reading: "읽는 중",
  association: "연상하는 책",
  quote: "책속 한마디",
  review: "감상문",
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
];
