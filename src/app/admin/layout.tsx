import Link from "next/link";

import { getAdminLogin, signOut } from "@/lib/auth";

/**
 * 관리자 전용 껍데기. `(public)` 밖이라 공개 헤더·푸터를 상속하지 않는다 — 그대로 둔다.
 * 로그인 화면도 이 레이아웃을 쓰므로 여기서 접근을 막지 않는다 (막으면 아무도 로그인할 수 없다).
 * 접근 판정은 각 페이지의 requireAdmin() 몫이다.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const login = await getAdminLogin();

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3 md:h-14 md:px-8 md:py-0">
          <Link
            href="/admin"
            className="mr-auto text-base font-semibold tracking-tight text-heading transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
          >
            관리자
          </Link>

          <Link
            href="/"
            className="text-sm text-muted transition-colors hover:text-heading focus-visible:outline-2 focus-visible:outline-accent"
          >
            사이트로 돌아가기
          </Link>

          {login && (
            <>
              <span className="text-sm text-muted">{login}</span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/admin/login" });
                }}
              >
                <button
                  type="submit"
                  className="rounded border border-border px-3 py-1.5 text-sm text-body transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent"
                >
                  로그아웃
                </button>
              </form>
            </>
          )}
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
