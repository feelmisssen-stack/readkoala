"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { AiEthicsGuidePanel } from "@/components/AiEthicsGuidePanel";
import {
  AI_ETHICS_COPY_FIELD_IDS,
  getEthicsBlankAnswersMap,
  isEthicsCopyAnswerCorrect,
  type EthicsGateMode,
} from "@/lib/ai-ethics-content";

interface GateState {
  required: boolean;
  mode?: EthicsGateMode;
  loginNumber?: number;
}

function createEmptyAnswers() {
  return Object.fromEntries(AI_ETHICS_COPY_FIELD_IDS.map((id) => [id, ""]));
}

export function EthicsGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isStudent, setIsStudent] = useState(false);
  const [checking, setChecking] = useState(true);
  const [gate, setGate] = useState<GateState>({ required: false });
  const [answers, setAnswers] = useState<Record<string, string>>(createEmptyAnswers);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const answerMap = useMemo(() => getEthicsBlankAnswersMap(), []);

  const loadGate = useCallback(() => {
    setChecking(true);
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((authData) => {
        const student = Boolean(authData.user && !authData.user.isAdmin);
        setIsStudent(student);
        if (!student || pathname.startsWith("/admin")) {
          setGate({ required: false });
          setChecking(false);
          return;
        }

        return fetch("/api/ethics/gate", { cache: "no-store" })
          .then((res) => res.json())
          .then((gateData: GateState) => {
            setGate(gateData);
            setAnswers(createEmptyAnswers());
            setError("");
          });
      })
      .catch(() => {
        setGate({ required: false });
      })
      .finally(() => setChecking(false));
  }, [pathname]);

  useEffect(() => {
    loadGate();
    window.addEventListener("auth-changed", loadGate);
    return () => window.removeEventListener("auth-changed", loadGate);
  }, [loadGate]);

  const allCopyCorrect = useMemo(
    () =>
      AI_ETHICS_COPY_FIELD_IDS.every((fieldId) =>
        isEthicsCopyAnswerCorrect(answers[fieldId] ?? "", answerMap[fieldId] ?? "")
      ),
    [answers, answerMap]
  );

  function handleAnswerChange(fieldId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  }

  async function handleAcknowledge() {
    if (!gate.mode) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/ethics/ack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: gate.mode,
          answers:
            gate.mode === "copy"
              ? AI_ETHICS_COPY_FIELD_IDS.map((fieldId) => answers[fieldId] ?? "")
              : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "확인에 실패했어요.");
      }
      setGate({ required: false });
      window.dispatchEvent(new Event("ethics-acknowledged"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "확인에 실패했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  const showOverlay = isStudent && !checking && gate.required && gate.mode;
  const copyMode = gate.mode === "copy";

  return (
    <>
      {children}
      {showOverlay && (
        <div
          className="fixed inset-0 z-[115] flex items-center justify-center bg-black/45 p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ai-ethics-gate-title"
        >
          <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="overflow-y-auto px-3 py-4 sm:px-5 sm:py-5">
              <AiEthicsGuidePanel
                copyMode={copyMode}
                answers={answers}
                onAnswerChange={handleAnswerChange}
              />
              {error && <p className="mt-4 text-center text-sm text-red-500">{error}</p>}
            </div>

            <div className="border-t border-orange-100 bg-white px-4 py-4 sm:px-5">
              <button
                type="button"
                onClick={handleAcknowledge}
                disabled={submitting || (copyMode && !allCopyCorrect)}
                className="koala-btn-primary w-full text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "확인 중..." : "위의 사항을 지키겠습니다"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
