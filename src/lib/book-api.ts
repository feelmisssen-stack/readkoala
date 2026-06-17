import type { BookSearchResult } from "./types";

async function searchData4LibraryByIsbn(clean: string): Promise<BookSearchResult | null> {
  const apiKey = process.env.DATA4LIBRARY_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `http://data4library.kr/api/srchDtlList?authKey=${apiKey}&isbn13=${clean}&format=json`,
      { next: { revalidate: 3600 } }
    );
    const text = await res.text();
    if (text.includes("<")) {
      const titleMatch = text.match(/<bookname>([^<]*)<\/bookname>/);
      const authorMatch = text.match(/<authors>([^<]*)<\/authors>/);
      const publisherMatch = text.match(/<publisher>([^<]*)<\/publisher>/);
      const imageMatch = text.match(/<bookImageURL>([^<]*)<\/bookImageURL>/);
      if (titleMatch) {
        return {
          isbn: clean,
          title: titleMatch[1] || "제목 없음",
          author: authorMatch?.[1],
          publisher: publisherMatch?.[1],
          coverUrl: imageMatch?.[1],
        };
      }
    } else {
      const data = JSON.parse(text);
      const book = data.response?.docs?.[0]?.book;
      if (book) {
        return {
          isbn: clean,
          title: book.bookname || "제목 없음",
          author: book.authors,
          publisher: book.publisher,
          coverUrl: book.bookImageURL,
        };
      }
    }
  } catch {
    /* fallback */
  }
  return null;
}

async function searchData4LibraryByQuery(query: string): Promise<BookSearchResult[]> {
  const apiKey = process.env.DATA4LIBRARY_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch(
      `http://data4library.kr/api/srchBooks?authKey=${apiKey}&keyword=${encodeURIComponent(query)}&pageNo=1&pageSize=10`,
      { next: { revalidate: 3600 } }
    );
    const text = await res.text();
    const results: BookSearchResult[] = [];

    if (text.includes("<")) {
      const docs = text.match(/<doc>([\s\S]*?)<\/doc>/g) || [];
      for (const doc of docs) {
        const title = doc.match(/<bookname>([^<]*)<\/bookname>/)?.[1];
        const author = doc.match(/<authors>([^<]*)<\/authors>/)?.[1];
        const isbn = doc.match(/<isbn13>([^<]*)<\/isbn13>/)?.[1];
        const publisher = doc.match(/<publisher>([^<]*)<\/publisher>/)?.[1];
        const coverUrl = doc.match(/<bookImageURL>([^<]*)<\/bookImageURL>/)?.[1];
        if (title) {
          results.push({ isbn, title, author, publisher, coverUrl });
        }
      }
    } else {
      const data = JSON.parse(text);
      for (const doc of data.response?.docs || []) {
        const book = doc.book;
        if (book) {
          results.push({
            isbn: book.isbn13 || book.isbn,
            title: book.bookname || "제목 없음",
            author: book.authors,
            publisher: book.publisher,
            coverUrl: book.bookImageURL,
          });
        }
      }
    }
    return results;
  } catch {
    return [];
  }
}

export async function searchBooksByIsbn(isbn: string): Promise<BookSearchResult | null> {
  const clean = isbn.replace(/[-\s]/g, "");

  const d4l = await searchData4LibraryByIsbn(clean);
  if (d4l) return d4l;

  try {
    const olRes = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${clean}&format=json&jscmd=data`,
      { next: { revalidate: 3600 } }
    );
    const olData = await olRes.json();
    const key = `ISBN:${clean}`;
    if (olData[key]) {
      const book = olData[key];
      return {
        isbn: clean,
        title: book.title || "제목 없음",
        author: book.authors?.[0]?.name,
        coverUrl: book.cover?.medium || book.cover?.small,
        publisher: book.publishers?.[0]?.name,
      };
    }
  } catch {
    /* fallback below */
  }

  try {
    const gbRes = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${clean}&maxResults=1`,
      { next: { revalidate: 3600 } }
    );
    const gbData = await gbRes.json();
    const item = gbData.items?.[0];
    if (item) {
      const info = item.volumeInfo;
      return {
        isbn: clean,
        title: info.title || "제목 없음",
        author: info.authors?.[0],
        coverUrl: info.imageLinks?.thumbnail?.replace("http:", "https:"),
        publisher: info.publisher,
      };
    }
  } catch {
    /* no result */
  }

  return null;
}

export async function searchBooksByQuery(query: string): Promise<BookSearchResult[]> {
  const d4lResults = await searchData4LibraryByQuery(query);
  if (d4lResults.length > 0) return d4lResults;

  const results: BookSearchResult[] = [];

  try {
    const gbRes = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&langRestrict=ko`,
      { next: { revalidate: 3600 } }
    );
    const gbData = await gbRes.json();
    for (const item of gbData.items || []) {
      const info = item.volumeInfo;
      const isbn = info.industryIdentifiers?.find(
        (id: { type: string }) => id.type === "ISBN_13" || id.type === "ISBN_10"
      )?.identifier;
      results.push({
        isbn,
        title: info.title || "제목 없음",
        author: info.authors?.join(", "),
        coverUrl: info.imageLinks?.thumbnail?.replace("http:", "https:"),
        publisher: info.publisher,
      });
    }
  } catch {
    /* empty */
  }

  if (results.length === 0) {
    try {
      const olRes = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10`,
        { next: { revalidate: 3600 } }
      );
      const olData = await olRes.json();
      for (const doc of olData.docs || []) {
        results.push({
          isbn: doc.isbn?.[0],
          title: doc.title || "제목 없음",
          author: doc.author_name?.join(", "),
          coverUrl: doc.cover_i
            ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
            : undefined,
          publisher: doc.publisher?.[0],
        });
      }
    } catch {
      /* empty */
    }
  }

  return results;
}
