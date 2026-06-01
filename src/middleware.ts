import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/cases",
  "/shared",
  "/upload",
  "/files",
];
const PUBLIC_ONLY = ["/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get("refreshToken"); // 페이지 렌더링 이전에 쿠키에서 리프레시 토큰 소유 여부를 체크한다.

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)); // 현재 이동하려는 경로가 프리픽스로 지정된 경로일경우 true
  const isPublicOnly = PUBLIC_ONLY.some((p) => pathname.startsWith(p)); // 현재 이동하려는 경로가 Public only 로 지정된 경로일경우 true

  if (isProtected && !session) {
    return NextResponse.redirect(new URL("/login", request.url)); // 리프레시 토큰도 없으면 다시 로그인해야한다.
  }

  if (isPublicOnly && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
