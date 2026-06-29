import { normalizeDisplayWord, type VocabSenseInfo } from "@/lib/vocabulary-display";

interface VocabWordLabelProps {
  word: string;
  senseNo?: number;
  showSenseNo?: boolean;
  className?: string;
  bold?: boolean;
}

export function VocabWordLabel({
  word,
  senseNo,
  showSenseNo,
  className = "",
  bold = false,
}: VocabWordLabelProps) {
  const display = normalizeDisplayWord(word);
  const Tag = bold ? "strong" : "span";

  return (
    <Tag className={className}>
      {display}
      {showSenseNo && senseNo != null && (
        <span className="vocab-sense-mark" aria-label={`뜻 ${senseNo}`}>
          {senseNo}
        </span>
      )}
    </Tag>
  );
}

export function VocabWordInline({
  word,
  senseInfo,
  className = "",
  bold = false,
}: {
  word: string;
  senseInfo: VocabSenseInfo;
  className?: string;
  bold?: boolean;
}) {
  return (
    <VocabWordLabel
      word={word}
      senseNo={senseInfo.senseNo}
      showSenseNo={senseInfo.showSenseNo}
      className={className}
      bold={bold}
    />
  );
}
