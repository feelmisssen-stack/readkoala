import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DB_FILE = path.join(ROOT, "data", "db.json");

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

function getAllowedAdminEmails() {
  const fromEnv = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (fromEnv.length > 0) return fromEnv;
  return ["feelmiss@gaehyeon.sen.es.kr"];
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

async function removeGoogleOnlyUsers() {
  loadEnvLocal();
  initAdmin();

  const auth = getAuth();
  const firestore = getFirestore();
  const allowedAdminEmails = getAllowedAdminEmails();

  if (!fs.existsSync(DB_FILE)) {
    console.log("data/db.json 이 없어요.");
    return;
  }

  const localDb = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  const googleOnlyUsers = (localDb.users ?? []).filter((user) =>
    allowedAdminEmails.includes(String(user.email || "").trim().toLowerCase())
  );

  for (const user of googleOnlyUsers) {
    const snapshot = await firestore
      .collection("users")
      .where("username", "==", user.username)
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log(`Firebase에 없음: ${user.username}`);
      continue;
    }

    const doc = snapshot.docs[0];
    const uid = doc.id;

    await auth.deleteUser(uid);
    await doc.ref.delete();
    console.log(`삭제됨: ${user.username} (Firebase 비밀번호 로그인 제거)`);
  }

  console.log("\n완료. Google 관리자 연결 계정은 /admin 에서 Google 로그인만 사용하세요.");
}

removeGoogleOnlyUsers().catch((error) => {
  console.error(error);
  process.exit(1);
});
