import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const emptyDb = {
  users: [],
  books: [],
  reflections: [],
  chatRooms: [],
  chatMessages: [],
  chatMemberships: [],
  vocabulary: [],
  sharedSentences: [],
};

async function seed() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  let db = emptyDb;
  if (fs.existsSync(DB_FILE)) {
    db = { ...emptyDb, ...JSON.parse(fs.readFileSync(DB_FILE, "utf-8")) };
  }

  if (db.users.length > 0) {
    console.log("이미 데이터가 있어요. 시드를 건너뜁니다.");
    return;
  }

  const passwordHash = await bcrypt.hash("demo1234", 10);
  const now = new Date().toISOString();
  const userId = uuid();
  const bookId = uuid();

  db.users.push({
    id: userId,
    username: "demo",
    passwordHash,
    isAdmin: true,
    createdAt: now,
    stats: { booksRead: 1, totalChars: 320, chatParticipations: 0, level: 2 },
  });

  db.books.push({
    id: bookId,
    userId,
    isbn: "9788932917245",
    title: "어린 왕자",
    author: "생텍쥐페리",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9788932917245-L.jpg",
    publisher: "열린책들",
    readingProgress: 60,
    createdAt: now,
    updatedAt: now,
  });

  db.reflections.push({
    id: uuid(),
    userId,
    bookId,
    beforeReading: [
      { question: "제목을 보고 어떤 생각이 들었나요?", answer: "작은 왕자가 나올 것 같아요." },
    ],
    duringReading: [
      { question: "책을 읽고 떠오른 생각이나 느낌", answer: "여우와의 우정이 따뜻했어요." },
    ],
    association: "어린 왕자는 친구가 그리울 때 생각나는 책이다",
    favoriteQuote: "가장 중요한 것은 눈에 보이지 않아",
    reviewTitle: "따뜻한 우정 이야기",
    reviewReason: "친구가 추천해 줘서",
    reviewContent: "작은 왕자가 여러 별을 여행하는 이야기예요.",
    reviewImpressiveScene: "여우와 작별하는 장면",
    reviewThoughts: "소중한 것을 잊지 말아야겠다고 생각했어요.",
    createdAt: now,
    updatedAt: now,
  });

  db.sharedSentences.push({
    id: uuid(),
    userId,
    username: "demo",
    word: "우정",
    sentence: "우정은 서로를 이해하는 마음이에요.",
    createdAt: now,
  });

  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  console.log("시드 완료! demo / demo1234 로 로그인하세요.");
}

seed().catch(console.error);
