import fs from "fs";
import path from "path";
import type { Database } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const emptyDb: Database = {
  users: [],
  books: [],
  reflections: [],
  chatRooms: [],
  chatMessages: [],
  chatMemberships: [],
  vocabulary: [],
  sharedSentences: [],
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readDb(): Database {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(emptyDb, null, 2), "utf-8");
    return structuredClone(emptyDb);
  }
  const raw = fs.readFileSync(DB_FILE, "utf-8");
  return { ...emptyDb, ...JSON.parse(raw) } as Database;
}

export function writeDb(db: Database) {
  ensureDataDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
}

export function updateDb(mutator: (db: Database) => void): Database {
  const db = readDb();
  mutator(db);
  writeDb(db);
  return db;
}
