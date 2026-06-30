import { getServerFirebaseApiKey } from "./config";
import { getAdminAuth } from "./admin";
import { usernameToAuthEmail } from "./auth-email";

interface FirebaseSignInResponse {
  idToken?: string;
  localId?: string;
  email?: string;
  error?: {
    message?: string;
  };
}

function mapFirebaseAuthError(message: string): string {
  if (
    message.includes("EMAIL_NOT_FOUND") ||
    message.includes("INVALID_PASSWORD") ||
    message.includes("INVALID_LOGIN_CREDENTIALS")
  ) {
    return "아이디 또는 비밀번호가 틀려요.";
  }
  if (message.includes("API_KEY_INVALID") || message.includes("API key not valid")) {
    return "Firebase API 키가 잘못됐어요. Vercel의 NEXT_PUBLIC_FIREBASE_API_KEY를 확인해 주세요.";
  }
  if (message.includes("USER_DISABLED")) {
    return "사용할 수 없는 계정이에요.";
  }
  if (message.includes("TOO_MANY_ATTEMPTS")) {
    return "잠시 후 다시 시도해 주세요.";
  }
  if (message.includes("OPERATION_NOT_ALLOWED")) {
    return "이메일/비밀번호 로그인이 꺼져 있어요. Firebase Authentication 설정을 확인해 주세요.";
  }
  return "로그인에 실패했어요.";
}

export async function signInWithUsernamePassword(username: string, password: string) {
  const apiKey = getServerFirebaseApiKey();
  if (!apiKey) {
    throw new Error("Firebase API 키가 없어요. NEXT_PUBLIC_FIREBASE_API_KEY를 확인해 주세요.");
  }

  const email = usernameToAuthEmail(username);

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    }
  );

  const data = (await response.json()) as FirebaseSignInResponse;
  if (!response.ok || !data.idToken || !data.localId) {
    const message = data.error?.message ?? "SIGN_IN_FAILED";
    throw new Error(mapFirebaseAuthError(message));
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(data.idToken);
    return {
      idToken: data.idToken,
      uid: decoded.uid,
      email: data.email ?? email,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "TOKEN_VERIFY_FAILED";
    throw new Error(`로그인 검증에 실패했어요. (${detail})`);
  }
}

export async function verifyCurrentPassword(username: string, password: string) {
  await signInWithUsernamePassword(username, password);
}
