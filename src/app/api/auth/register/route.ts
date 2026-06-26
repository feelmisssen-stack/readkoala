import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "회원가입은 관리자가 계정을 만들어 드려요. 선생님께 아이디를 요청해 주세요." },
    { status: 403 }
  );
}
