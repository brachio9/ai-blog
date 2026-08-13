import NextAuth, { type DefaultSession, type Profile } from "next-auth";
import GitHub from "next-auth/providers/github";
import { notFound } from "next/navigation";

import { isAllowedLogin } from "./auth-allowlist";

/**
 * 관리자 인증 (ADR-006) — GitHub OAuth + 허용 계정 화이트리스트.
 * 세션은 JWT 다. DB 어댑터를 붙이지 마라 (CLAUDE.md CRITICAL: Turso 에는 조회수만).
 */
declare module "next-auth" {
  interface Session {
    user: { login?: string } & DefaultSession["user"];
  }
}

/** 판정 로직은 auth-allowlist.ts 에 있다 (테스트가 NextAuth 없이 닿아야 해서). 정본 진입점은 여기다. */
export { isAllowedLogin };

/** GitHub 프로필의 login. Auth.js 의 공통 Profile 타입에는 없는 GitHub 고유 필드다. */
function githubLogin(profile: Profile | null | undefined): string | undefined {
  const login = (profile as { login?: unknown } | null | undefined)?.login;
  return typeof login === "string" ? login : undefined;
}

/**
 * OAuth 자격증명과 화이트리스트가 모두 준비됐는가.
 * 비어 있으면 로그인 화면이 버튼 대신 안내를 띄운다 — 빈 값으로 OAuth 를 시도하면 500 이 난다.
 */
export function isAuthConfigured(): boolean {
  return Boolean(
    process.env.AUTH_GITHUB_ID?.trim() &&
      process.env.AUTH_GITHUB_SECRET?.trim() &&
      process.env.ADMIN_GITHUB_LOGINS?.trim(),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // 없으면 `next start` 에서 /api/auth/* 전부가 500 UntrustedHost 를 낸다 (실측).
  // `next dev` 는 자동으로 신뢰하므로 개발에서는 드러나지 않는다.
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  ],
  pages: {
    signIn: "/admin/login",
    // 거부(AccessDenied)도 같은 화면으로 돌려보내 이유를 보여준다.
    error: "/admin/login",
  },
  callbacks: {
    /** 화이트리스트 밖의 계정은 세션 자체를 발급하지 않는다. */
    signIn({ profile }) {
      return isAllowedLogin(
        githubLogin(profile),
        process.env.ADMIN_GITHUB_LOGINS,
      );
    },
    /** profile 은 로그인 시점에만 온다 — 그때 login 을 토큰에 실어 둔다. */
    jwt({ token, profile }) {
      const login = githubLogin(profile);
      if (login) {
        token.login = login;
      }
      return token;
    },
    /** JWT 는 Record<string, unknown> 이라 꺼낸 값이 unknown 이다 — 좁혀서 싣는다. */
    session({ session, token }) {
      if (typeof token.login === "string") {
        session.user.login = token.login;
      }
      return session;
    },
  },
});

/**
 * 로그인 + 화이트리스트를 통과한 계정. 아니면 notFound().
 * 리다이렉트가 아니라 404 인 이유: 관리자 화면의 존재 자체를 노출하지 않는다.
 *
 * proxy 가 이미 막지만 여기서 다시 본다 (CLAUDE.md CRITICAL). 세션이 JWT 라 발급 이후에
 * 화이트리스트가 바뀌어도 기존 토큰은 유효하다 — 현재 목록과 매번 대조해야 계정을 뺐을 때 실제로 막힌다.
 */
export async function requireAdmin(): Promise<{ login: string }> {
  const login = await getAdminLogin();
  if (!login) {
    notFound();
  }

  return { login };
}

/**
 * 같은 판정을 하되 던지지 않는다. API 라우트용 — 라우트에서는 notFound() 의 의미가 페이지와 다르다.
 * 호출부는 null 일 때 **직접 404 를 응답한다.** 401/403 은 "여기 뭔가 있다" 를 알려 준다.
 */
export async function getAdminLogin(): Promise<string | null> {
  const login = (await auth())?.user?.login;
  return login && isAllowedLogin(login, process.env.ADMIN_GITHUB_LOGINS)
    ? login
    : null;
}
