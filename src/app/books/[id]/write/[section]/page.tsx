"use client";

import { useCallback, useEffect, useRef, useState, use, type MouseEvent } from "react";
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
import { alertContentFilterApiError } from "@/lib/content-filter-client";
import { collectReflectionTexts, validateContent } from "@/lib/content-filter";
import type { BeforeReadingActivity, BeforeReadingPair, Book, Reflection } from "@/lib/types";

const VALID_SECTIONS = new Set<string>(SECTION_ORDER);
const AUTO_SAVE_DELAY_MS = 800;

type SaveStatus = "idle" | "saving" | "saved" | "error";

type ReflectionDraftState = {
  beforeReadingActivities: BeforeReadingActivity[];
  beforeReadingPairs: BeforeReadingPair[];
  duringReadingActivities: BeforeReadingActivity[];
  duringReadingPairs: BeforeReadingPair[];
  association: string;
  favoriteQuote: string;
  reviewTitle: string;
  reviewReason: string;
  reviewContent: string;
  reviewImpressiveScene: string;
  reviewThoughts: string;
};

const SECTION_FIELDS: Partial<Record<ReflectionSection, Array<keyof ReflectionDraftState>>> = {
  before_reading: ["beforeReadingActivities", "beforeReadingPairs"],
  during_reading: ["duringReadingActivities", "duringReadingPairs"],
  association: ["association"],
  quote: ["favoriteQuote"],
  review: ["reviewTitle", "reviewReason", "reviewContent", "reviewImpressiveScene", "reviewThoughts"],
};

function checkSection(state: ReflectionDraftState, section: ReflectionSection) {
  const fields: Record<string, unknown> = {};
  for (const key of SECTION_FIELDS[section] ?? []) fields[key] = state[key];
  return validateContent(collectReflectionTexts(fields));
}

function findBlockedSections(state: ReflectionDraftState): ReflectionSection[] {
  return SECTION_ORDER.filter((section) => !checkSection(state, section).ok);
}

/** 지정한 단계의 칸만 마지막으로 저장된 내용으로 되돌린 사본 */
function withSavedSections(
  state: ReflectionDraftState,
  sections: ReflectionSection[],
  saved: ReflectionDraftState | null
): ReflectionDraftState {
  if (!saved || sections.length === 0) return state;
  const next = { ...state } as Record<keyof ReflectionDraftState, unknown>;
  for (const section of sections) {
    for (const key of SECTION_FIELDS[section] ?? []) next[key] = saved[key];
  }
  return next as ReflectionDraftState;
}

type BlockedDraft = { baseUpdatedAt: string | null; state: ReflectionDraftState };

function writeBlockedDraft(key: string, draft: BlockedDraft) {
  try {
    localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // 저장 공간이 없으면 임시 보관 없이 진행
  }
}

function removeBlockedDraft(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // 저장 공간 접근이 막힌 브라우저
  }
}

