import matter from "gray-matter";

import { toFrontmatterObject, type DraftForm } from "./draft";

/**
 * 폼 값 → 커밋할 MDX 파일 문자열.
 * gray-matter 로 직렬화한다 (읽을 때와 같은 도구여야 왕복이 어긋나지 않는다).
 * 서버 전용이다 — gray-matter 는 Buffer 를 쓰므로 클라이언트 컴포넌트에서 import 하지 마라.
 */
export function serializeDraft(form: DraftForm): string {
  // 닫는 `---` 다음의 빈 줄은 기존 content/ 파일들과 같은 모양을 유지하려는 것이다.
  return matter.stringify(`\n${form.body.trim()}\n`, toFrontmatterObject(form));
}
