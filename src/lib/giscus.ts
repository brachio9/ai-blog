/**
 * Giscus 설정 — 댓글은 GitHub Discussions 에 저장된다 (ADR-004).
 * 변수 이름은 CLAUDE.md 의 환경변수 표가 정본이다.
 */
export interface GiscusConfig {
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
}

/**
 * 환경변수가 하나라도 비면 null — 값이 없으면 댓글만 조용히 꺼지고 사이트는 그대로 돈다.
 *
 * NEXT_PUBLIC_* 는 빌드 타임에 문자열로 인라인되므로 이름을 통째로 적어야 한다.
 * `process.env[name]` 같은 동적 접근은 번들러가 치환하지 못해 브라우저에서 undefined 가 된다.
 */
export function getGiscusConfig(): GiscusConfig | null {
  const repo = process.env.NEXT_PUBLIC_GISCUS_REPO?.trim();
  const repoId = process.env.NEXT_PUBLIC_GISCUS_REPO_ID?.trim();
  const category = process.env.NEXT_PUBLIC_GISCUS_CATEGORY?.trim();
  const categoryId = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID?.trim();

  // .env.example 은 이 값들을 빈 문자열로 실어 보낸다 — `??` 로는 걸러지지 않는다.
  if (!repo || !repoId || !category || !categoryId) {
    return null;
  }

  return { repo, repoId, category, categoryId };
}
