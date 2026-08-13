import type { Metadata } from "next";

import { isAuthConfigured, signIn } from "@/lib/auth";

export const metadata: Metadata = {
  title: "관리자 로그인",
  robots: { index: false, follow: false },
};

/** Auth.js 가 `?error=` 로 되돌려 보내는 코드. 왜 막혔는지는 보여주되 설정 내용은 흘리지 않는다. */
const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied:
    "허용된 관리자 계정이 아닙니다. ADMIN_GITHUB_LOGINS 에 등록된 GitHub 계정으로 로그인하세요.",
  Configuration:
    "인증 설정에 문제가 있습니다. AUTH_* 환경변수를 확인하세요.",
  Verification: "로그인 링크가 만료되었습니다. 다시 시도하세요.",
};

function errorMessage(error: string | string[] | undefined): string | null {
  const code = Array.isArray(error) ? error[0] : error;
  if (!code) {
    return null;
  }

  return ERROR_MESSAGES[code] ?? "로그인에 실패했습니다. 다시 시도하세요.";
}

/**
 * 로그인하지 않은 사람도 볼 수 있어야 한다 — 여기서 requireAdmin() 을 부르면 아무도 로그인할 수 없다.
 * proxy 도 이 경로만은 통과시킨다.
 */
export default async function AdminLoginPage(
  props: PageProps<"/admin/login">,
) {
  const message = errorMessage((await props.searchParams).error);
  const configured = isAuthConfigured();

  return (
    <div className="mx-auto max-w-md px-5 py-16 md:px-8 md:py-24">
      <h1 className="text-2xl font-semibold tracking-tight text-heading">
        관리자 로그인
      </h1>
      <p className="mt-2 text-sm text-muted">
        허용된 GitHub 계정만 들어올 수 있습니다.
      </p>

      {message && (
        <p
          role="alert"
          className="mt-6 border-l-[3px] border-l-danger bg-surface py-3 pl-4 text-sm text-body"
        >
          {message}
        </p>
      )}

      <div className="mt-8">
        {configured ? (
          <form
            action={async () => {
              "use server";
              await signIn("github", { redirectTo: "/admin" });
            }}
          >
            <button
              type="submit"
              className="rounded bg-heading px-4 py-2 text-sm font-medium text-bg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-accent"
            >
              GitHub 계정으로 로그인
            </button>
          </form>
        ) : (
          // 빈 값으로 OAuth 를 시도하면 500 이 난다 — 버튼 대신 무엇이 없는지 알려 준다.
          <div className="rounded-md border border-border bg-surface p-5">
            <p className="text-sm text-body">인증이 설정되지 않았습니다.</p>
            <p className="mt-2 text-sm text-muted">
              <code className="font-mono text-xs">AUTH_GITHUB_ID</code> ·{" "}
              <code className="font-mono text-xs">AUTH_GITHUB_SECRET</code> ·{" "}
              <code className="font-mono text-xs">ADMIN_GITHUB_LOGINS</code> 를{" "}
              <code className="font-mono text-xs">.env.local</code> 에 채운 뒤
              다시 시도하세요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
