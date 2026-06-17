import { NextResponse } from "next/server";
import { searchBooksByIsbn, searchBooksByQuery } from "@/lib/book-api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const isbn = searchParams.get("isbn");

  if (isbn) {
    const result = await searchBooksByIsbn(isbn);
    return NextResponse.json({ results: result ? [result] : [] });
  }

  if (q) {
    const results = await searchBooksByQuery(q);
    return NextResponse.json({ results });
  }

  return NextResponse.json({ results: [] });
}
