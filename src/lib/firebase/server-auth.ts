import { getFirebaseClientConfig } from "./config";
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
  if (message.includes("EMAIL_NOT_FOUND") || message.includes("INVALID_PASSWORD")) {
    return "아이디 또는 비밀번호가 틀려요.";
  }
  if (message.includes("USER_DISABLED")) {
    return "사용할 수 없는 계정이에요.";
  }
  if (message.includes("TOO_MANY_ATTEMPTS")) {
    return "잠시 후 다시 시도해 주세요.";
  }
  return "로그인에 실패했어요.";
}

export async function signInWithUsernamePassword(username: string, password: string) {
  const { apiKey } = getFirebaseClientConfig();
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

  const decoded = await getAdminAuth().verifyIdToken(data.idToken);
  return {
    idToken: data.idToken,
    uid: decoded.uid,
    email: data.email ?? email,
  };
}

export async function verifyCurrentPassword(username: string, password: string) {
  await signInWithUsernamePassword(username, password);
}
