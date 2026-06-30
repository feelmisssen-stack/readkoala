import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "";
  return NextResponse.json({
    ok: true,
    message: "환경 변수만 확인하는 페이지예요.",
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
