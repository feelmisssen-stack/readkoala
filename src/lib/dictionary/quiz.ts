import { getInitialConsonant } from "@/lib/dictionary/initial-consonant";
import type { VocabularyEntry } from "@/lib/types";

export interface VocabQuiz {
  id: string;
  hint: string;
  definition: string;
  answerLength: number;
}

export function normalizeQuizWord(input: unknown): string {
  return String(input ?? "")
    .trim()
    .replaceAll("-", "")
    .replaceAll(" ", "");
}

export function checkQuizAnswer(word: string, answer: unknown): boolean {
  const expected = normalizeQuizWord(word);
  const given = normalizeQuizWord(answer);
  return expected.length > 0 && expected === given;
}

export function pickVocabQuiz(
  words: Array<Pick<VocabularyEntry, "id" | "word" | "definition">>,
  excludeIds: string[] = []
): { quiz: VocabQuiz | null; completed?: boolean; message?: string } {
  if (words.length === 0) {
    return { quiz: null, message: "낱말집에 단어를 먼저 추가해 주세요." };
  }

  let pool = words;
  const excludes = excludeIds.map((id) => id.trim()).filter(Boolean);
  if (excludes.length > 0) {
    const filtered = words.filter((word) => !excludes.includes(word.id));
    if (filtered.length > 0) {
      pool = filtered;
    } else if (excludes.length >= words.length) {
      return { quiz: null, completed: true, message: "모든 낱말을 맞혔어요!" };
    }
  }

  const word = pool[Math.floor(Math.random() * pool.length)]!;
  const normalized = normalizeQuizWord(word.word);
  return {
    quiz: {
      id: word.id,
      hint: getInitialConsonant(normalized),
      definition: word.definition,
      answerLength: normalized.length,
    },
  };
}
