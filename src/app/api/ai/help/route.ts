import { NextResponse } from "next/server";
import { getWritingHelp } from "@/lib/ai-helper";

export async function POST(request: Request) {
  const { context, message } = await request.json();
  const reply = await getWritingHelp(context || "review", message);
  return NextResponse.json({ reply });
}
