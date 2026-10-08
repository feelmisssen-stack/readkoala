/** 10단계(900잎새)를 넘은 뒤 200잎새마다 코알라 변신권 1개. 쓰지 않으면 최대 3개까지만 모인다 */
export const KOALA_CHANGE_START_LEAVES = 900;
export const KOALA_CHANGE_LEAVES_STEP = 200;
export const KOALA_CHANGE_MAX_STORED = 3;
export const KOALA_PROMPT_MAX_LENGTH = 15;
/** 그림을 만든 뒤 마음에 안 들면 한 번 더 만들어 볼 수 있다 (변신권 추가 사용 없음) */
export const KOALA_FREE_RETRIES = 1;

export interface KoalaCreditState {
  stored: number;
  /** 지금까지 변신권으로 바꿔 준 횟수 계산값. 잎새가 늘어 이 값보다 커진 만큼만 새로 준다 */
  accountedEarned: number;
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
  unlocked: boolean;
  active: KoalaAvatarView | null;
  previews: KoalaAvatarView[];
  retriesLeft: number;
  promptMaxLength: number;
}

export function earnedKoalaChanges(leafCount: number): number {
  if (leafCount < KOALA_CHANGE_START_LEAVES) return 0;
  return Math.floor((leafCount - KOALA_CHANGE_START_LEAVES) / KOALA_CHANGE_LEAVES_STEP);
}

export function leavesUntilNextKoalaChange(leafCount: number): number {
  const nextAt =
    KOALA_CHANGE_START_LEAVES + (earnedKoalaChanges(leafCount) + 1) * KOALA_CHANGE_LEAVES_STEP;
  return Math.max(0, nextAt - leafCount);
}

/** 잎새가 늘어 새로 생긴 변신권을 더한다. 3개를 넘는 몫은 버린다 */
export function settleKoalaCredits(
  state: KoalaCreditState,
  leafCount: number
): KoalaCreditState & { changed: boolean } {
  const earned = earnedKoalaChanges(leafCount);
  if (earned <= state.accountedEarned) return { ...state, changed: false };
  return {
    stored: Math.min(KOALA_CHANGE_MAX_STORED, state.stored + (earned - state.accountedEarned)),
    accountedEarned: earned,
    changed: true,
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
