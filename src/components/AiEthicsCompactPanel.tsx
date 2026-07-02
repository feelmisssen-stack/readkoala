import {
  AI_ETHICS_HEADLINES,
  type EthicsHeadlinePart,
} from "@/lib/ai-ethics-content";

function EthicsBlankInput({
  value,
  placeholder,
  onChange,
  readOnly,
}: {
  value: string;
  placeholder: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}) {
  if (readOnly) {
    return <span className="underline decoration-koala-text/50 underline-offset-2">{placeholder}</span>;
  }

  const width = Math.max(placeholder.length * 0.95 + 1.5, 3);

  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange?.(event.target.value)}
      className="mx-0.5 inline-block border-0 border-b border-koala-text/35 bg-transparent px-0.5 py-0 text-center text-sm text-koala-text outline-none placeholder:font-normal placeholder:text-koala-muted/45 focus:border-koala-primary"
      style={{ width: `${width}rem`, minWidth: "2.5rem" }}
      autoComplete="off"
      spellCheck={false}
    />
  );
}

function renderHeadline(
  parts: EthicsHeadlinePart[],
  answers: Record<string, string>,
  copyMode: boolean,
  onAnswerChange: (fieldId: string, value: string) => void
) {
  return parts.map((part, index) => {
    if (part.type === "text") {
      return <span key={`text-${index}`}>{part.text}</span>;
    }

    return (
      <EthicsBlankInput
        key={part.fieldId}
        value={answers[part.fieldId] ?? ""}
        placeholder={part.answer}
        readOnly={!copyMode}
        onChange={(value) => onAnswerChange(part.fieldId, value)}
      />
    );
  });
}

export function AiEthicsCompactPanel({
  copyMode,
  answers,
  onAnswerChange,
}: {
  copyMode: boolean;
  answers: Record<string, string>;
  onAnswerChange: (fieldId: string, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <h2
        id="ai-ethics-gate-title"
        className="text-center text-base font-bold leading-snug text-koala-text sm:text-lg"
      >
        감상문 도우미를 쓰기 전, 확인해 주세요.
      </h2>

      {copyMode && (
        <p className="text-center text-xs text-koala-muted">
          빈칸의 낱말을 똑같이 써 주세요.
        </p>
      )}

      <ol className="space-y-2.5">
        {AI_ETHICS_HEADLINES.map((row, index) => (
          <li key={row.id} className="text-sm font-normal leading-relaxed text-koala-text">
            <span className="mr-1.5 text-koala-muted">{index + 1}.</span>
            {renderHeadline(row.headline, answers, copyMode, onAnswerChange)}
          </li>
        ))}
      </ol>
    </div>
  );
}
