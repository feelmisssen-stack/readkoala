const STDICT_SEARCH_URL = "https://stdict.korean.go.kr/api/search.do";

const FALLBACK_DICT: Record<string, string> = {
  감상: "사물이나 현상을 보고 느끼거나 생각함.",
  독서: "책을 읽음.",
  상상: "머릿속으로 그림을 그리거나 생각함.",
  인상: "마음에 남는 느낌.",
  느낌: "마음으로 받아들이는 기분.",
  표지: "책의 겉면.",
  차례: "책에서 내용이 나오는 순서.",
  문장: "생각을 말이나 글로 나타낸 것.",
  단어: "뜻을 가진 말.",
  이야기: "어떤 일이나 사건을 말이나 글로 전함.",
  주인공: "이야기의 가장 중심이 되는 사람이나 동물.",
  배경: "이야기가 일어나는 시간이나 장소.",
  교훈: "배워야 할 가르침.",
  용기: "어려운 일을 내려는 마음.",
  우정: "친구 사이의 정.",
  꿈: "잠잘 때 보는 것이나 이루고 싶은 것.",
  모험: "새롭고 신나는 일을 겪음.",
  비밀: "남에게 알리지 않고 숨기는 것.",
  발견: "처음 알게 되거나 찾아냄.",
  성장: "점점 자라거나 발전함.",
};

export interface DictSense {
  definition: string;
  pos?: string;
  /** 표준국어대사전 동형어 번호 (sup_no) */
  senseNo?: number;
}

export interface DictResult {
  word: string;
  definition: string;
  senses: DictSense[];
  source: "api" | "fallback";
  error?: "missing_api_key" | "api_error" | "not_found";
}

interface StdictSense {
  definition?: string;
  pos?: string;
}

interface StdictItem {
  word?: string;
  sup_no?: number | string;
  pos?: string;
  sense?: StdictSense | StdictSense[];
}

interface StdictResponse {
  channel?: {
    total?: number;
    item?: StdictItem | StdictItem[];
  };
  error?: {
    error_code?: string | number;
    message?: string;
  };
}

import { getStdictApiKey, isDictionaryApiConfigured } from "./dictionary-config";
import { normalizeDisplayWord } from "@/lib/vocabulary-display";

export { isDictionaryApiConfigured };

function getApiKey(): string | undefined {
  return getStdictApiKey();
}

function cleanDefinition(text?: string): string {
  if (!text) return "";
  return text.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function extractDefinitions(item: StdictItem): string[] {
  if (!item.sense) return [];
  const senses = Array.isArray(item.sense) ? item.sense : [item.sense];
  return senses.map((s) => cleanDefinition(s.definition)).filter(Boolean);
}

function pickMatchingItems(items: StdictItem[], query: string): StdictItem[] {
  const exact = items.filter((item) => item.word === query);
  if (exact.length > 0) return exact;

  const firstMatch = items.find((item) => item.word?.startsWith(query));
  if (firstMatch?.word) {
    return items.filter((item) => item.word === firstMatch.word);
  }

  return items.length > 0 ? [items[0]] : [];
}

function formatItemSenses(item: StdictItem): DictSense[] {
  const definitions = extractDefinitions(item);
  const pos = item.pos?.trim();
  const senseNo = Number(item.sup_no) || undefined;
  return definitions.map((definition) => ({
    definition,
    ...(senseNo ? { senseNo } : {}),
    ...(pos ? { pos } : {}),
  }));
}

function toDictResult(items: StdictItem[], query: string): DictResult | null {
  const sorted = [...items].sort((a, b) => {
    const na = Number(a.sup_no) || 0;
    const nb = Number(b.sup_no) || 0;
    return na - nb;
  });

  const senses = sorted.flatMap((item) => formatItemSenses(item)).filter((s) => s.definition);
  if (senses.length === 0) return null;

  const definition =
    senses.length === 1
      ? senses[0].pos
        ? `(${senses[0].pos}) ${senses[0].definition}`
        : senses[0].definition
      : senses
          .map((sense, i) => {
            const pos = sense.pos ? `(${sense.pos}) ` : "";
            return `${i + 1}. ${pos}${sense.definition}`;
          })
          .join("\n");

  return {
    word: normalizeDisplayWord(sorted[0]?.word || query),
    definition,
    senses,
    source: "api",
  };
}

async function searchStdict(
  query: string,
  method: "exact" | "include" = "exact"
): Promise<StdictItem[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const params = new URLSearchParams({
    key: apiKey,
    q: query,
    req_type: "json",
    start: "1",
    num: "20",
  });

  if (method === "include") {
    params.set("advanced", "y");
    params.set("method", "include");
    params.set("target", "1");
  }

  const res = await fetch(`${STDICT_SEARCH_URL}?${params}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const text = await res.text();
  if (!text.trim()) return [];

  const data = JSON.parse(text) as StdictResponse;
  if (data.error) {
    throw new Error(data.error.message || `API error ${data.error.error_code}`);
  }

  const items = data.channel?.item;
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}

async function lookupFromStdict(query: string): Promise<DictResult | null> {
  let items = await searchStdict(query, "exact");
  let matches = pickMatchingItems(items, query);

  if (matches.length === 0 || matches.every((item) => extractDefinitions(item).length === 0)) {
    items = await searchStdict(query, "include");
    matches = pickMatchingItems(items, query);
  }

  matches = matches.filter((item) => extractDefinitions(item).length > 0);
  if (matches.length === 0) return null;
  return toDictResult(matches, query);
}

export async function lookupWord(word: string): Promise<DictResult | null> {
  const trimmed = word.trim();
  if (!trimmed) return null;

  if (!isDictionaryApiConfigured()) {
    return {
      word: trimmed,
      definition:
        "표준국어대사전 API 키가 없어요. 국어사전 페이지 위쪽에서 API 키를 입력하고 저장해 주세요.",
      senses: [],
      source: "fallback",
      error: "missing_api_key",
    };
  }

  try {
    const result = await lookupFromStdict(trimmed);
    if (result) return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "API 오류";
    return {
      word: trimmed,
      definition: `사전 API 호출에 실패했어요. (${message}) STDICT_API_KEY가 올바른지 확인해 주세요.`,
      senses: [],
      source: "fallback",
      error: "api_error",
    };
  }

  if (FALLBACK_DICT[trimmed]) {
    const def = FALLBACK_DICT[trimmed];
    return { word: trimmed, definition: def, senses: [{ definition: def }], source: "fallback" };
  }

  for (const [key, def] of Object.entries(FALLBACK_DICT)) {
    if (key.includes(trimmed) || trimmed.includes(key)) {
      return { word: key, definition: def, senses: [{ definition: def }], source: "fallback" };
    }
  }

  return {
    word: trimmed,
    definition: `"${trimmed}"의 뜻을 표준국어대사전에서 찾지 못했어요. 다른 표현으로 검색해 보세요.`,
    senses: [],
    source: "fallback",
    error: "not_found",
  };
}

export { getInitialConsonant } from "@/lib/dictionary/initial-consonant";
