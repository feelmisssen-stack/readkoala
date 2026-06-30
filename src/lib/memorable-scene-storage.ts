import { copyFile, mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import {
  buildSceneStoragePath,
  deleteSceneFromStorage,
  isFirebaseStorageEnabled,
  isFirebaseStorageUrl,
  promotePendingSceneInStorage,
  uploadSceneBufferToStorage,
} from "@/lib/firebase/scene-storage";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "memorable-scenes");
const PENDING_DIR = path.join(UPLOAD_DIR, "pending");
const LOCAL_MIME = "image/jpeg";

export function getSceneMaxUploadBytes() {
  return 500 * 1024;
}

function localFilename(userId: string, bookId: string) {
  return `${userId}-${bookId}.jpg`;
}

async function removeLocalFileIfExists(filepath: string) {
  try {
    await unlink(filepath);
  } catch {
    // ignore missing files
  }
}

async function clearFirebaseSceneFiles(userId: string, bookId: string) {
  const pendingPath = buildSceneStoragePath("pending", userId, bookId);
  const approvedPath = buildSceneStoragePath("approved", userId, bookId);
  const { getStorage } = await import("firebase-admin/storage");
  const { getFirebaseClientConfig } = await import("@/lib/firebase/config");
  const { getAdminApp } = await import("@/lib/firebase/admin");
  getAdminApp();
  const bucket = getStorage().bucket(getFirebaseClientConfig().storageBucket);
  await bucket.file(pendingPath).delete({ ignoreNotFound: true });
  await bucket.file(approvedPath).delete({ ignoreNotFound: true });
}

export async function saveSceneImage(input: {
  userId: string;
  bookId: string;
  buffer: Buffer;
  approved: boolean;
}): Promise<{ approvedUrl?: string; pendingUrl?: string }> {
  if (isFirebaseStorageEnabled()) {
    try {
      await clearFirebaseSceneFiles(input.userId, input.bookId);

      if (input.approved) {
        const approvedPath = buildSceneStoragePath("approved", input.userId, input.bookId);
        const approvedUrl = await uploadSceneBufferToStorage(
          input.buffer,
          approvedPath,
          LOCAL_MIME
        );
        return { approvedUrl };
      }

      const pendingPath = buildSceneStoragePath("pending", input.userId, input.bookId);
      const pendingUrl = await uploadSceneBufferToStorage(input.buffer, pendingPath, LOCAL_MIME);
      return { pendingUrl };
    } catch (error) {
      console.error("Firebase Storage upload failed, using local storage:", error);
    }
  }

  const filename = localFilename(input.userId, input.bookId);
  const approvedPath = path.join(UPLOAD_DIR, filename);
  const pendingPath = path.join(PENDING_DIR, filename);
  const approvedUrl = `/uploads/memorable-scenes/${filename}`;
  const pendingUrl = `/uploads/memorable-scenes/pending/${filename}`;

  if (input.approved) {
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(approvedPath, input.buffer);
    await removeLocalFileIfExists(pendingPath);
    return { approvedUrl };
  }

  await mkdir(PENDING_DIR, { recursive: true });
  await writeFile(pendingPath, input.buffer);
  await removeLocalFileIfExists(approvedPath);
  return { pendingUrl };
}

export async function removeSceneImage(url?: string) {
  if (!url) return;
  if (isFirebaseStorageUrl(url)) {
    await deleteSceneFromStorage(url);
    return;
  }

  const imagePath = url.replace(/^\//, "");
  await removeLocalFileIfExists(path.join(process.cwd(), "public", imagePath));
}

export async function approveSceneImage(input: {
  userId: string;
  bookId: string;
  pendingUrl: string;
}): Promise<string> {
  if (isFirebaseStorageUrl(input.pendingUrl)) {
    const approvedPath = buildSceneStoragePath("approved", input.userId, input.bookId);
    return promotePendingSceneInStorage(input.pendingUrl, approvedPath);
  }

  const filename = localFilename(input.userId, input.bookId);
  const pendingPath = path.join(PENDING_DIR, filename);
  const approvedPath = path.join(UPLOAD_DIR, filename);
  const approvedUrl = `/uploads/memorable-scenes/${filename}`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  await copyFile(pendingPath, approvedPath);
  await removeLocalFileIfExists(pendingPath);
  return approvedUrl;
}

export { isFirebaseStorageUrl };
