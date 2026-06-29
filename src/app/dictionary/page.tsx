"use client";

import { useEffect, useMemo, useState } from "react";
import { BookMarked, CheckCircle2, Trash2 } from "lucide-react";
import { iconSm } from "@/lib/icon-styles";
import type { DictSense } from "@/lib/dictionary-api";
import { ListPagination, paginateList } from "@/components/ListPagination";
import { VocabWordLabel, VocabWordInline } from "@/components/VocabWordLabel";
import {
  buildVocabSenseMap,
  formatSenseDefinition,
  isSenseInVocab,
  normalizeDisplayWord,
  vocabSelectLabel,
  getSharedSentenceSense,
  resolveVocabSense,
} from "@/lib/vocabulary-display";
import { alertContentFilterApiError, warnIfInvalidContent } from "@/lib/content-filter-client";

interface VocabEntry {
  id: string;
  word: string;
  definition: string;
  senseNo?: number;
  createdAt?: string;
}

interface SharedSentence {
  id: string;
  userId: string;
  username: string;
  vocabularyId?: string;
  word: string;
  definition: string;
  senseNo?: number;
  sentence: string;
}

interface Quiz {
  id: string;
  hint: string;
  definition: string;
  answerLength: number;
}

type LookupMode = "search" | "quiz";

