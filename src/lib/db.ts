import fs from "fs";
import path from "path";
import type { Database } from "./types";

/** @deprecated 런타임 데이터는 Firestore를 사용합니다. readDb는 낱말집 1회 이전(/api/dictionary/vocabulary/legacy)과 동기화 스크립트용입니다. */

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const DB_TMP_FILE = path.join(DATA_DIR, "db.json.tmp");

const emptyDb: Database = {
  users: [],
  books: [],
  reflections: [],
  chatRooms: [],
  chatMessages: [],
  chatMessageHearts: [],
  chatMemberships: [],
  vocabulary: [],
  sharedSentences: [],
  storyEmpathies: [],
  moderationReports: [],
  aiHelperSessions: [],
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function normalizeDb(parsed: Partial<Database>): Database {
  return {
    ...emptyDb,
    ...parsed,
    storyEmpathies: parsed.storyEmpathies ?? [],
    chatMessageHearts: parsed.chatMessageHearts ?? [],
    moderationReports: parsed.moderationReports ?? [],
    aiHelperSessions: parsed.aiHelperSessions ?? [],
  } as Database;
}

export function readDb(): Database {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(emptyDb, null, 2), "utf-8");
    return structuredClone(emptyDb);
  }

  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    if (!raw.trim()) {
      throw new Error("empty db file");
    }
    return normalizeDb(JSON.parse(raw) as Partial<Database>);
  } catch {
    const backup = `${DB_FILE}.broken-${Date.now()}`;
    try {
      fs.copyFileSync(DB_FILE, backup);
    } catch {
      // ignore backup failure
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(emptyDb, null, 2), "utf-8");
    return structuredClone(emptyDb);
  }
}

export function writeDb(db: Database) {
  ensureDataDir();
  const payload = JSON.stringify(db, null, 2);
  fs.writeFileSync(DB_TMP_FILE, payload, "utf-8");
  fs.renameSync(DB_TMP_FILE, DB_FILE);
}

export function updateDb(mutator: (db: Database) => void): Database {
  const db = readDb();
  mutator(db);
  writeDb(db);
  return db;
}
