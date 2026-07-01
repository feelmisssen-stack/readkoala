import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { LEGAL_DOCUMENTS, type LegalDocumentId } from "@/lib/site-legal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isLegalDocumentId(value: string): value is LegalDocumentId {
  return value === "terms" || value === "privacy";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ doc: string }> }
) {
  const { doc } = await context.params;
  if (!isLegalDocumentId(doc)) {
    return NextResponse.json({ error: "문서를 찾을 수 없어요." }, { status: 404 });
  }

  const meta = LEGAL_DOCUMENTS[doc];
  const filePath = path.join(process.cwd(), meta.filename);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "문서 파일이 없어요." }, { status: 404 });
  }

  const content = fs.readFileSync(filePath, "utf8");
  return NextResponse.json(
    { title: meta.title, content },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
