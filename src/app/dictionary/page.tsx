"use client";

import { useEffect, useState } from "react";
import { BookMarked, CheckCircle2 } from "lucide-react";
import { iconSm } from "@/lib/icon-styles";

interface VocabEntry {
  id: string;
  word: string;
  definition: string;
}

interface SharedSentence {
  id: string;
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

export default function DictionaryPage() {
  const [word, setWord] = useState("");
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
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [quizAnswer, setQuizAnswer] = useState("");
  const [quizResult, setQuizResult] = useState<"correct" | "wrong" | null>(null);
  const [newSentence, setNewSentence] = useState("");
  const [sentenceWord, setSentenceWord] = useState("");

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
          if (!d.user) window.location.href = "/login";
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

  async function startQuiz() {
    const res = await fetch("/api/dictionary/quiz");
    const data = await res.json();
    setQuiz(data.quiz);
    setQuizAnswer("");
    setQuizResult(null);
  }

  async function checkQuiz() {
    if (!quiz) return;
    const res = await fetch("/api/dictionary/quiz/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quizId: quiz.id, answer: quizAnswer }),
    });
    const data = await res.json();
    setQuizResult(data.correct ? "correct" : "wrong");
  }

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

      <section className="koala-card space-y-3 p-5">
        <h2 className="font-bold text-koala-primary">단어 찾기</h2>
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
            <p className="font-bold">{result.word}</p>
            <p className="mt-1 whitespace-pre-line text-sm">{result.definition}</p>
            {result.source === "api" && (
              <p className="mt-1 text-xs text-koala-muted">출처: 표준국어대사전</p>
            )}
            {result.error !== "missing_api_key" && result.error !== "api_error" && (
              <button type="button" onClick={addToVocab} className="koala-btn-secondary mt-3 text-sm">
                낱말집에 추가
              </button>
            )}
          </div>
        )}
      </section>

      <section className="koala-card p-5">
        <h2 className="mb-3 font-bold text-koala-primary">내 낱말집</h2>
        {vocabulary.length === 0 ? (
          <p className="text-sm text-koala-muted">아직 저장한 단어가 없어요.</p>
        ) : (
          <ul className="space-y-2">
            {vocabulary.map((v) => (
              <li key={v.id} className="rounded-koala bg-koala-secondary/10 p-3 text-sm">
                <span className="font-bold">{v.word}</span> — {v.definition}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="koala-card space-y-3 p-5">
        <h2 className="font-bold text-koala-primary">초성 퀴즈</h2>
        <button type="button" onClick={startQuiz} className="koala-btn-accent text-sm">
          퀴즈 시작
        </button>
        {quiz && (
          <div className="rounded-koala bg-koala-accent/10 p-4">
            <p className="text-sm">초성: <strong>{quiz.hint}</strong></p>
            <p className="mt-1 text-sm text-koala-muted">{quiz.definition}</p>
            <p className="text-xs text-koala-muted">{quiz.answerLength}글자</p>
            <div className="mt-3 flex gap-2">
              <input
                className="koala-input"
                value={quizAnswer}
                onChange={(e) => setQuizAnswer(e.target.value)}
                placeholder="정답 입력"
              />
              <button type="button" onClick={checkQuiz} className="koala-btn-primary shrink-0 text-sm">
                확인
              </button>
            </div>
            {quizResult && (
              <p
                className={`mt-2 inline-flex items-center gap-1 text-sm font-medium ${
                  quizResult === "correct" ? "text-koala-primary" : "text-red-500"
                }`}
              >
                {quizResult === "correct" && <CheckCircle2 className={iconSm} aria-hidden />}
                {quizResult === "correct" ? "정답이에요!" : "다시 생각해 보세요."}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="koala-card space-y-3 p-5">
        <h2 className="font-bold text-koala-primary">낱말 문장 공유 보드</h2>
        <input
          className="koala-input"
          placeholder="사용한 낱말"
          value={sentenceWord}
          onChange={(e) => setSentenceWord(e.target.value)}
        />
        <textarea
          className="koala-input min-h-[80px]"
          placeholder="낱말로 문장 만들기"
          value={newSentence}
          onChange={(e) => setNewSentence(e.target.value)}
        />
        <button type="button" onClick={shareSentence} className="koala-btn-primary text-sm">
          공유하기
        </button>
        <div className="mt-4 space-y-2">
          {sentences.map((s) => (
            <div key={s.id} className="rounded-koala bg-koala-secondary/10 p-3 text-sm">
              <span className="text-koala-muted">{s.username}</span> · <strong>{s.word}</strong>
              <p className="mt-1">&ldquo;{s.sentence}&rdquo;</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
