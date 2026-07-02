"use client";

import { useCallback, useEffect, useRef, useState, use } from "react";
import { useRouter } from "next/navigation";
import { AiHelperChat } from "@/components/AiHelperChat";
import { BackLink } from "@/components/BackLink";
import { ReflectionActivityForm } from "@/components/ReflectionActivityForm";
import { AssociationInput } from "@/components/AssociationInput";
import { AutoSaveBadge } from "@/components/AutoSaveBadge";
import { MemorableSceneUpload } from "@/components/MemorableSceneUpload";
import { iconMd } from "@/lib/icon-styles";
import {
  defaultBeforeReadingActivities,
  defaultBeforeReadingPairs,
  defaultDuringReadingActivities,
  defaultDuringReadingPairs,
  loadBeforeReadingActivities,
  loadBeforeReadingPairs,
  loadDuringReadingActivities,
  loadDuringReadingPairs,
  pairsToLegacyBeforeReading,
  pairsToLegacyDuringReading,
  syncPairsWithActivities,
  buildAssociationSentence,
  stripBookTitleFromAssociation,
  SECTION_LABELS,
  SECTION_ORDER,
  type ReflectionSection,
} from "@/lib/reflection-templates";
import { SECTION_ICONS } from "@/lib/section-icons";
import { collectReflectionTexts } from "@/lib/content-filter";
import { alertContentFilterApiError, warnIfInvalidContent } from "@/lib/content-filter-client";
import type { BeforeReadingActivity, BeforeReadingPair, Book, Reflection } from "@/lib/types";

