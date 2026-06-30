import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { v4 as uuid } from "uuid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

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

function buildDownloadUrl(bucketName, storagePath, token) {
  const encodedPath = encodeURIComponent(storagePath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${token}`;
}

async function uploadBuffer(buffer, storagePath, contentType = "image/jpeg") {
  const bucket = getStorage().bucket(getBucketName());
  const token = uuid();
  const file = bucket.file(storagePath);

  await file.save(buffer, {
    metadata: {
      contentType,
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });

  return buildDownloadUrl(bucket.name, storagePath, token);
}

async function testStorage() {
  const bucketName = getBucketName();
  const testPath = `_system/cli-storage-test-${Date.now()}.txt`;
  const bucket = getStorage().bucket(bucketName);
  const file = bucket.file(testPath);

  await file.save(Buffer.from("readkoala-storage-test"), {
    metadata: { contentType: "text/plain" },
  });
  await file.delete({ ignoreNotFound: true });
}

function printBlazeSetupGuide() {
  console.log(`
Storage 연결에 실패했습니다. Firebase 콘솔에서 아래를 확인해 주세요.

1. 요금제 업그레이드 (Spark → Blaze)
   https://console.firebase.google.com/project/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/usage/details

2. Storage 시작하기
   https://console.firebase.google.com/project/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/storage
   - "시작하기" 클릭
   - 기본 버킷: ${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}

3. .env.local 의 NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET 이 콘솔 버킷 이름과 같은지 확인

4. 다시 실행: npm run firebase:test-storage
`);
}

async function main() {
  loadEnvLocal();
  initAdmin();

  console.log(`프로젝트: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);
  console.log(`버킷: ${getBucketName()}`);
  console.log("Storage 연결 테스트 중...");

  try {
    await testStorage();
    console.log("✓ Storage 업로드·삭제 테스트 성공");
    console.log("\n다음 단계: 보안 규칙 배포");
    console.log("  npm run firebase:deploy-storage-rules");
  } catch (error) {
    console.error("✗ Storage 테스트 실패");
    console.error(error instanceof Error ? error.message : error);
    printBlazeSetupGuide();
    process.exit(1);
  }
}

main();
