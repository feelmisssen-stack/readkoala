import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { cert, getApps, initializeApp } from "firebase-admin/app";
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

async function setDocIfMissing(collection, docId, payload) {
  const ref = getFirestore().collection(collection).doc(docId);
  const existing = await ref.get();
  if (existing.exists) {
    console.log(`이미 있음: ${collection}/${docId}`);
    return false;
  }
  await ref.set(payload);
  console.log(`생성됨: ${collection}/${docId}`);
  return true;
}

async function main() {
  loadEnvLocal();
  initAdmin();

  if (!fs.existsSync(DB_FILE)) {
    console.log("data/db.json 이 없어요.");
    return;
  }

  const localDb = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  const counts = {
    chatRooms: 0,
    chatMessages: 0,
    chatMessageHearts: 0,
    chatMemberships: 0,
  };

  for (const room of localDb.chatRooms ?? []) {
    const { id, ...payload } = room;
    if (await setDocIfMissing("chatRooms", id, payload)) counts.chatRooms += 1;
  }

  for (const message of localDb.chatMessages ?? []) {
    const { id, ...payload } = message;
    if (await setDocIfMissing("chatMessages", id, payload)) counts.chatMessages += 1;
  }

  for (const heart of localDb.chatMessageHearts ?? []) {
    const { id, ...payload } = heart;
    if (await setDocIfMissing("chatMessageHearts", id, payload)) counts.chatMessageHearts += 1;
  }

  for (const membership of localDb.chatMemberships ?? []) {
    const { id, ...payload } = membership;
    if (await setDocIfMissing("chatMemberships", id, payload)) counts.chatMemberships += 1;
  }

  console.log(
    `\n완료. 방 ${counts.chatRooms}개, 메시지 ${counts.chatMessages}개, 하트 ${counts.chatMessageHearts}개, 참여 ${counts.chatMemberships}개를 Firestore에 옮겼어요.`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