const VALID_SECTIONS = new Set<string>(SECTION_ORDER);
const AUTO_SAVE_DELAY_MS = 800;

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function WriteSectionPage({
  params,
}: {
  params: Promise<{ id: string; section: string }>;
}) {
  const { id: bookId, section } = use(params);
  const router = useRouter();
  const typedSection = section as ReflectionSection;

  const [book, setBook] = useState<Book | null>(null);
  const [beforeReadingActivities, setBeforeReadingActivities] = useState(defaultBeforeReadingActivities);
  const [beforeReadingPairs, setBeforeReadingPairs] = useState(defaultBeforeReadingPairs);
  const [duringReadingActivities, setDuringReadingActivities] = useState(defaultDuringReadingActivities);
  const [duringReadingPairs, setDuringReadingPairs] = useState(defaultDuringReadingPairs);
  const [association, setAssociation] = useState("");
  const [favoriteQuote, setFavoriteQuote] = useState("");
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewReason, setReviewReason] = useState("");
  const [reviewContent, setReviewContent] = useState("");
  const [reviewImpressiveScene, setReviewImpressiveScene] = useState("");
  const [reviewThoughts, setReviewThoughts] = useState("");
  const [memorableSceneImage, setMemorableSceneImage] = useState("");
  const [memorableSceneStatus, setMemorableSceneStatus] = useState<
    "approved" | "pending" | undefined
  >();
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [loaded, setLoaded] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const skipNextAutoSave = useRef(true);
  const bookTitleRef = useRef("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formStateRef = useRef({
    beforeReadingActivities,
    beforeReadingPairs,
    duringReadingActivities,
    duringReadingPairs,
    association,
    favoriteQuote,
    reviewTitle,
    reviewReason,
    reviewContent,
    reviewImpressiveScene,
    reviewThoughts,
  });

  formStateRef.current = {
    beforeReadingActivities,
    beforeReadingPairs,
    duringReadingActivities,
    duringReadingPairs,
    association,
    favoriteQuote,
    reviewTitle,
    reviewReason,
    reviewContent,
    reviewImpressiveScene,
    reviewThoughts,
  };

  useEffect(() => {
    if (!VALID_SECTIONS.has(section)) return;

    setLoaded(false);
    skipNextAutoSave.current = true;

    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        const loggedIn = !!d.user;
        setIsLoggedIn(loggedIn);
        setNeedsAuth(!loggedIn);
      });

    Promise.all([
      fetch(`/api/books/${bookId}`).then((r) => r.json()),
      fetch(`/api/reflections?bookId=${bookId}`).then((r) => r.json()),
    ])
      .then(([bookData, reflectionData]) => {
        const loadedBook = bookData.book as Book | null;
        if (loadedBook) setBook(loadedBook);

        const r0 = reflectionData.reflections?.[0] as Reflection | undefined;
        if (!r0) {
          const beforeActivities = loadBeforeReadingActivities();
          const duringActivities = loadDuringReadingActivities();
          setBeforeReadingActivities(beforeActivities);
          setBeforeReadingPairs(syncPairsWithActivities(loadBeforeReadingPairs(), beforeActivities));
          setDuringReadingActivities(duringActivities);
          setDuringReadingPairs(syncPairsWithActivities(loadDuringReadingPairs(), duringActivities));
          return;
        }
        const beforeActivities = loadBeforeReadingActivities(r0.beforeReadingActivities, r0.beforeReading);
        const duringActivities = loadDuringReadingActivities(
          r0.duringReadingActivities,
          r0.duringReading
        );
        setBeforeReadingActivities(beforeActivities);
        setBeforeReadingPairs(
          syncPairsWithActivities(loadBeforeReadingPairs(r0.beforeReadingPairs, r0.beforeReading), beforeActivities)
        );
        setDuringReadingActivities(duringActivities);
        setDuringReadingPairs(
          syncPairsWithActivities(
            loadDuringReadingPairs(r0.duringReadingPairs, r0.duringReading),
            duringActivities
          )
        );
        setAssociation(
          stripBookTitleFromAssociation(loadedBook?.title || "", r0.association || "")
        );
        setFavoriteQuote(r0.favoriteQuote || "");
        setReviewTitle(r0.reviewTitle || "");
        setReviewReason(r0.reviewReason || "");
        setReviewContent(r0.reviewContent || "");
        setReviewImpressiveScene(r0.reviewImpressiveScene || "");
        setReviewThoughts(r0.reviewThoughts || "");
        setMemorableSceneImage(r0.memorableSceneImage || "");
        setMemorableSceneStatus(r0.memorableSceneStatus);
      })
      .finally(() => setLoaded(true));
  }, [bookId, section]);

  bookTitleRef.current = book?.title || "";

  const buildBody = useCallback(() => {
    const state = formStateRef.current;
    return {
      bookId,
      beforeReading: pairsToLegacyBeforeReading(state.beforeReadingPairs, state.beforeReadingActivities),
      beforeReadingActivities: state.beforeReadingActivities,
      beforeReadingPairs: state.beforeReadingPairs,
      duringReading: pairsToLegacyDuringReading(state.duringReadingPairs, state.duringReadingActivities),
      duringReadingActivities: state.duringReadingActivities,
      duringReadingPairs: state.duringReadingPairs,
      association: buildAssociationSentence(bookTitleRef.current, state.association),
      favoriteQuote: state.favoriteQuote,
      reviewTitle: state.reviewTitle,
      reviewReason: state.reviewReason,
      reviewContent: state.reviewContent,
      reviewImpressiveScene: state.reviewImpressiveScene,
      reviewThoughts: state.reviewThoughts,
    };
  }, [bookId]);

  const persistReflection = useCallback(async (): Promise<boolean> => {
    const me = await fetch("/api/auth/me").then((r) => r.json());
    if (!me.user) return false;

    setSaveStatus("saving");
    setError("");

    const body = buildBody();
    if (!warnIfInvalidContent(...collectReflectionTexts(body)).ok) {
      setSaveStatus("idle");
      return false;
    }

    try {
      const res = await fetch("/api/reflections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        if (alertContentFilterApiError(res, data)) {
          setSaveStatus("idle");
          return false;
        }
        setError(data.error || "저장에 실패했어요.");
        setSaveStatus("error");
        return false;
      }
      setNeedsAuth(false);
      setIsLoggedIn(true);
      setSaveStatus("saved");
      if (savedFadeTimerRef.current) clearTimeout(savedFadeTimerRef.current);
      savedFadeTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
      return true;
    } catch {
      setError("저장에 실패했어요.");
      setSaveStatus("error");
      return false;
    }
  }, [buildBody]);

  const flushSave = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (!isLoggedIn) return false;
    return persistReflection();
  }, [isLoggedIn, persistReflection]);

  useEffect(() => {
    if (!loaded || !isLoggedIn) return;

    if (skipNextAutoSave.current) {
      skipNextAutoSave.current = false;
      return;
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void persistReflection();
    }, AUTO_SAVE_DELAY_MS);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [
    loaded,
    isLoggedIn,
    beforeReadingActivities,
    beforeReadingPairs,
    duringReadingActivities,
    duringReadingPairs,
    association,
    favoriteQuote,
    reviewTitle,
    reviewReason,
    reviewContent,
    reviewImpressiveScene,
    reviewThoughts,
    persistReflection,
  ]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (savedFadeTimerRef.current) clearTimeout(savedFadeTimerRef.current);
    };
  }, []);

  async function ensureAuth(): Promise<boolean> {
    const me = await fetch("/api/auth/me").then((r) => r.json());
    if (me.user) {
      setIsLoggedIn(true);
      setNeedsAuth(false);
      return true;
    }

    if (!username || !password) {
      setError("아이디와 비밀번호를 입력해 주세요.");
      return false;
    }

    const login = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (login.ok) {
      setIsLoggedIn(true);
      setNeedsAuth(false);
      return true;
    }

    const data = await login.json().catch(() => ({}));
    setError(data.error || "로그인에 실패했어요. 관리자에게 아이디를 확인해 주세요.");
    return false;
  }

  async function handleAuthAndSave() {
    if (await ensureAuth()) {
      skipNextAutoSave.current = false;
      await persistReflection();
    }
  }

  async function goToSection(target: ReflectionSection) {
    if (isLoggedIn) await flushSave();
    router.push(`/books/${bookId}/write/${target}`);
  }

  if (!VALID_SECTIONS.has(section)) {
    return <p className="text-red-500">잘못된 섹션이에요.</p>;
  }

  const sectionIndex = SECTION_ORDER.indexOf(typedSection);
  const prevSection = sectionIndex > 0 ? SECTION_ORDER[sectionIndex - 1] : undefined;
  const nextSection = SECTION_ORDER[sectionIndex + 1];
  const SectionIcon = SECTION_ICONS[typedSection];
  const showSectionIcon =
    typedSection === "before_reading" ||
    typedSection === "during_reading" ||
    typedSection === "memorable_scene";
  const sectionSubtitle =
    typedSection === "before_reading" || typedSection === "during_reading"
      ? "만들 질문과 관련있는 내용에 체크해보세요"
      : typedSection === "review"
        ? "한 편의 멋진 감상문을 써 봅시다!"
        : null;

  return (
    <div className="space-y-6 pb-24">
      <div>
        <BackLink href={`/books/${bookId}`}>감상 기록 전체 화면으로 돌아가기</BackLink>
        <div className="mt-2 flex flex-wrap items-baseline gap-2">
          <div className="flex items-center gap-2">
            {showSectionIcon && (
              <SectionIcon className={`${iconMd} shrink-0 text-koala-primary`} strokeWidth={1.75} aria-hidden />
            )}
            <h1 className="text-2xl font-bold text-koala-primary">{SECTION_LABELS[typedSection]}</h1>
          </div>
          {sectionSubtitle && (
            <span className="text-sm text-koala-muted">{sectionSubtitle}</span>
          )}
        </div>
      </div>

      {needsAuth && (
        <div className="koala-card space-y-3 p-5">
          <p className="font-medium text-koala-primary">처음 글쓰기 — 아이디 만들기</p>
          <p className="text-sm text-koala-muted">가입 또는 로그인 후 글을 쓰면 자동으로 저장돼요.</p>
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
          <button type="button" onClick={handleAuthAndSave} className="koala-btn-primary text-sm">
            시작하기
          </button>
        </div>
      )}

      {typedSection === "before_reading" && (
        <ReflectionActivityForm
          activities={beforeReadingActivities}
          pairs={beforeReadingPairs}
          onActivitiesChange={setBeforeReadingActivities}
          onPairsChange={setBeforeReadingPairs}
          saveStatus={saveStatus}
          isLoggedIn={isLoggedIn}
        />
      )}

      {typedSection === "during_reading" && (
        <ReflectionActivityForm
          activities={duringReadingActivities}
          pairs={duringReadingPairs}
          onActivitiesChange={setDuringReadingActivities}
          onPairsChange={setDuringReadingPairs}
          saveStatus={saveStatus}
          isLoggedIn={isLoggedIn}
        />
      )}

      {typedSection === "memorable_scene" && (
        <MemorableSceneUpload
          bookId={bookId}
          imageUrl={memorableSceneImage}
          sceneStatus={memorableSceneStatus}
          onUploaded={(url, status) => {
            setMemorableSceneImage(url || "");
            setMemorableSceneStatus(status);
          }}
          disabled={needsAuth}
        />
      )}

      {typedSection !== "before_reading" &&
        typedSection !== "during_reading" &&
        typedSection !== "memorable_scene" && (
        <div className="koala-card relative space-y-4 p-5 pt-8">
          <AutoSaveBadge
            status={saveStatus}
            isLoggedIn={isLoggedIn}
            className="absolute right-4 top-4"
          />
          {typedSection === "association" && (
            <AssociationInput
              bookTitle={book?.title}
              value={association}
              onChange={setAssociation}
            />
          )}

          {typedSection === "quote" && (
            <div>
              <label className="koala-label">마음에 남는 문장을 적어보세요</label>
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
                    placeholder="입력하세요"
                  />
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex flex-wrap gap-3">
        {prevSection && (
          <button
            type="button"
            onClick={() => goToSection(prevSection)}
            className="koala-btn-secondary"
          >
            이전: {SECTION_LABELS[prevSection]}
          </button>
        )}
        {nextSection && (
          <button
            type="button"
            onClick={() => goToSection(nextSection)}
            className="koala-btn-secondary"
          >
            다음: {SECTION_LABELS[nextSection]}
          </button>
        )}
      </div>

      {typedSection === "review" && (
        <AiHelperChat
          bookId={bookId}
          bookTitle={book?.title}
          reviewDraft={{
            reviewTitle,
            reviewReason,
            reviewContent,
            reviewImpressiveScene,
            reviewThoughts,
          }}
        />
      )}
    </div>
  );
}