export default function DictionaryPage() {
  const [word, setWord] = useState("");
  const [lookupMode, setLookupMode] = useState<LookupMode>("search");
  const [result, setResult] = useState<{
    word: string;
    definition: string;
    senses: DictSense[];
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
  const [selectedVocabId, setSelectedVocabId] = useState("");
  const [deletingSentenceId, setDeletingSentenceId] = useState<string | null>(null);
  const [deletingVocabId, setDeletingVocabId] = useState<string | null>(null);
  const [vocabPage, setVocabPage] = useState(1);
  const [sentencePage, setSentencePage] = useState(1);

  const vocabPagination = useMemo(
    () => paginateList(vocabulary, vocabPage),
    [vocabulary, vocabPage]
  );
  const sentencePagination = useMemo(
    () => paginateList(sentences, sentencePage),
    [sentences, sentencePage]
  );
  const vocabSenseMap = useMemo(() => buildVocabSenseMap(vocabulary), [vocabulary]);

  useEffect(() => {
    if (vocabPage > vocabPagination.totalPages) {
      setVocabPage(vocabPagination.totalPages);
    }
  }, [vocabPage, vocabPagination.totalPages]);

  useEffect(() => {
    if (sentencePage > sentencePagination.totalPages) {
      setSentencePage(sentencePagination.totalPages);
    }
  }, [sentencePage, sentencePagination.totalPages]);

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
    if (!warnIfInvalidContent(word).ok) return;
    const res = await fetch(`/api/dictionary/lookup?word=${encodeURIComponent(word)}`);
    const data = await res.json();
    if (!res.ok) {
      alertContentFilterApiError(res, data);
      return;
    }
    setResult(data.result);
  }

  async function addToVocab(sense: DictSense) {
    if (!result) return;
    const definition = formatSenseDefinition(sense);
    const res = await fetch("/api/dictionary/vocabulary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        word: result.word,
        definition,
        ...(sense.senseNo ? { senseNo: sense.senseNo } : {}),
      }),
    });
    if (res.ok) {
      loadVocab();
      setVocabPage(1);
    }
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

  const quizCorrectEntry = quiz ? vocabulary.find((v) => v.id === quiz.id) : undefined;
  const quizCorrectSense = quizCorrectEntry
    ? resolveVocabSense(quizCorrectEntry, vocabulary, vocabSenseMap)
    : undefined;
  const allQuizSolved =
    vocabulary.length > 0 && vocabulary.every((v) => solvedQuizIds.has(v.id));

  async function shareSentence() {
    if (!selectedVocabId || !newSentence.trim()) return;
    if (!warnIfInvalidContent(newSentence).ok) return;
    const res = await fetch("/api/dictionary/sentences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vocabularyId: selectedVocabId, sentence: newSentence }),
    });
    if (!res.ok) {
      const data = await res.json();
      alertContentFilterApiError(res, data);
      return;
    }
    if (res.ok) {
      setNewSentence("");
      loadSentences();
      setSentencePage(1);
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
                <p className="font-bold">{normalizeDisplayWord(result.word)}</p>
                {result.error === "missing_api_key" || result.error === "api_error" ? (
                  <p className="mt-2 text-sm whitespace-pre-line">{result.definition}</p>
                ) : result.senses.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {result.senses.map((sense, index) => {
                      const saved = isSenseInVocab(sense, result.word, vocabulary);
                      return (
                      <li
                        key={`${sense.definition}-${index}`}
                        className="flex items-start justify-between gap-3 rounded-koala bg-koala-card/70 p-3"
                      >
                        <p className="min-w-0 flex-1 text-sm">
                          {result.senses.length > 1 && (
                            <span className="mr-1 font-medium text-koala-primary">
                              {sense.senseNo ?? index + 1}.
                            </span>
                          )}
                          {sense.pos && (
                            <span className="text-koala-muted">({sense.pos}) </span>
                          )}
                          {sense.definition}
                        </p>
                        <button
                          type="button"
                          onClick={() => addToVocab(sense)}
                          disabled={saved}
                          className={`shrink-0 rounded-pill p-2 transition ${
                            saved
                              ? "text-koala-muted opacity-50"
                              : "text-koala-primary hover:bg-koala-secondary/30"
                          }`}
                          aria-label={saved ? "낱말집에 있음" : "낱말집에 추가"}
                          title={saved ? "낱말집에 있음" : "낱말집에 추가"}
                        >
                          <BookMarked className={iconSm} strokeWidth={saved ? 1.5 : 2} aria-hidden />
                        </button>
                      </li>
                    );
                    })}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm whitespace-pre-line">{result.definition}</p>
                )}
                {result.source === "api" && (
                  <p className="mt-3 text-right text-xs text-koala-muted">출처: 표준국어대사전</p>
                )}
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
                      {quizCorrectEntry && quizCorrectSense && (
                        <p className="mt-1 text-koala-muted">
                          정답:{" "}
                          <VocabWordInline
                            word={quizCorrectEntry.word}
                            senseInfo={quizCorrectSense}
                            className="text-koala-primary"
                            bold
                          />
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
          <>
          <ul className="space-y-2">
            {vocabPagination.items.map((v) => {
              const senseInfo = resolveVocabSense(v, vocabulary, vocabSenseMap);
              return (
              <li
                key={v.id}
                className="relative rounded-koala bg-koala-secondary/10 p-3 pr-10 text-sm"
              >
                <VocabWordInline word={v.word} senseInfo={senseInfo} bold className="font-bold" />
                <span> — {v.definition}</span>
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
            );
            })}
          </ul>
          <ListPagination
            page={vocabPagination.page}
            totalPages={vocabPagination.totalPages}
            onPageChange={setVocabPage}
          />
          </>
        )}
      </section>
      )}

      <section className="koala-card space-y-4 p-5">
        <h2 className="font-bold text-koala-primary">낱말 하나, 문장 하나</h2>
        {vocabulary.length === 0 ? (
          <p className="text-sm text-koala-muted">낱말집에 낱말을 먼저 추가해 주세요.</p>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <select
              className="koala-input w-full shrink-0 sm:w-52"
              value={selectedVocabId}
              onChange={(e) => setSelectedVocabId(e.target.value)}
            >
              <option value="">낱말 고르기</option>
              {vocabulary.map((v) => {
                const senseInfo = resolveVocabSense(v, vocabulary, vocabSenseMap);
                return (
                <option key={v.id} value={v.id}>
                  {vocabSelectLabel(v, vocabSenseMap, senseInfo)}
                </option>
              );
              })}
            </select>
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
              disabled={!selectedVocabId || !newSentence.trim()}
              className="koala-btn-primary shrink-0 text-sm disabled:opacity-50 sm:self-stretch sm:px-5"
            >
              공유하기
            </button>
          </div>
        )}
        <div className="space-y-2">
          {sentencePagination.items.map((s) => {
            const senseInfo = getSharedSentenceSense(s, vocabulary, vocabSenseMap) ?? {
              showSenseNo: false,
              senseNo: 1,
            };
            return (
            <div
              key={s.id}
              className="relative rounded-koala bg-koala-secondary/10 p-3 pr-10 text-sm"
            >
              <p className="flex flex-wrap items-baseline gap-x-1.5 text-koala-muted">
                <span>
                  {s.username} ·{" "}
                  <VocabWordInline word={s.word} senseInfo={senseInfo} bold className="text-koala-text" />
                </span>
                {s.definition && (
                  <span className="text-xs text-koala-muted">{s.definition}</span>
                )}
              </p>
              <p className="mt-2">&ldquo;{s.sentence}&rdquo;</p>
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
          );
          })}
        </div>
        <ListPagination
          page={sentencePagination.page}
          totalPages={sentencePagination.totalPages}
          onPageChange={setSentencePage}
        />
      </section>
    </div>
  );
}