/** 임시 글을 보관한 뒤로 서버 기록이 바뀌지 않았을 때만 돌려준다 (다른 기기에서 고쳤으면 버린다) */
function readBlockedDraft(key: string, serverUpdatedAt?: string): BlockedDraft | null {
  try {
    const draft = JSON.parse(localStorage.getItem(key) || "null") as BlockedDraft | null;
    if (!draft?.state) return null;
    if (draft.baseUpdatedAt !== (serverUpdatedAt ?? null)) {
      localStorage.removeItem(key);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

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
  /** 같은 안내 창이 자동 저장마다 반복해서 뜨지 않도록 마지막으로 띄운 문구를 기억한다 */
  const alertedMessageRef = useRef("");
  const savedStateRef = useRef<ReflectionDraftState | null>(null);
  const serverUpdatedAtRef = useRef<string | null>(null);
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

  const draftKey = `reflection-draft:${bookId}`;

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

    function applyState(s: ReflectionDraftState) {
      setBeforeReadingActivities(s.beforeReadingActivities);
      setBeforeReadingPairs(s.beforeReadingPairs);
      setDuringReadingActivities(s.duringReadingActivities);
      setDuringReadingPairs(s.duringReadingPairs);
      setAssociation(s.association);
      setFavoriteQuote(s.favoriteQuote);
      setReviewTitle(s.reviewTitle);
      setReviewReason(s.reviewReason);
      setReviewContent(s.reviewContent);
      setReviewImpressiveScene(s.reviewImpressiveScene);
      setReviewThoughts(s.reviewThoughts);
    }

    Promise.all([
      fetch(`/api/books/${bookId}`).then((r) => r.json()),
      fetch(`/api/reflections?bookId=${bookId}`).then((r) => r.json()),
    ])
      .then(([bookData, reflectionData]) => {
        const loadedBook = bookData.book as Book | null;
        if (loadedBook) setBook(loadedBook);

        const r0 = reflectionData.reflections?.[0] as Reflection | undefined;
        const beforeActivities = loadBeforeReadingActivities(r0?.beforeReadingActivities, r0?.beforeReading);
        const duringActivities = loadDuringReadingActivities(
          r0?.duringReadingActivities,
          r0?.duringReading
        );
        const serverState: ReflectionDraftState = {
          beforeReadingActivities: beforeActivities,
          beforeReadingPairs: syncPairsWithActivities(
            loadBeforeReadingPairs(r0?.beforeReadingPairs, r0?.beforeReading),
            beforeActivities
          ),
          duringReadingActivities: duringActivities,
          duringReadingPairs: syncPairsWithActivities(
            loadDuringReadingPairs(r0?.duringReadingPairs, r0?.duringReading),
            duringActivities
          ),
          association: stripBookTitleFromAssociation(loadedBook?.title || "", r0?.association || ""),
          favoriteQuote: r0?.favoriteQuote || "",
          reviewTitle: r0?.reviewTitle || "",
          reviewReason: r0?.reviewReason || "",
          reviewContent: r0?.reviewContent || "",
          reviewImpressiveScene: r0?.reviewImpressiveScene || "",
          reviewThoughts: r0?.reviewThoughts || "",
        };
        savedStateRef.current = serverState;
        serverUpdatedAtRef.current = r0?.updatedAt ?? null;
        setMemorableSceneImage(r0?.memorableSceneImage || "");
        setMemorableSceneStatus(r0?.memorableSceneStatus);

        // 저장이 막혀 서버에 없는 글은 이 기기에 보관된 것으로 되살린다
        const draft = readBlockedDraft(draftKey, r0?.updatedAt);
        applyState(draft?.state ?? serverState);
      })
      .finally(() => setLoaded(true));
  }, [bookId, section, draftKey]);

  bookTitleRef.current = book?.title || "";

  const currentCheck = checkSection(formStateRef.current, typedSection);
  const blockedMessage = currentCheck.ok ? "" : currentCheck.message;

  const buildBody = useCallback((state: ReflectionDraftState) => {
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

    // 지금 화면이 아닌 단계에 막힌 글이 있으면 그 칸만 마지막 저장본으로 보내서 지금 화면은 저장되게 한다.
    // 막힌 글 자체는 이 기기에 임시 보관한다.
    const state = formStateRef.current;
    const blocked = findBlockedSections(state);
    const otherBlocked = blocked.filter((s) => s !== typedSection);
    const sendState = withSavedSections(state, otherBlocked, savedStateRef.current);
    if (blocked.length > 0) {
      writeBlockedDraft(draftKey, { baseUpdatedAt: serverUpdatedAtRef.current, state });
    }

    try {
      const res = await fetch("/api/reflections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody(sendState)),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "content_filter" && typeof data.error === "string") {
          if (alertedMessageRef.current !== data.error) {
            alertContentFilterApiError(res, data);
          }
          alertedMessageRef.current = data.error;
          setSaveStatus("error");
          return false;
        }
        setError(data.error || "저장에 실패했어요.");
        setSaveStatus("error");
        return false;
      }
      alertedMessageRef.current = "";
      savedStateRef.current = sendState;
      serverUpdatedAtRef.current = (data.reflection as Reflection | undefined)?.updatedAt ?? null;
      if (blocked.length > 0) {
        writeBlockedDraft(draftKey, { baseUpdatedAt: serverUpdatedAtRef.current, state });
      } else {
        removeBlockedDraft(draftKey);
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
  }, [buildBody, typedSection, draftKey]);

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

  /** 내용 검사로 막힌 글은 이 기기에 임시 보관되므로 이동해도 된다. 그 밖의 실패는 머무른다. */
  async function saveBeforeLeaving(): Promise<boolean> {
    if (!isLoggedIn) return true;
    const saved = await flushSave();
    return saved || findBlockedSections(formStateRef.current).length > 0;
  }

  async function goToSection(target: ReflectionSection) {
    if (!(await saveBeforeLeaving())) return;
    router.push(`/books/${bookId}/write/${target}`);
  }

  async function handleBackClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!isLoggedIn) return;
    event.preventDefault();
    if (!(await saveBeforeLeaving())) return;
    router.push(`/books/${bookId}`);
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
        <BackLink href={`/books/${bookId}`} onClick={handleBackClick}>
          감상 기록 전체 화면으로 돌아가기
        </BackLink>
        <div className="mt-2 flex flex-wrap items-baseline gap-2">
          <div className="flex items-center gap-2">
            {showSectionIcon && (
              <SectionIcon className={`${iconMd} shrink-0 text-koala-primary`} strokeWidth={1.75} aria-hidden />
            )}
            <h1 className="text-2xl font-display text-koala-heading">{SECTION_LABELS[typedSection]}</h1>
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

      {blockedMessage && (
        <div
          role="alert"
          className="rounded-koala border border-red-200 bg-red-50 p-4 text-sm text-red-600"
        >
          <p className="font-medium">이 내용은 아직 저장되지 않고, 이 기기에 임시로 보관돼 있어요.</p>
          <p className="mt-1">{blockedMessage}</p>
          <p className="mt-1 text-red-500/80">
            다른 화면에 다녀와도 글은 그대로 남아 있어요. 고치면 자동으로 저장돼요.
          </p>
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
