/**
 * 1100잎새에 첫 변신권, 그 뒤 400잎새마다 1개.
 * 한 주(한국 시간 월요일 시작)에 1개까지만 받고, 쓰지 않으면 최대 3개까지만 모인다.
 */
export const KOALA_FIRST_CHANGE_LEAVES = 1100;
export const KOALA_CHANGE_LEAVES_STEP = 400;
export const KOALA_CHANGE_MAX_STORED = 3;
/** accountedEarned를 지금 규칙으로 계산했는지 표시. 예전(900부터 200마다) 값은 처음 읽을 때 바꾼다 */
export const KOALA_CREDIT_RULE_VERSION = 2;
const LEGACY_START_LEAVES = 900;
const LEGACY_LEAVES_STEP = 200;
export const KOALA_PROMPT_MAX_LENGTH = 15;
/** 그림을 만든 뒤 마음에 안 들면 한 번 더 만들어 볼 수 있다 (변신권 추가 사용 없음) */
export const KOALA_FREE_RETRIES = 1;

export interface KoalaCreditState {
  stored: number;
  /** 지금까지 변신권으로 바꿔 준 횟수 계산값. 잎새가 늘어 이 값보다 커진 만큼만 새로 준다 */
  accountedEarned: number;
  /** 마지막으로 변신권을 받은 주의 월요일 (YYYY-MM-DD) */
  lastCreditWeek?: string;
  ruleVersion?: number;
}

export interface KoalaAvatarView {
  id: string;
  name: string;
  imageUrl: string;
}

export interface KoalaStatus {
  stored: number;
  maxStored: number;
  /** 다음 변신권까지 남은 잎새 */
  nextChangeInLeaves: number;
  /** 잎새는 다 모았지만 이번 주에 이미 받아서 다음 주를 기다리는 중 */
  nextChangeWaitsForWeek: boolean;
  unlocked: boolean;
  active: KoalaAvatarView | null;
  previews: KoalaAvatarView[];
  /** 예전에 골라 썼던 코알라. 변신권 없이 다시 쓸 수 있다 */
  pastKoalas: KoalaAvatarView[];
  retriesLeft: number;
  promptMaxLength: number;
}

export function earnedKoalaChanges(leafCount: number): number {
  if (leafCount < KOALA_FIRST_CHANGE_LEAVES) return 0;
  return Math.floor((leafCount - KOALA_FIRST_CHANGE_LEAVES) / KOALA_CHANGE_LEAVES_STEP) + 1;
}

/** accountedEarned번째 다음 변신권이 생기는 잎새까지 남은 수 */
export function leavesUntilNextKoalaChange(leafCount: number, accountedEarned: number): number {
  const nextAt = KOALA_FIRST_CHANGE_LEAVES + accountedEarned * KOALA_CHANGE_LEAVES_STEP;
  return Math.max(0, nextAt - leafCount);
}

/** 한국 시간 기준 그 주 월요일 (YYYY-MM-DD) */
export function koalaCreditWeek(now: Date): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  kst.setUTCDate(kst.getUTCDate() - ((kst.getUTCDay() + 6) % 7));
  return kst.toISOString().slice(0, 10);
}

function convertLegacyAccounted(accountedEarned: number): number {
  if (accountedEarned <= 0) return 0;
  return earnedKoalaChanges(LEGACY_START_LEAVES + accountedEarned * LEGACY_LEAVES_STEP);
}

export function currentAccountedEarned(state: KoalaCreditState): number {
  return state.ruleVersion === KOALA_CREDIT_RULE_VERSION
    ? state.accountedEarned
    : convertLegacyAccounted(state.accountedEarned);
}

/**
 * 잎새가 늘어 새로 생긴 변신권을 한 주에 1개까지만 더한다.
 * 이번 주에 이미 받았으면 다음 주로 미루고, 3개가 가득 차 있으면 그 몫은 버린다.
 */
export function settleKoalaCredits(
  state: KoalaCreditState,
  leafCount: number,
  now = new Date()
): KoalaCreditState & { changed: boolean } {
  const migrated = state.ruleVersion !== KOALA_CREDIT_RULE_VERSION;
  const earned = earnedKoalaChanges(leafCount);
  const week = koalaCreditWeek(now);
  let { stored, lastCreditWeek } = state;
  let accountedEarned = currentAccountedEarned(state);
  let updated = false;

  if (earned > accountedEarned) {
    if (stored >= KOALA_CHANGE_MAX_STORED) {
      accountedEarned = earned;
      updated = true;
    } else if (lastCreditWeek !== week) {
      stored += 1;
      accountedEarned += 1;
      lastCreditWeek = week;
      updated = true;
    }
  }

  return {
    stored,
    accountedEarned,
    lastCreditWeek,
    ruleVersion: KOALA_CREDIT_RULE_VERSION,
    changed: migrated || updated,
  };
}

/** 학생이 끝에 "코알라"를 붙여 써도 한 번만 붙도록 정리한다 */
export function normalizeKoalaPrompt(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s*코알라$/, "")
    .trim();
}

export function koalaDisplayName(prompt: string): string {
  return `${prompt} 코알라`;
}
