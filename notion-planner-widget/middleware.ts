import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const COOKIE_NAME = "widget_session";
const EMBED_KEY = process.env.WIDGET_EMBED_KEY || "";

function allowStatic(path: string) {
  return (
    path.startsWith("/_next") ||
    path === "/favicon.ico" ||
    path.startsWith("/assets")
  );
}

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isDev = process.env.NODE_ENV !== "production";

  if (allowStatic(path)) return NextResponse.next();

  // API는 위젯 세션 쿠키가 있어야 허용
  if (path.startsWith("/api/")) {
    if (isDev) return NextResponse.next();
    const hasSession = !!req.cookies.get(COOKIE_NAME)?.value;
    if (!hasSession) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.next();
  }

  // 위젯 페이지: ?key=EMBED_KEY
  if (path.startsWith("/widget/")) {
    if (isDev) return NextResponse.next();
    const key = req.nextUrl.searchParams.get("key");
    if (!EMBED_KEY || key !== EMBED_KEY) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const res = NextResponse.next();
    res.cookies.set(COOKIE_NAME, "1", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 60 * 60,
    });
    return res;
  }

  if (!isDev) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
