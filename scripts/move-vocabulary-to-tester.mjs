import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const TARGET_WORDS = ["알근달근하다", "시나브로", "서재", "사과"];

function normalizeDisplayWord(input) {
  return input.replaceAll("-", "").replaceAll("^", "");
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

async function findUserByUsername(db, username) {
  const snapshot = await db
    .collection("users")
    .where("username", "==", username.trim())
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  const data = doc.data();
  return {
    uid: doc.id,
    username: data.username,
    userId: data.legacyDbId || doc.id,
  };
}

function entryKey(word, definition) {
  return `${word.trim()}::${definition || ""}`;
}

async function listVocabularyForUser(db, userId) {
  const snapshot = await db.collection("vocabulary").where("userId", "==", userId).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function main() {
  loadEnvLocal();
  initAdmin();
  const db = getFirestore();

  const friend = await findUserByUsername(db, "friend");
  const tester = await findUserByUsername(db, "tester");

  if (!friend) throw new Error("friend 계정을 Firestore에서 찾을 수 없어요.");
  if (!tester) throw new Error("tester 계정을 Firestore에서 찾을 수 없어요.");

  console.log(`friend userId: ${friend.userId}`);
  console.log(`tester userId: ${tester.userId}`);

  const friendVocab = await listVocabularyForUser(db, friend.userId);
  const testerVocab = await listVocabularyForUser(db, tester.userId);
  const testerKeys = new Set(testerVocab.map((e) => entryKey(e.word, e.definition || "")));

  const targets = friendVocab.filter((entry) =>
    TARGET_WORDS.includes(normalizeDisplayWord(entry.word))
  );

  if (targets.length === 0) {
    console.log("friend 계정에서 옮길 낱말을 찾지 못했어요.");
    console.log("friend 낱말집:", friendVocab.map((e) => normalizeDisplayWord(e.word)).join(", ") || "(없음)");
    return;
  }

  const batch = db.batch();
  let moved = 0;
  let copied = 0;

  for (const entry of targets) {
    const key = entryKey(entry.word, entry.definition || "");
    const display = normalizeDisplayWord(entry.word);
    console.log(`처리: ${display} (${entry.id})`);

    if (testerKeys.has(key)) {
      batch.delete(db.collection("vocabulary").doc(entry.id));
      console.log(`  → tester에 이미 있음, friend 쪽만 삭제`);
      moved += 1;
      continue;
    }

    batch.update(db.collection("vocabulary").doc(entry.id), { userId: tester.userId });
    testerKeys.add(key);
    copied += 1;
    console.log(`  → tester로 이동 (userId 변경)`);
  }

  await batch.commit();
  console.log(`\n완료: ${copied}개 이동, ${Math.max(0, moved - copied)}개 중복 정리`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
