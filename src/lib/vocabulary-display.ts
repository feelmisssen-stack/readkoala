import type { DictSense } from "@/lib/dictionary-api";

export function normalizeDisplayWord(input: string): string {
  return input.replaceAll("-", "").replaceAll("^", "");
}

export function formatSenseDefinition(sense: { definition: string; pos?: string }): string {
  return sense.pos ? `(${sense.pos}) ${sense.definition}` : sense.definition;
}

export type VocabSenseInfo = { showSenseNo: boolean; senseNo: number };

export function buildVocabSenseMap(
  vocabulary: Array<{ id: string; word: string; senseNo?: number; createdAt?: string }>
): Map<string, VocabSenseInfo> {
  const groups = new Map<string, typeof vocabulary>();
  for (const entry of vocabulary) {
    const key = normalizeDisplayWord(entry.word);
    const list = groups.get(key);
    if (list) list.push(entry);
    else groups.set(key, [entry]);
  }

  const map = new Map<string, VocabSenseInfo>();
  for (const entries of groups.values()) {
    if (entries.length === 1) {
      map.set(entries[0].id, { showSenseNo: false, senseNo: entries[0].senseNo ?? 1 });
      continue;
    }

    const sorted = [...entries].sort((a, b) => {
      const sa = a.senseNo ?? 0;
      const sb = b.senseNo ?? 0;
      if (sa !== sb) {
        if (sa === 0) return 1;
        if (sb === 0) return -1;
        return sa - sb;
      }
      return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
    });

    let fallback = 1;
    const usedNos = new Set(
      sorted.map((e) => e.senseNo).filter((n): n is number => n != null && n > 0)
    );

    for (const entry of sorted) {
      let senseNo = entry.senseNo;
      if (senseNo == null || senseNo <= 0 || usedNos.has(senseNo)) {
        while (usedNos.has(fallback)) fallback++;
        senseNo = fallback;
        fallback++;
      }
      usedNos.add(senseNo);
      map.set(entry.id, { showSenseNo: true, senseNo });
    }
  }

  return map;
}

export function isSenseInVocab(
  sense: DictSense,
  word: string,
  vocabulary: Array<{ word: string; definition: string }>
): boolean {
  const definition = formatSenseDefinition(sense);
  return vocabulary.some((v) => v.word === word && v.definition === definition);
}

export function vocabSelectLabel(
  entry: { id: string; word: string; definition: string },
  senseMap: Map<string, VocabSenseInfo>,
  resolved?: VocabSenseInfo
): string {
  const word = normalizeDisplayWord(entry.word);
  const info = resolved ?? senseMap.get(entry.id);
  if (!info?.showSenseNo) return word;
  const shortDef =
    entry.definition.length > 24 ? `${entry.definition.slice(0, 24)}…` : entry.definition;
  return `${word}${info.senseNo} — ${shortDef}`;
}

const SUPERSCRIPT_DIGITS: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};

export function toSuperscriptNumber(n: number): string {
  return String(n)
    .split("")
    .map((d) => SUPERSCRIPT_DIGITS[d] ?? d)
    .join("");
}

export function formatVocabWordWithSense(
  word: string,
  senseInfo?: VocabSenseInfo | null,
  useUnicode = false
): string {
  const display = normalizeDisplayWord(word);
  if (!senseInfo?.showSenseNo || senseInfo.senseNo == null) return display;
  const suffix = useUnicode ? toSuperscriptNumber(senseInfo.senseNo) : String(senseInfo.senseNo);
  return `${display}${suffix}`;
}

export function resolveVocabSense(
  entry: { id: string; word: string; senseNo?: number; createdAt?: string },
  vocabulary: Array<{ id: string; word: string; senseNo?: number; createdAt?: string }>,
  senseMap: Map<string, VocabSenseInfo>
): VocabSenseInfo {
  const fromMap = senseMap.get(entry.id);
  if (fromMap) return fromMap;

  const key = normalizeDisplayWord(entry.word);
  const siblings = vocabulary.filter((v) => normalizeDisplayWord(v.word) === key);
  if (siblings.length <= 1) {
    return { showSenseNo: false, senseNo: entry.senseNo ?? 1 };
  }

  const index = siblings.findIndex((v) => v.id === entry.id);
  return {
    showSenseNo: true,
    senseNo: entry.senseNo ?? (index >= 0 ? index + 1 : 1),
  };
}

export function getSharedSentenceSense(
  sentence: {
    vocabularyId?: string;
    word: string;
    definition?: string;
    senseNo?: number;
  },
  vocabulary: Array<{ id: string; word: string; definition: string; senseNo?: number; createdAt?: string }>,
  vocabSenseMap: Map<string, VocabSenseInfo>
): VocabSenseInfo | undefined {
  if (sentence.vocabularyId) {
    const match = vocabulary.find((v) => v.id === sentence.vocabularyId);
    if (match) {
      return resolveVocabSense(match, vocabulary, vocabSenseMap);
    }
  }

  if (sentence.definition) {
    const match = vocabulary.find(
      (v) => v.word === sentence.word && v.definition === sentence.definition
    );
    if (match) {
      return resolveVocabSense(match, vocabulary, vocabSenseMap);
    }
  }

  const sameWord = vocabulary.filter(
    (v) => normalizeDisplayWord(v.word) === normalizeDisplayWord(sentence.word)
  );
  if (sameWord.length > 1 && sentence.senseNo) {
    return { showSenseNo: true, senseNo: sentence.senseNo };
  }

  if (sameWord.length > 1 && sentence.definition) {
    const match = vocabulary.find(
      (v) => v.word === sentence.word && v.definition === sentence.definition
    );
    if (match) {
      return resolveVocabSense(match, vocabulary, vocabSenseMap);
    }
  }

  return undefined;
}
