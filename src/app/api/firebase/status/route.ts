import { NextResponse } from "next/server";
import { isFirebaseAdminConfigured, isFirebaseAuthEnabled, isFirebaseClientConfigured } from "@/lib/firebase/config";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { isFirebaseStorageEnabled, testFirebaseStorageConnection } from "@/lib/firebase/scene-storage";

export async function GET() {
  const clientConfigured = isFirebaseClientConfigured();
  const adminConfigured = isFirebaseAdminConfigured();
  const authEnabled = isFirebaseAuthEnabled();
  const storageConfigured = isFirebaseStorageEnabled();

  if (!clientConfigured) {
    return NextResponse.json({
      ok: false,
      clientConfigured,
      adminConfigured,
      authEnabled,
      storageConfigured,
      firestoreTest: null,
      storageTest: null,
      message: "NEXT_PUBLIC_FIREBASE_* 환경 변수를 확인해 주세요.",
    });
  }

  if (!adminConfigured) {
    return NextResponse.json({
      ok: true,
      clientConfigured,
      adminConfigured,
      authEnabled,
      storageConfigured,
      firestoreTest: null,
      storageTest: null,
      message:
        "클라이언트 설정은 완료됐습니다. 서버 Firestore·로그인은 FIREBASE_ADMIN_* 키를 넣은 뒤 다시 확인하세요.",
    });
  }

  let storageTest: Awaited<ReturnType<typeof testFirebaseStorageConnection>> | null = null;
  if (storageConfigured) {
    storageTest = await testFirebaseStorageConnection();
  }

  try {
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
      firestoreTest: {
        ok: true,
        testedAt: snap.data()?.testedAt ?? testedAt,
      },
      storageTest,
      message: buildStatusMessage(authEnabled, storageConfigured, storageTest),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        clientConfigured,
        adminConfigured,
        authEnabled,
        storageConfigured,
        firestoreTest: {
          ok: false,
          error: error instanceof Error ? error.message : "Firestore test failed",
        },
        storageTest,
        message: "Firestore 연결 테스트에 실패했습니다.",
      },
      { status: 500 }
    );
  }
}

function buildStatusMessage(
  authEnabled: boolean,
  storageConfigured: boolean,
  storageTest: Awaited<ReturnType<typeof testFirebaseStorageConnection>> | null
) {
  const parts = [
    authEnabled
      ? "Firebase 클라이언트·Admin·Firestore·로그인 연결"
      : "Firebase 클라이언트·Admin·Firestore 연결",
  ];

  if (!storageConfigured) {
    parts.push("Storage 버킷 미설정");
    return `${parts.join("·")}이 확인됐습니다.`;
  }

  if (storageTest?.ok) {
    parts.push("Storage 업로드");
    return `${parts.join("·")}이 확인됐습니다.`;
  }

  return `${parts.join("·")}은 확인됐지만 Storage 업로드에 실패했습니다. Blaze 요금제와 Storage 활성화를 확인해 주세요.`;
}
