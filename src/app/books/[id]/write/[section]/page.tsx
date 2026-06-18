"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AiHelperChat } from "@/components/AiHelperChat";
import { BackLink } from "@/components/BackLink";
import {
  BEFORE_READING_QUESTIONS,
  DURING_READING_QUESTIONS,
  SECTION_LABELS,
  SECTION_ORDER,
  type ReflectionSection,
} from "@/lib/reflection-templates";
import type { Book, Reflection, ReflectionQuestion } from "@/lib/types";

const VALID_SECTIONS = new Set<string>(SECTION_ORDER);

export default function WriteSectionPage({
  params,
}: {
  params: Promise<{ id: string; section: string }>;
}) {
  const { id: bookId, section } = use(params);
  const router = useRouter();
  const typedSection = section as ReflectionSection;

  const [book, setBook] = useState<Book | null>(null);
  const [reflection, setReflection] = useState<Partial<Reflection>>({});
  const [beforeReading, setBeforeReading] = useState<ReflectionQuestion[]>([]);
  const [duringReading, setDuringReading] = useState<ReflectionQuestion[]>([]);
  const [association, setAssociation] = useState("");
  const [favoriteQuote, setFavoriteQuote] = useState("");
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewReason, setReviewReason] = useState("");
  const [reviewContent, setReviewContent] = useState("");
  const [reviewImpressiveScene, setReviewImpressiveScene] = useState("");
  const [reviewThoughts, setReviewThoughts] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  useEffect(() => {
    if (!VALID_SECTIONS.has(section)) return;

    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) setNeedsAuth(true);
      });

    fetch(`/api/books/${bookId}`)
      .then((r) => r.json())
      .then((d) => setBook(d.book || null));

    fetch(`/api/reflections?bookId=${bookId}`)
      .then((r) => r.json())
      .then((d) => {
        const r0 = d.reflections?.[0];
        if (!r0) {
          setBeforeReading(BEFORE_READING_QUESTIONS.map((q) => ({ question: q.question, answer: "" })));
          setDuringReading(DURING_READING_QUESTIONS.map((q) => ({ question: q.question, answer: "" })));
          return;
        }
        setReflection(r0);
        setBeforeReading(
          r0.beforeReading?.length
            ? r0.beforeReading
            : BEFORE_READING_QUESTIONS.map((q) => ({ question: q.question, answer: "" }))
        );
        setDuringReading(
          r0.duringReading?.length
            ? r0.duringReading
            : DURING_READING_QUESTIONS.map((q) => ({ question: q.question, answer: "" }))
        );
        setAssociation(r0.association || "");
        setFavoriteQuote(r0.favoriteQuote || "");
        setReviewTitle(r0.reviewTitle || "");
        setReviewReason(r0.reviewReason || "");
        setReviewContent(r0.reviewContent || "");
        setReviewImpressiveScene(r0.reviewImpressiveScene || "");
        setReviewThoughts(r0.reviewThoughts || "");
      });
  }, [bookId, section]);

  async function ensureAuth(): Promise<boolean> {
    const me = await fetch("/api/auth/me").then((r) => r.json());
    if (me.user) return true;

    if (!username || !password) {
      setError("아이디와 비밀번호를 입력해 주세요.");
      return false;
    }
    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않아요.");
      return false;
    }

    const reg = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, passwordConfirm }),
    });
    if (reg.ok) return true;

    const login = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (login.ok) return true;

    const data = await reg.json().catch(() => ({}));
    setError(data.error || "가입 또는 로그인에 실패했어요.");
    return false;
  }

  async function save() {
    setLoading(true);
    setError("");
    try {
      if (!(await ensureAuth())) return;

      const body = {
        bookId,
        beforeReading,
        duringReading,
        association,
        favoriteQuote,
        reviewTitle,
        reviewReason,
        reviewContent,
        reviewImpressiveScene,
        reviewThoughts,
      };

      const res = await fetch("/api/reflections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "저장에 실패했어요.");
        return;
      }
      setNeedsAuth(false);
      router.push(`/books/${bookId}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!VALID_SECTIONS.has(section)) {
    return <p className="text-red-500">잘못된 섹션이에요.</p>;
  }

  const sectionIndex = SECTION_ORDER.indexOf(typedSection);
  const nextSection = SECTION_ORDER[sectionIndex + 1];

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-24">
      <div>
        <BackLink href={`/books/${bookId}`}>{book?.title || "책"}으로 돌아가기</BackLink>
        <h1 className="mt-2 text-2xl font-bold text-koala-primary">{SECTION_LABELS[typedSection]}</h1>
        <p className="text-sm text-koala-muted">원하는 칸만 골라서 써도 괜찮아요</p>
      </div>

      {needsAuth && (
        <div className="koala-card space-y-3 p-5">
          <p className="font-medium text-koala-primary">처음 글쓰기 — 아이디 만들기</p>
          <input className="koala-input" placeholder="아이디" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input
            type="password"
            className="koala-input"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            type="password"
            className="koala-input"
            placeholder="비밀번호 확인"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
          />
        </div>
      )}

      <div className="koala-card space-y-4 p-5">
        {typedSection === "before_reading" &&
          beforeReading.map((item, i) => (
            <div key={i}>
              <label className="koala-label">{item.question}</label>
              <textarea
                className="koala-input min-h-[80px]"
                value={item.answer}
                onChange={(e) => {
                  const next = [...beforeReading];
                  next[i] = { ...next[i], answer: e.target.value };
                  setBeforeReading(next);
                }}
                placeholder="생각을 적어 보세요 (선택)"
              />
            </div>
          ))}

        {typedSection === "during_reading" &&
          duringReading.map((item, i) => (
            <div key={i}>
              <label className="koala-label">{item.question}</label>
              <textarea
                className="koala-input min-h-[80px]"
                value={item.answer}
                onChange={(e) => {
                  const next = [...duringReading];
                  next[i] = { ...next[i], answer: e.target.value };
                  setDuringReading(next);
                }}
                placeholder="생각을 적어 보세요 (선택)"
              />
            </div>
          ))}

        {typedSection === "association" && (
          <div>
            <label className="koala-label">OO은 OO할 때 생각나는 책이다</label>
            <textarea
              className="koala-input min-h-[100px]"
              value={association}
              onChange={(e) => setAssociation(e.target.value)}
              placeholder="예: 피노키오는 거짓말 할 때 생각나는 책이다"
            />
          </div>
        )}

        {typedSection === "quote" && (
          <div>
            <label className="koala-label">책속 한마디</label>
            <textarea
              className="koala-input min-h-[100px]"
              value={favoriteQuote}
              onChange={(e) => setFavoriteQuote(e.target.value)}
              placeholder="마음에 남는 문장을 적어 보세요"
            />
          </div>
        )}

        {typedSection === "review" && (
          <>
            {[
              { label: "감상문 제목", value: reviewTitle, set: setReviewTitle },
              { label: "책을 읽은 까닭", value: reviewReason, set: setReviewReason },
              { label: "책의 내용", value: reviewContent, set: setReviewContent },
              { label: "인상 깊은 장면", value: reviewImpressiveScene, set: setReviewImpressiveScene },
              { label: "읽고 떠오른 생각이나 느낌", value: reviewThoughts, set: setReviewThoughts },
            ].map((field) => (
              <div key={field.label}>
                <label className="koala-label">{field.label}</label>
                <textarea
                  className="koala-input min-h-[80px]"
                  value={field.value}
                  onChange={(e) => field.set(e.target.value)}
                  placeholder="선택 입력"
                />
              </div>
            ))}
          </>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3">
        <button type="button" onClick={save} disabled={loading} className="koala-btn-primary">
          {loading ? "저장 중..." : "저장하기"}
        </button>
        {nextSection && (
          <Link href={`/books/${bookId}/write/${nextSection}`} className="koala-btn-secondary">
            다음: {SECTION_LABELS[nextSection]}
          </Link>
        )}
      </div>

      <AiHelperChat context={typedSection} />
    </div>
  );
}
