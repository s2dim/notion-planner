import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import crypto from "crypto";

const NOTION_HOST_HINTS = ["notion.so", "www.notion.so", "notion.site"];
const COOKIE_NAME = "widget_session";
const SESSION_TTL_SEC = 60 * 60; // 1h

function base64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function hmacSign(data: string, secret: string) {
  return base64url(crypto.createHmac("sha256", secret).update(data).digest());
}

function timingSafeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function isFromNotion(req: NextRequest) {
  const origin = req.headers.get("origin") || "";
  const referer = req.headers.get("referer") || "";
  const combined = `${origin} ${referer}`;
  return NOTION_HOST_HINTS.some((h) => combined.includes(h));
}

// Optional: make token slightly bound to the client (weak, but helps a bit)
function uaHash(req: NextRequest) {
  const ua = req.headers.get("user-agent") || "";
  // 짧게 해시
  return crypto.createHash("sha256").update(ua).digest("hex").slice(0, 16);
}

/**
 * Token format:
 *   payloadB64u + "." + sigB64u
 * payload JSON:
 *   { iat: number, exp: number, ua: string }
 */
function issueSessionToken(req: NextRequest, secret: string) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now,
    exp: now + SESSION_TTL_SEC,
    ua: uaHash(req),
  };

  const payloadStr = JSON.stringify(payload);
  const payloadB64 = base64url(payloadStr);
  const sig = hmacSign(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

function verifySessionToken(req: NextRequest, token: string, secret: string) {
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [payloadB64, sig] = parts;

  // signature check
  const expected = hmacSign(payloadB64, secret);
  if (!timingSafeEqual(sig, expected)) return false;

  // payload check
  let payload: any;
  try {
    const json = Buffer.from(
      payloadB64.replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    ).toString("utf8");
    payload = JSON.parse(json);
  } catch {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  if (!payload?.exp || typeof payload.exp !== "number") return false;
  if (now >= payload.exp) return false;

  // weak binding to UA
  if (payload.ua !== uaHash(req)) return false;

  return true;
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

  const secret = process.env.WIDGET_SESSION_SECRET || "";
  // 프로덕션에서는 secret 필수
  const secretReady = secret.length >= 16;

  // API 보호: 쿠키 + Notion hint 둘 다 체크(실용적 차단 강화)
  if (path.startsWith("/api/")) {
    if (isDev) return NextResponse.next();

    const token = req.cookies.get(COOKIE_NAME)?.value;
    const notionOk = isFromNotion(req);

    if (!secretReady) {
      return NextResponse.json(
        { error: "Server misconfigured: missing WIDGET_SESSION_SECRET" },
        { status: 500 },
      );
    }

    if (!token || !verifySessionToken(req, token, secret) || !notionOk) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.next();
  }

  // Widget pages: iframe이면 통과 (notionOk는 제거/완화)
  if (path.startsWith("/widget/")) {
    if (isDev) return NextResponse.next();

    const dest = req.headers.get("sec-fetch-dest");
    const mode = req.headers.get("sec-fetch-mode");
    const isIframe = dest === "iframe";

    if (!secretReady) {
      return NextResponse.json(
        { error: "Server misconfigured: missing WIDGET_SESSION_SECRET" },
        { status: 500 },
      );
    }

    // iframe이 아니면 차단 (직접 접근 방지)
    if (!isIframe || mode === "navigate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 쿠키 발급
    const res = NextResponse.next();
    const token = issueSessionToken(req, secret);

    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: SESSION_TTL_SEC,
    });

    return res;
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
