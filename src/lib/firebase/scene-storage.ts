import { v4 as uuid } from "uuid";
import { getStorage } from "firebase-admin/storage";
import { getFirebaseClientConfig, isFirebaseAdminConfigured } from "@/lib/firebase/config";
import { getAdminApp } from "@/lib/firebase/admin";

export function isFirebaseStorageEnabled(): boolean {
  return isFirebaseAdminConfigured() && Boolean(getFirebaseClientConfig().storageBucket);
}

function getBucket() {
  getAdminApp();
  const bucketName = getFirebaseClientConfig().storageBucket;
  return getStorage().bucket(bucketName);
}

export function isFirebaseStorageUrl(url?: string): boolean {
  return Boolean(
    url &&
      (url.includes("firebasestorage.googleapis.com") || url.includes("storage.googleapis.com"))
  );
}

export function buildSceneStoragePath(
  folder: "pending" | "approved",
  userId: string,
  bookId: string
) {
  return `memorable-scenes/${folder}/${userId}/${bookId}.jpg`;
}

function buildDownloadUrl(bucketName: string, storagePath: string, token: string) {
  const encodedPath = encodeURIComponent(storagePath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${token}`;
}

export function parseFirebaseStoragePath(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("firebasestorage.googleapis.com")) return null;
    const match = parsed.pathname.match(/\/o\/(.+)$/);
    if (!match?.[1]) return null;
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export async function uploadSceneBufferToStorage(
  buffer: Buffer,
  storagePath: string,
  contentType: string
): Promise<string> {
  const bucket = getBucket();
  const token = uuid();
  const file = bucket.file(storagePath);

  await file.save(buffer, {
    metadata: {
      contentType,
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    },
  });

  return buildDownloadUrl(bucket.name, storagePath, token);
}

export async function deleteSceneFromStorage(url?: string) {
  if (!url || !isFirebaseStorageUrl(url)) return;
  const storagePath = parseFirebaseStoragePath(url);
  if (!storagePath) return;
  await getBucket().file(storagePath).delete({ ignoreNotFound: true });
}

export async function promotePendingSceneInStorage(
  pendingUrl: string,
  approvedStoragePath: string
): Promise<string> {
  const pendingPath = parseFirebaseStoragePath(pendingUrl);
  if (!pendingPath) {
    throw new Error("PENDING_PATH_NOT_FOUND");
  }

  const bucket = getBucket();
  const token = uuid();

  await bucket.file(pendingPath).copy(bucket.file(approvedStoragePath));
  await bucket.file(approvedStoragePath).setMetadata({
    metadata: {
      firebaseStorageDownloadTokens: token,
    },
  });
  await bucket.file(pendingPath).delete({ ignoreNotFound: true });

  return buildDownloadUrl(bucket.name, approvedStoragePath, token);
}

export async function testFirebaseStorageConnection(): Promise<{
  ok: boolean;
  bucketName: string;
  testedAt: string;
  error?: string;
}> {
  const bucketName = getFirebaseClientConfig().storageBucket;
  const testedAt = new Date().toISOString();
  const testPath = `_system/storage-test-${Date.now()}.txt`;

  try {
    const bucket = getBucket();
    const file = bucket.file(testPath);
    await file.save(Buffer.from("readkoala-storage-test"), {
      metadata: { contentType: "text/plain" },
    });
    await file.delete({ ignoreNotFound: true });
    return { ok: true, bucketName, testedAt };
  } catch (error) {
    return {
      ok: false,
      bucketName,
      testedAt,
      error: error instanceof Error ? error.message : "Storage test failed",
    };
  }
}
