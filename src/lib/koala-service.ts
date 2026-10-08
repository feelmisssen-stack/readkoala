import { loadWritingGrowthDatabase } from "@/lib/repositories/feed-data";
import { buildKoalaStatus, syncKoalaProfile } from "@/lib/repositories/koala-repository";
import { getUserWritingGrowthFromEntries } from "@/lib/writing-growth";

export async function getUserLeafCount(userId: string): Promise<number> {
  const { reflections, sharedSentences } = await loadWritingGrowthDatabase(userId);
  return getUserWritingGrowthFromEntries(reflections, sharedSentences, userId).leafCount;
}

export async function loadKoalaStatus(userId: string) {
  const leafCount = await getUserLeafCount(userId);
  const profile = await syncKoalaProfile(userId, leafCount);
  return { profile, leafCount, status: await buildKoalaStatus(profile, leafCount) };
}
