import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "관리자",
  // 관리자 화면은 검색엔진에 실리면 안 된다.
  robots: { index: false, follow: false },
};

/** 자리표시. 실제 대시보드(글 목록·조회수)는 step 2 에서 만든다. */
export default async function AdminHomePage() {
  const { login } = await requireAdmin();

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-heading md:text-4xl">
        관리자
      </h1>
      <p className="mt-2 text-[1.0625rem] leading-[1.75] text-muted">
        <span className="text-heading">{login}</span> 계정으로 로그인했습니다.
      </p>
      <div className="mt-8 rounded-md border border-border bg-surface p-5">
        <p className="text-sm text-muted">
          글 목록과 에디터는 다음 단계에서 붙습니다.
        </p>
      </div>
    </div>
  );
}
