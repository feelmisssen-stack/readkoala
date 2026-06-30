import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { v4 as uuid } from "uuid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const UPLOAD_DIR = path.join(ROOT, "public", "uploads", "memorable-scenes");
const PENDING_DIR = path.join(UPLOAD_DIR, "pending");

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function initAdmin() {
  if (getApps().length > 0) return;

  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("FIREBASE_ADMIN_* 환경 변수를 .env.local에 설정해 주세요.");
  }

  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

function getBucketName() {
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!bucketName) {
    throw new Error("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET 환경 변수를 설정해 주세요.");
  }
  return bucketName;
}

function buildSceneStoragePath(folder, userId, bookId) {
  return `memorable-scenes/${folder}/${userId}/${bookId}.jpg`;
}

function buildDownloadUrl(bucketName, storagePath, token) {
  const encodedPath = encodeURIComponent(storagePath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${token}`;
}

function isLocalSceneUrl(url) {
  return typeof url === "string" && url.startsWith("/uploads/memorable-scenes/");
}

function parseLocalFilename(url) {
  const name = path.basename(url);
  const match = name.match(/^(.+)-(.+)\.jpg$/);
  if (!match) return null;
  return { userId: match[1], bookId: match[2] };
}

async function uploadBuffer(buffer, storagePath) {
  const bucket = getStorage().bucket(getBucketName());
  const token = uuid();
  const file = bucket.file(storagePath);

  await file.save(buffer, {
    metadata: {
      contentType: "image/jpeg",
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });

  return buildDownloadUrl(bucket.name, storagePath, token);
}

async function migrateReflection(ref, updates) {
  const db = getFirestore();
  let changed = false;
  const next = { ...ref };

  for (const [field, url] of Object.entries(updates)) {
    if (!isLocalSceneUrl(url)) continue;

    const parsed = parseLocalFilename(url);
    if (!parsed) {
      console.warn(`  건너뜀 (파일명 파싱 실패): ${url}`);
      continue;
    }

    const folder = field === "memorableScenePendingImage" ? "pending" : "approved";
    const relativePath = url.replace(/^\//, "");
    const localPath = path.join(ROOT, "public", relativePath);

    if (!fs.existsSync(localPath)) {
      console.warn(`  건너뜀 (로컬 파일 없음): ${localPath}`);
      continue;
    }

    const buffer = fs.readFileSync(localPath);
    const storagePath = buildSceneStoragePath(folder, parsed.userId, parsed.bookId);
    const firebaseUrl = await uploadBuffer(buffer, storagePath);

    next[field] = firebaseUrl;
    changed = true;
    console.log(`  ${field}: ${url} → Firebase`);
  }

  if (changed) {
    const { id, ...payload } = next;
    await db.collection("reflections").doc(id).set(payload, { merge: true });
  }

  return changed;
}

async function main() {
  loadEnvLocal();
  initAdmin();

  console.log("로컬 기억에 남는 장면 → Firebase Storage 마이그레이션\n");

  const snapshot = await getFirestore().collection("reflections").get();
  let migrated = 0;

  for (const doc of snapshot.docs) {
    const reflection = { id: doc.id, ...doc.data() };
    const updates = {
      memorableSceneImage: reflection.memorableSceneImage,
      memorableScenePendingImage: reflection.memorableScenePendingImage,
    };

    const hasLocal =
      isLocalSceneUrl(updates.memorableSceneImage) ||
      isLocalSceneUrl(updates.memorableScenePendingImage);

    if (!hasLocal) continue;

    console.log(`감상문 ${reflection.id} (user=${reflection.userId}, book=${reflection.bookId})`);
    const changed = await migrateReflection(reflection, updates);
    if (changed) migrated += 1;
  }

  if (migrated === 0) {
    console.log("마이그레이션할 로컬 이미지가 없습니다.");
  } else {
    console.log(`\n완료: ${migrated}개 감상문의 이미지를 Firebase Storage로 옮겼습니다.`);
    console.log("로컬 public/uploads/memorable-scenes/ 폴더는 확인 후 직접 삭제해도 됩니다.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
