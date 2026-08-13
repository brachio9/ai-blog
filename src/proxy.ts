import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";

/**
 * Next 16 의 구 middleware (이름만 바뀌었다 — `middleware.ts` 를 만들지 마라).
 *
 * 관리자 영역의 **1차** 방어선이다. 유일한 방어선이 아니다: 세션 유무만 보고,
 * 화이트리스트 대조는 각 페이지·라우트의 requireAdmin()/getAdminLogin() 이 다시 한다
 * (CLAUDE.md CRITICAL — proxy 만으로 막지 마라).
 */
const LOGIN_PATH = "/admin/login";

export default async function proxy(request: NextRequest): Promise<Response> {
  const { pathname } = request.nextUrl;

  // 로그인 화면 자신은 열려 있어야 한다 — 여기서 막으면 리다이렉트 루프가 된다.
  if (pathname === LOGIN_PATH) {
    return NextResponse.next();
  }

  if (await auth()) {
    return NextResponse.next();
  }

  // API 는 리다이렉트하지 않는다. fetch 가 307 을 따라가 로그인 HTML 을 받아 오면
  // 클라이언트는 "실패" 인지 "로그인 필요" 인지 구분할 수 없다. 404 로 끊는다.
  if (pathname.startsWith("/api/")) {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
}

export const config = {
  // `/api/publish` · `/api/upload` 는 다음 step 들이 만든다. 라우트가 없어도 matcher 는 무해하고,
  // 여기서 빠뜨리면 인증 없는 발행 API 가 열린다. `/api/auth/*` 는 넣지 마라 — 로그인이 막힌다.
  matcher: [
    "/admin",
    "/admin/:path*",
    "/api/publish",
    "/api/publish/:path*",
    "/api/upload",
    "/api/upload/:path*",
  ],
};
