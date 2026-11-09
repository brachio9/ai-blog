"use server";

import { getAdminLogin } from "@/lib/auth";

import type { DraftForm } from "./draft";
import { serializeDraft } from "./serialize";

/*
 * Server Action 은 proxy matcher 를 타지 않는 **별도 진입점**이다 — 그래서 각 액션이 세션을
 * 다시 확인한다. requireAdmin() 처럼 던지지는 않는다: Server Action 에서 던진 예외는
 * 클라이언트에 뭉개진 React 에러로만 도착한다.
 *
 * 본문 프리뷰 액션은 없앴다. MDX 를 런타임에 실행해야 하는데(`new Function`)
 * Cloudflare Workers 가 문자열 코드 생성을 막는다.
 */

/**
 * 폼 값 → 커밋할 MDX 문자열. 직렬화가 서버에 있는 이유는 gray-matter 가 Buffer 를 쓰기 때문이다
 * (클라이언트 번들에서는 뜨지 않는다). 글을 읽을 때와 같은 도구여야 왕복이 어긋나지 않는다.
 *
 * 여기서 커밋하지는 않는다 — 저장은 에디터가 이 문자열을 /api/publish 로 보내서 한다.
 * 경로 화이트리스트와 frontmatter 재검증은 그 라우트가 다시 하며, 그쪽이 보안 경계다.
 */
export async function serializeDraftFile(
  form: DraftForm,
): Promise<{ ok: true; content: string } | { ok: false; message: string }> {
  if (!(await getAdminLogin())) {
    return { ok: false, message: "세션이 만료되었습니다. 다시 로그인하세요." };
  }

  return { ok: true, content: serializeDraft(form) };
}
