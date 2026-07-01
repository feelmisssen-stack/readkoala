import {
  AI_ETHICS_GUIDE_ROWS,
  type EthicsGuideRow,
  type EthicsHeadlinePart,
} from "@/lib/ai-ethics-content";

const VALUE_BADGE_CLASS = {
  orange: "border-orange-200 bg-orange-50 text-orange-700",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  blue: "border-sky-200 bg-sky-50 text-sky-700",
} as const;

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
    return (
      <span className="inline-block border-b-2 border-orange-300 px-1 font-bold text-koala-text">
        {placeholder}
      </span>
    );
  }

  const width = Math.max(placeholder.length * 1.15 + 2, 4);

  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange?.(event.target.value)}
      className="mx-0.5 inline-block border-0 border-b-2 border-orange-300 bg-yellow-100/80 px-1 py-0.5 text-center text-sm font-bold text-koala-text outline-none placeholder:font-normal placeholder:text-orange-300 focus:border-orange-500 focus:bg-yellow-100"
      style={{ width: `${width}rem`, minWidth: "3rem" }}
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

function GuideRow({
  row,
  answers,
  copyMode,
  onAnswerChange,
}: {
  row: EthicsGuideRow;
  answers: Record<string, string>;
  copyMode: boolean;
  onAnswerChange: (fieldId: string, value: string) => void;
}) {
  return (
    <tr className="align-top">
      <td className="border border-orange-100 bg-white px-3 py-4">
        <div className="flex flex-wrap gap-2">
          {row.values.map((value) => (
            <span
              key={value.label}
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${VALUE_BADGE_CLASS[value.tone]}`}
            >
              {value.label}
            </span>
          ))}
        </div>
      </td>
      <td className="border border-orange-100 bg-white px-3 py-4 text-sm font-semibold text-orange-600">
        <p>{row.guideNumber}</p>
        <p className="mt-1 text-koala-text">{row.guideName}</p>
      </td>
      <td className="border border-orange-100 bg-white px-4 py-4">
        <p className="text-sm font-bold leading-relaxed text-koala-text">
          {renderHeadline(row.headline, answers, copyMode, onAnswerChange)}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-koala-muted">{row.body}</p>
      </td>
    </tr>
  );
}

export function AiEthicsGuidePanel({
  copyMode,
  answers,
  onAnswerChange,
}: {
  copyMode: boolean;
  answers: Record<string, string>;
  onAnswerChange: (fieldId: string, value: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-orange-100 bg-[#fffaf3] p-4 sm:p-6">
      <div className="mb-5 text-center">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-koala-muted">
          GENERATIVE AI ETHICS
        </p>
        <h2 id="ai-ethics-gate-title" className="mt-2 text-2xl font-bold text-koala-text sm:text-3xl">
          윤리 핵심 가이드라인
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-koala-muted">
          학습 포털을 이용하기 전, 생성형 AI 활용 윤리 가이드를 빠짐없이 읽고 숙지해 주세요.
        </p>
        {copyMode && (
          <p className="mt-2 text-sm font-medium text-orange-700">
            노란 빈칸에 희미하게 보이는 글자를 따라 써 주세요.
          </p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse overflow-hidden rounded-xl">
          <thead>
            <tr className="bg-[#f39b44] text-white">
              <th className="border border-orange-300 px-3 py-3 text-left text-sm font-bold">핵심 가치</th>
              <th className="border border-orange-300 px-3 py-3 text-left text-sm font-bold">가이드</th>
              <th className="border border-orange-300 px-4 py-3 text-left text-sm font-bold">핵심 가이드</th>
            </tr>
          </thead>
          <tbody>
            {AI_ETHICS_GUIDE_ROWS.map((row) => (
              <GuideRow
                key={row.id}
                row={row}
                answers={answers}
                copyMode={copyMode}
                onAnswerChange={onAnswerChange}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
