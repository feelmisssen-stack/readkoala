# 도란서재

작은 호기심이 자라나, 우리의 깊은 감상이 되는 곳 — 초등학생을 위한 독서 감상 공유 웹앱입니다.

## 기능

- 아이디/비밀번호 회원가입 및 로그인
- 도서 검색 (도서관 정보나루, Google Books, Open Library)
- ISBN 입력 및 바코드 스캔
- 독서 온도계 (진행률)
- 단계별 감상문 작성 (읽기 전/중, 연상 문장, 책속 한마디, 감상문)
- AI 독서 도우미 (Gemini 키 없으면 정적 힌트)
- 메인 화면 랜덤 노출 + 오늘 하루 보지 않기
- 독서 기록 모아 보기
- 책 이야기방 (관리자 승인)
- 국어사전, 낱말집, 초성 퀴즈, 문장 공유 보드

## 시작하기

```bash
npm install
cp .env.example .env.local
npm run seed   # 데모 데이터 (선택)
npm run dev
```

브라우저에서 http://localhost:3000 을 엽니다.

### 데모 계정

시드 실행 후:

- 아이디: `demo`
- 비밀번호: `demo1234`

첫 가입 사용자는 자동으로 관리자가 됩니다 (채팅방 승인용).

## 환경 변수

| 변수 | 설명 |
|------|------|
| `SESSION_SECRET` | 세션 암호화 키 (32자 이상 권장) |
| `ADMIN_EMAILS` | Google 관리자 로그인 허용 이메일 (쉼표 구분) |
| `GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID (관리자용) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 시크릿 (관리자용) |
| `NEXT_PUBLIC_APP_URL` | 앱 URL (기본 `http://localhost:3000`) |
| `ALADIN_TTB_KEY` | [알라딘 Open API](https://blog.aladin.co.kr/openapi/popup/6695306) TTBKey (도서 검색, 선택) |
| `DATA4LIBRARY_API_KEY` | [도서관 정보나루](https://www.data4library.kr) API 키 (선택) |
| `STDICT_API_KEY` | [표준국어대사전](https://stdict.korean.go.kr/openapi/openApiRegister.do) API 키 (국어사전) |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) API 키 — 감상문 도우미·그림 검사 (선택) |
| `GEMINI_MODEL` | Gemini 모델 ID (기본 `gemini-3.1-flash-lite`) |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase 웹 앱 설정 (콘솔 > 프로젝트 설정) |
| `FIREBASE_ADMIN_*` | Firebase Admin 서비스 계정 (서버 API용) |

API 키 없이도 Google Books / Open Library / 내장 사전으로 동작합니다.

### Firebase 데이터 저장

`NEXT_PUBLIC_FIREBASE_*`와 `FIREBASE_ADMIN_*`가 모두 설정되어야 앱이 동작합니다.

| 데이터 | 저장소 |
|--------|-----------|
| 회원, 책, 감상문, 채팅, 낱말집, 초성 퀴즈 진행, 공유 문장, 검토·AI 로그, 공감 | Firestore |
| 기억에 남는 장면 그림 파일 | Firebase Storage |

`data/db.json`은 예전 낱말집 1회 이전·동기화 스크립트용으로만 남아 있습니다.

보안 규칙 배포 (최초 1회, 테스트 모드 종료):

```bash
npx firebase login
npm run firebase:deploy-rules
```

PowerShell에서 `npm` 실행 오류 시 `npm.cmd`를 사용하세요.

## 기술 스택

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- iron-session + bcrypt
- Firebase (Auth, Firestore, Storage) — 필수

## 주요 경로

| 경로 | 설명 |
|------|------|
| `/` | 메인 (친구 감상 캐러셀, 나의 기록) |
| `/books` | 내 책장 |
| `/books/new` | 책 검색/등록 |
| `/books/[id]/write/[section]` | 감상문 작성 |
| `/chat` | 책 이야기방 |
| `/dictionary` | 국어사전 & 학습 |
