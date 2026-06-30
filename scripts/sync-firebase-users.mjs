import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DB_FILE = path.join(ROOT, "data", "db.json");
const AUTH_EMAIL_DOMAIN = "readkoala.local";

function getAllowedAdminEmails() {
  const fromEnv = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (fromEnv.length > 0) return fromEnv;
  return ["feelmiss@gaehyeon.sen.es.kr"];
}

function isGoogleAdminEmail(email) {
  if (!email) return false;
  return getAllowedAdminEmails().includes(email.trim().toLowerCase());
}

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

function usernameToAuthEmail(username) {
  return `${username.trim().toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;
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

async function syncUsers() {
  loadEnvLocal();
  initAdmin();

  const auth = getAuth();
  const db = getFirestore();

  if (!fs.existsSync(DB_FILE)) {
    console.log("data/db.json 이 없어요.");
    return;
  }

  const localDb = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  const defaultPassword = process.argv[2] || "demo1234";

  for (const user of localDb.users ?? []) {
    if (user.isAdmin) {
      console.log(`건너뜀 (관리자 계정): ${user.username}`);
      continue;
    }

    if (isGoogleAdminEmail(user.email)) {
      console.log(`건너뜀 (Google 관리자 연결 계정): ${user.username}`);
      continue;
    }

    const email = usernameToAuthEmail(user.username);
    const existing = await db
      .collection("users")
      .where("username", "==", user.username)
      .limit(1)
      .get();

    if (!existing.empty) {
      console.log(`이미 있음: ${user.username}`);
      continue;
    }

    try {
      const record = await auth.createUser({
        email,
        password: defaultPassword,
        displayName: user.nickname || user.username,
      });

      await db.collection("users").doc(record.uid).set({
        username: user.username,
        ...(user.nickname ? { nickname: user.nickname } : {}),
        email,
        isAdmin: false,
        createdAt: user.createdAt || new Date().toISOString(),
        stats: user.stats || {
          booksRead: 0,
          totalChars: 0,
          chatParticipations: 0,
          level: 1,
        },
        legacyDbId: user.id,
      });

      console.log(`생성됨: ${user.username} (${email}) / 비밀번호: ${defaultPassword}`);
    } catch (error) {
      console.error(`실패: ${user.username}`, error.message || error);
    }
  }

  console.log("\n완료. 학생 계정은 아이디 + 위 비밀번호로 로그인할 수 있어요.");
}

syncUsers().catch((error) => {
  console.error(error);
  process.exit(1);
});
