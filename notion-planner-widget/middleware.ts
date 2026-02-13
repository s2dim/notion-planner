import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const NOTION_HOST_HINTS = ["notion.so", "www.notion.so", "notion.site"];

function isFromNotion(req: NextRequest) {
  const referer = req.headers.get("referer") || "";
  return NOTION_HOST_HINTS.some((h) => referer.includes(h));
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl.pathname;
  const isDev = process.env.NODE_ENV !== "production";

  // Allow static assets
  if (
    url.startsWith("/_next") ||
    url.startsWith("/favicon.ico") ||
    url.startsWith("/assets")
  ) {
    return NextResponse.next();
  }

  // API must have a session cookie issued by an allowed widget page
  if (url.startsWith("/api/")) {
    const session = req.cookies.get("widget_session")?.value;
    if (!session && !isDev) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.next();
  }

  // Restrict widget pages to be loaded inside Notion iframes only
  if (url.startsWith("/widget/")) {
    const dest = req.headers.get("sec-fetch-dest");
    const isIframe = dest === "iframe";
    const notionOk = isFromNotion(req);

    if (!(isIframe && notionOk) && !isDev) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Issue session cookie so subsequent /api calls are allowed
    const res = NextResponse.next();
    const secure = !isDev;
    const sameSite = secure ? "none" : ("lax" as const);
    res.cookies.set("widget_session", "1", {
      httpOnly: true,
      secure,
      sameSite,
      path: "/",
      maxAge: 60 * 60, // 1h
    });
    return res;
  }

  // Block direct visits to other pages in production
  if (!isDev) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
