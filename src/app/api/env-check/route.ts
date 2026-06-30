import { NextResponse } from "next/server";
import { getServerFirebaseApiKey, getFirebaseClientConfig } from "@/lib/firebase/config";

export const runtime = "nodejs";

export async function GET() {
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "";
  const config = getFirebaseClientConfig();

  let authApiProbe: { ok: boolean; message: string } | null = null;
  const apiKey = getServerFirebaseApiKey();
  if (apiKey) {
    try {
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "probe@readkoala.local",
            password: "wrong-password-probe",
            returnSecureToken: true,
          }),
        }
      );
      const data = (await response.json()) as { error?: { message?: string } };
      const code = data.error?.message ?? "UNKNOWN";
      authApiProbe = {
        ok:
          code.includes("INVALID_LOGIN_CREDENTIALS") ||
          code.includes("INVALID_PASSWORD") ||
          code.includes("EMAIL_NOT_FOUND"),
        message: code,
      };
    } catch (error) {
      authApiProbe = {
        ok: false,
        message: error instanceof Error ? error.message : "AUTH_PROBE_FAILED",
      };
    }
  }

  return NextResponse.json({
    ok: true,
    message: "환경 변수만 확인하는 페이지예요.",
    firebaseProjectId: config.projectId || null,
    authApiProbe,
    env: {
      NEXT_PUBLIC_FIREBASE_API_KEY: Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: Boolean(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: Boolean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: Boolean(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: Boolean(
        process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
      ),
      NEXT_PUBLIC_FIREBASE_APP_ID: Boolean(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
      FIREBASE_ADMIN_PROJECT_ID: Boolean(process.env.FIREBASE_ADMIN_PROJECT_ID),
      FIREBASE_ADMIN_CLIENT_EMAIL: Boolean(process.env.FIREBASE_ADMIN_CLIENT_EMAIL),
      FIREBASE_ADMIN_PRIVATE_KEY: Boolean(privateKey),
      adminPrivateKeyLooksValid:
        privateKey.includes("BEGIN PRIVATE KEY") && privateKey.includes("END PRIVATE KEY"),
    },
  });
}
