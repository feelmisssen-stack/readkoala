"use client";

import { useMemo, useState } from "react";
import { AiEthicsCompactPanel } from "@/components/AiEthicsCompactPanel";
import {
  AI_ETHICS_COPY_FIELD_IDS,
  getEthicsBlankAnswersMap,
  isEthicsCopyAnswerCorrect,
  type EthicsGateMode,
} from "@/lib/ai-ethics-content";

function createEmptyAnswers() {
  return Object.fromEntries(AI_ETHICS_COPY_FIELD_IDS.map((id) => [id, ""]));
}

export function AiEthicsGateModal({
  open,
  mode,
  onAcknowledged,
  onClose,
}: {
  open: boolean;
  mode: EthicsGateMode;
  onAcknowledged: () => void;
  onClose: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(createEmptyAnswers);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const answerMap = useMemo(() => getEthicsBlankAnswersMap(), []);
  const copyMode = mode === "copy";

  const allCopyCorrect = useMemo(
    () =>
      AI_ETHICS_COPY_FIELD_IDS.every((fieldId) =>
        isEthicsCopyAnswerCorrect(answers[fieldId] ?? "", answerMap[fieldId] ?? "")
      ),
    [answers, answerMap]
  );

  if (!open) return null;

  function handleAnswerChange(fieldId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  }

  async function handleAcknowledge() {
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/ethics/ack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          answers: copyMode
            ? AI_ETHICS_COPY_FIELD_IDS.map((fieldId) => answers[fieldId] ?? "")
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "확인에 실패했어요.");
      }
      setAnswers(createEmptyAnswers());
      onAcknowledged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "확인에 실패했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-ethics-gate-title"
    >
      <div className="w-full max-w-md rounded-koala-lg bg-white p-4 shadow-xl sm:p-5">
        <AiEthicsCompactPanel
          copyMode={copyMode}
          answers={answers}
          onAnswerChange={handleAnswerChange}
        />

        {error && <p className="mt-3 text-center text-xs text-red-500">{error}</p>}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="koala-btn-secondary flex-1 text-sm"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleAcknowledge}
            disabled={submitting || (copyMode && !allCopyCorrect)}
            className="koala-btn-primary flex-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "확인 중..." : "위의 사항을 지키겠습니다"}
          </button>
        </div>
      </div>
    </div>
  );
}
