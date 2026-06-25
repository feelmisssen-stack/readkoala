"use client";

import { useEffect, useState } from "react";
import { BookMarked, CheckCircle2, Trash2 } from "lucide-react";
import { iconSm } from "@/lib/icon-styles";

interface VocabEntry {
  id: string;
  word: string;
  definition: string;
}

interface SharedSentence {
  id: string;
  userId: string;
  username: string;
  word: string;
  sentence: string;
}

interface Quiz {
  id: string;
  hint: string;
  definition: string;
  answerLength: number;
}

type LookupMode = "search" | "quiz";

function normalizeDisplayWord(input: string): string {
  return input.replaceAll("-", "");
}

export default function DictionaryPage() {
  const [word, setWord] = useState("");
  const [lookupMode, setLookupMode] = useState<LookupMode>("search");
  const [result, setResult] = useState<{
    word: string;
    definition: string;
    error?: string;
    source?: string;
  } | null>(null);
  const [apiConfigured, setApiConfigured] = useState(true);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiKeySaving, setApiKeySaving] = useState(false);
  const [apiKeyError, setApiKeyError] = useState("");
  const [vocabulary, setVocabulary] = useState<VocabEntry[]>([]);
  const [sentences, setSentences] = useState<SharedSentence[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [quizMessage, setQuizMessage] = useState("");
  const [quizAnswer, setQuizAnswer] = useState("");
  const [quizResult, setQuizResult] = useState<"correct" | "retry" | "incorrect" | null>(null);
  const [quizWrongCount, setQuizWrongCount] = useState(0);
  const [solvedQuizIds, setSolvedQuizIds] = useState<Set<string>>(new Set());
  const [newSentence, setNewSentence] = useState("");
  const [sentenceWord, setSentenceWord] = useState("");
  const [deletingSentenceId, setDeletingSentenceId] = useState<string | null>(null);
  const [deletingVocabId, setDeletingVocabId] = useState<string | null>(null);

  function loadVocab() {
    fetch("/api/dictionary/vocabulary")
      .then((r) => r.json())
      .then((d) => setVocabulary(d.vocabulary || []));
  }

  function loadSentences() {
    fetch("/api/dictionary/sentences")
      .then((r) => r.json())
      .then((d) => setSentences(d.sentences || []));
  }

  useEffect(() => {
    fetch("/api/auth/me").then((r) => {
      if (r.status === 401 || r.ok) {
        r.json().then((d) => {
          if (!d.user) window.location.href = "/";
          else setCurrentUserId(d.user.id);
        });
      }
    });
    loadVocab();
    loadSentences();
    fetch("/api/dictionary/status")
      .then((r) => r.json())
      .then((d) => setApiConfigured(!!d.configured))
      .catch(() => setApiConfigured(false));
  }, []);

  async function saveApiKey() {
    setApiKeySaving(true);
    setApiKeyError("");
    try {
      const res = await fetch("/api/dictionary/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKeyInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setApiKeyError(data.error || "저장에 실패했어요.");
        return;
      }
      setApiConfigured(true);
      setApiKeyInput("");
    } finally {
      setApiKeySaving(false);
    }
  }

  async function lookup() {
    if (!word.trim()) return;
    const res = await fetch(`/api/dictionary/lookup?word=${encodeURIComponent(word)}`);
    const data = await res.json();
    setResult(data.result);
  }

  async function addToVocab() {
    if (!result) return;
    await fetch("/api/dictionary/vocabulary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word: result.word, definition: result.definition }),
    });
    loadVocab();
  }

  async function startQuiz(resetRound = false) {
    setQuizMessage("");
    const excludes = resetRound ? [] : [...solvedQuizIds];
    if (!resetRound && quiz?.id && !excludes.includes(quiz.id)) {
      excludes.push(quiz.id);
    }
    const excludeParam =
      excludes.length > 0 ? `?exclude=${encodeURIComponent(excludes.join(","))}` : "";
    const res = await fetch(`/api/dictionary/quiz${excludeParam}`);
    const data = await res.json();
    if (!data.quiz) {
      setQuiz(null);
      if (data.completed) {
        setQuizMessage(data.message || "모든 낱말을 맞혔어요!");
      } else {
        setQuizMessage(data.message || "낱말집에 단어를 먼저 추가해 주세요.");
      }
      return;
    }
    if (resetRound) setSolvedQuizIds(new Set());
    setQuiz(data.quiz);
    setQuizAnswer("");
    setQuizResult(null);
    setQuizWrongCount(0);
  }

  function switchToQuiz() {
    setLookupMode("quiz");
    setSolvedQuizIds(new Set());
    void startQuiz(true);
  }

  async function checkQuiz() {
    if (!quiz || quizResult === "correct" || quizResult === "incorrect") return;
    const res = await fetch("/api/dictionary/quiz/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quizId: quiz.id, answer: quizAnswer }),
    });
    const data = await res.json();
    if (data.correct) {
      setQuizResult("correct");
      setSolvedQuizIds((prev) => new Set(prev).add(quiz.id));
      return;
    }
    if (quizWrongCount === 0) {
      setQuizWrongCount(1);
      setQuizResult("retry");
      setQuizAnswer("");
      return;
    }
    setQuizResult("incorrect");
  }

  const quizCorrectWordRaw = quiz ? vocabulary.find((v) => v.id === quiz.id)?.word : undefined;
  const quizCorrectWord = quizCorrectWordRaw ? normalizeDisplayWord(quizCorrectWordRaw) : undefined;
  const allQuizSolved =
    vocabulary.length > 0 && vocabulary.every((v) => solvedQuizIds.has(v.id));

  async function shareSentence() {
    const res = await fetch("/api/dictionary/sentences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word: sentenceWord, sentence: newSentence }),
    });
    if (res.ok) {
      setNewSentence("");
      setSentenceWord("");
      loadSentences();
    }
  }

  async function deleteSentence(id: string) {
    if (!confirm("이 문장을 지울까요?")) return;
    setDeletingSentenceId(id);
    try {
      const res = await fetch(`/api/dictionary/sentences/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSentences((prev) => prev.filter((s) => s.id !== id));
      }
    } finally {
      setDeletingSentenceId(null);
    }
  }

  async function deleteVocab(id: string) {
    if (!confirm("이 낱말을 낱말집에서 지울까요?")) return;
    setDeletingVocabId(id);
    try {
      const res = await fetch(`/api/dictionary/vocabulary/${id}`, { method: "DELETE" });
      if (res.ok) {
        setVocabulary((prev) => prev.filter((v) => v.id !== id));
        if (quiz?.id === id) {
          setQuiz(null);
          setQuizMessage("낱말집에 단어를 먼저 추가해 주세요.");
        }
      }
    } finally {
      setDeletingVocabId(null);
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="inline-flex items-center gap-2 text-2xl font-bold text-koala-primary">
        <BookMarked className="size-6 shrink-0" strokeWidth={1.75} aria-hidden />
        낱말집
      </h1>

      {!apiConfigured && (
        <div className="rounded-koala-lg border border-koala-accent/40 bg-koala-accent/10 p-4 text-sm">
          <p className="font-medium text-koala-primary">표준국어대사전 API 키 설정</p>
          <p className="mt-1 text-koala-muted">
            <a
              href="https://stdict.korean.go.kr/openapi/openApiRegister.do"
              target="_blank"
              rel="noreferrer"
              className="text-koala-primary underline"
            >
              표준국어대사전
            </a>
            에서 키를 발급받은 뒤 아래에 붙여넣으세요.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              className="koala-input"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="발급받은 API 키"
            />
            <button
              type="button"
              onClick={saveApiKey}
              disabled={apiKeySaving || !apiKeyInput.trim()}
              className="koala-btn-primary shrink-0"
            >
              {apiKeySaving ? "확인 중..." : "키 저장"}
            </button>
          </div>
          {apiKeyError && <p className="mt-2 text-red-500">{apiKeyError}</p>}
        </div>
      )}

      <section className="koala-card space-y-4 p-5">
        <div className="grid grid-cols-2 gap-2 rounded-koala bg-koala-secondary/15 p-1">
          <button
            type="button"
            onClick={() => setLookupMode("search")}
            className={`rounded-koala py-2 text-sm font-medium transition ${
              lookupMode === "search"
                ? "bg-koala-card text-koala-primary shadow-sm"
                : "text-koala-muted hover:text-koala-primary"
            }`}
          >
            단어 찾기
          </button>
          <button
            type="button"
            onClick={switchToQuiz}
            className={`rounded-koala py-2 text-sm font-medium transition ${
              lookupMode === "quiz"
                ? "bg-koala-card text-koala-primary shadow-sm"
                : "text-koala-muted hover:text-koala-primary"
            }`}
          >
            초성퀴즈
          </button>
        </div>

        {lookupMode === "search" ? (
          <>
            <div className="flex gap-2">
              <input
                className="koala-input"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="모르는 낱말"
                onKeyDown={(e) => e.key === "Enter" && lookup()}
              />
              <button type="button" onClick={lookup} className="koala-btn-primary shrink-0">
                검색
              </button>
            </div>
            {result && (
              <div
                className={`rounded-koala p-4 ${
                  result.error === "missing_api_key" || result.error === "api_error"
                    ? "bg-koala-accent/10"
                    : "bg-koala-secondary/20"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{normalizeDisplayWord(result.word)}</p>
                    <p className="mt-1 whitespace-pre-line text-sm">{result.definition}</p>
                    {result.source === "api" && (
                      <p className="mt-1 text-xs text-koala-muted">출처: 표준국어대사전</p>
                    )}
                  </div>
                  {result.error !== "missing_api_key" && result.error !== "api_error" && (
                    <button
                      type="button"
                      onClick={addToVocab}
                      className="koala-btn-secondary shrink-0 self-center text-sm"
                    >
                      낱말집에 추가
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3">
            {quizMessage && !quiz && (
              <p className="text-sm text-koala-muted">{quizMessage}</p>
            )}
            {quiz && (
              <div className="flex items-stretch gap-3 sm:gap-4">
                <div className="min-w-0 flex-1 rounded-koala-lg border border-koala-secondary/40 bg-gradient-to-b from-koala-card to-koala-secondary/10 p-4 shadow-sm sm:p-5">
                  <p className="whitespace-pre-line text-center text-sm leading-relaxed text-koala-text">
                    {quiz.definition}
                  </p>
                  <div className="my-4 border-t border-dashed border-koala-secondary/40" />
                  <p className="text-center text-2xl font-bold tracking-[0.35em] text-koala-primary sm:text-3xl">
                    {quiz.hint}
                  </p>
                </div>

                <div className="flex w-44 shrink-0 flex-col justify-center gap-2 sm:w-52">
                  <div className="flex gap-2">
                    <input
                      className="koala-input min-w-0 flex-1 text-center text-sm placeholder:text-koala-muted/50"
                      value={quizAnswer}
                      onChange={(e) => setQuizAnswer(e.target.value)}
                      placeholder="정답"
                      disabled={quizResult === "correct" || quizResult === "incorrect"}
                      onKeyDown={(e) => e.key === "Enter" && checkQuiz()}
                    />
                    <button
                      type="button"
                      onClick={checkQuiz}
                      disabled={quizResult === "correct" || quizResult === "incorrect"}
                      className="koala-btn-primary shrink-0 px-3 text-sm disabled:opacity-50"
                    >
                      확인
                    </button>
                  </div>

                  {quizResult === "correct" && (
                    <p className="text-center text-xs font-medium text-koala-primary sm:text-sm">
                      <span className="inline-flex items-center justify-center gap-1">
                        <CheckCircle2 className={iconSm} aria-hidden />
                        정답!
                      </span>
                    </p>
                  )}

                  {quizResult === "retry" && (
                    <p className="text-center text-xs font-medium text-koala-muted sm:text-sm">
                      한 번 더!
                    </p>
                  )}

                  {quizResult === "incorrect" && (
                    <div className="text-center text-xs sm:text-sm">
                      <p className="font-medium text-red-500">오답!</p>
                      {quizCorrectWord && (
                        <p className="mt-1 text-koala-muted">
                          정답: <strong className="text-koala-primary">{quizCorrectWord}</strong>
                        </p>
                      )}
                    </div>
                  )}

                  {allQuizSolved && quizResult === "correct" && (
                    <p className="text-center text-xs font-medium text-koala-primary sm:text-sm">
                      모든 낱말을 맞혔어요!
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => startQuiz(allQuizSolved)}
                    className="koala-btn-secondary w-full text-sm"
                  >
                    {allQuizSolved ? "처음부터 다시" : "다른 낱말 퀴즈"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {lookupMode !== "quiz" && (
      <section className="koala-card p-5">
        <h2 className="mb-3 font-bold text-koala-primary">내 낱말집</h2>
        {vocabulary.length === 0 ? (
          <p className="text-sm text-koala-muted">아직 저장한 단어가 없어요.</p>
        ) : (
          <ul className="space-y-2">
            {vocabulary.map((v) => (
              <li
                key={v.id}
                className="relative rounded-koala bg-koala-secondary/10 p-3 pr-10 text-sm"
              >
                <span className="font-bold">{normalizeDisplayWord(v.word)}</span> — {v.definition}
                <button
                  type="button"
                  onClick={() => deleteVocab(v.id)}
                  disabled={deletingVocabId === v.id}
                  className="absolute right-2 top-2 rounded-pill p-1.5 text-koala-muted transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                  aria-label="낱말 삭제"
                >
                  <Trash2 className={iconSm} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      )}

      <section className="koala-card space-y-4 p-5">
        <h2 className="font-bold text-koala-primary">낱말 문장 공유하기</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <input
            className="koala-input w-44 shrink-0 sm:w-52"
            placeholder="낱말"
            value={sentenceWord}
            onChange={(e) => setSentenceWord(e.target.value)}
          />
          <textarea
            className="koala-input min-h-[44px] flex-1 resize-y py-2 sm:min-h-0"
            placeholder="낱말로 문장 만들기"
            value={newSentence}
            onChange={(e) => setNewSentence(e.target.value)}
            rows={1}
          />
          <button
            type="button"
            onClick={shareSentence}
            className="koala-btn-primary shrink-0 text-sm sm:self-stretch sm:px-5"
          >
            공유하기
          </button>
        </div>
        <div className="space-y-2">
          {sentences.map((s) => (
            <div
              key={s.id}
              className="relative rounded-koala bg-koala-secondary/10 p-3 pr-10 text-sm"
            >
              <span className="text-koala-muted">{s.username}</span> · <strong>{s.word}</strong>
              <p className="mt-1">&ldquo;{s.sentence}&rdquo;</p>
              {currentUserId === s.userId && (
                <button
                  type="button"
                  onClick={() => deleteSentence(s.id)}
                  disabled={deletingSentenceId === s.id}
                  className="absolute right-2 top-2 rounded-pill p-1.5 text-koala-muted transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                  aria-label="문장 삭제"
                >
                  <Trash2 className={iconSm} aria-hidden />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
