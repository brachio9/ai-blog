"use server";

import { getAdminLogin } from "@/lib/auth";
import { compileMdxChecked, type MdxCompileResult } from "@/lib/mdx";

/**
 * 본문 프리뷰 — 서버에서 컴파일한 트리를 그대로 돌려준다 (ADR-003: 컴파일 경로는 하나).
 *
 * Server Action 은 proxy matcher 를 타지 않는 **별도 진입점**이다. 여기서 확인하지 않으면
 * 누구나 서버에서 MDX 를 컴파일시킬 수 있다. 다만 requireAdmin() 처럼 던지지는 않는다 —
 * Server Action 에서 던진 예외는 클라이언트에 뭉개진 React 에러로만 도착한다.
 */
export async function previewMdx(source: string): Promise<MdxCompileResult> {
  if (!(await getAdminLogin())) {
    return { ok: false, message: "세션이 만료되었습니다. 다시 로그인하세요." };
  }

  return compileMdxChecked(source);
}
