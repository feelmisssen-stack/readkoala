import { NextResponse } from "next/server";
import {
  isFirebaseAdminConfigured,
  isFirebaseAuthEnabled,
  isFirebaseClientConfigured,
} from "@/lib/firebase/config";

export const runtime = "nodejs";

function envChecklist() {
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "";
  return {
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
  };
}

export async function GET() {
  const clientConfigured = isFirebaseClientConfigured();
  const adminConfigured = isFirebaseAdminConfigured();
  const authEnabled = isFirebaseAuthEnabled();
  const env = envChecklist();

  if (!clientConfigured) {
    return NextResponse.json({
      ok: false,
      clientConfigured,
      adminConfigured,
      authEnabled,
      env,
      message: "NEXT_PUBLIC_FIREBASE_* 환경 변수 6개를 Vercel에 넣어 주세요.",
    });
  }

  if (!adminConfigured) {
    return NextResponse.json({
      ok: false,
      clientConfigured,
      adminConfigured,
      authEnabled,
      env,
      message: "FIREBASE_ADMIN_* 환경 변수 3개를 Vercel에 넣어 주세요.",
    });
  }

  if (!env.adminPrivateKeyLooksValid) {
    return NextResponse.json({
      ok: false,
      clientConfigured,
      adminConfigured,
      authEnabled,
      env,
      message:
        "FIREBASE_ADMIN_PRIVATE_KEY 형식이 잘못됐어요. .env.local에서 통째로 복사해 Vercel에 붙여넣고 Redeploy 하세요.",
    });
  }

  try {
    const { getAdminFirestore } = await import("@/lib/firebase/admin");
    const { isFirebaseStorageEnabled, testFirebaseStorageConnection } = await import(
      "@/lib/firebase/scene-storage"
    );
    const storageConfigured = isFirebaseStorageEnabled();

    let storageTest: Awaited<ReturnType<typeof testFirebaseStorageConnection>> | null = null;
    if (storageConfigured) {
      storageTest = await testFirebaseStorageConnection();
    }

    const db = getAdminFirestore();
    const testedAt = new Date().toISOString();
    const ref = db.collection("_system").doc("connection-test");

    await ref.set({ testedAt, source: "readkoala-admin" });
    const snap = await ref.get();

    return NextResponse.json({
      ok: true,
      clientConfigured,
      adminConfigured,
      authEnabled,
      storageConfigured,
      env,
      firestoreTest: {
        ok: true,
        testedAt: snap.data()?.testedAt ?? testedAt,
      },
      storageTest,
      message: "Firebase 연결이 정상이에요.",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Firebase 연결 실패";
    return NextResponse.json(
      {
        ok: false,
        clientConfigured,
        adminConfigured,
        authEnabled,
        env,
        message:
          "Firebase Admin 키가 깨진 것 같아요. Vercel의 FIREBASE_ADMIN_PRIVATE_KEY를 .env.local과 똑같이 넣고 Redeploy 하세요.",
        detail: errorMessage,
      },
      { status: 500 }
    );
  }
}
