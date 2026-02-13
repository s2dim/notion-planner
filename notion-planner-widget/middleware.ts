import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const NOTION_HOST_HINTS = ["notion.so", "www.notion.so", "notion.site"];

function isFromNotion(req: NextRequest) {
  const origin = req.headers.get("origin") || "";
  const referer = req.headers.get("referer") || "";
  const combined = `${origin} ${referer}`;
  return NOTION_HOST_HINTS.some((h) => combined.includes(h));
}

function isFromSelf(req: NextRequest) {
  const referer = req.headers.get("referer") || "";
  const host = req.nextUrl.host || "";
  return referer.includes(host);
}

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isDev = process.env.NODE_ENV !== "production";

  // Allow static assets
  if (
    path.startsWith("/_next") ||
    path === "/favicon.ico" ||
    path.startsWith("/assets")
  ) {
    return NextResponse.next();
  }

  // API: 허용 기준 완화
  // - same-origin 요청(위젯 내부) 또는 Notion에서 온 요청 허용
  if (path.startsWith("/api/")) {
    if (isDev) return NextResponse.next();
    if (isFromSelf(req) || isFromNotion(req)) return NextResponse.next();
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Widget pages: Notion에서 임베드된 경우만 허용 (sec-fetch-dest는 브라우저/환경마다 상이할 수 있어 제거)
  if (path.startsWith("/widget/")) {
    if (isDev) return NextResponse.next();
    if (isFromNotion(req)) return NextResponse.next();
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Block other pages in production
  if (!isDev) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
