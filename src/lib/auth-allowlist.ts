/**
 * 화이트리스트 판정만 담는다 (ADR-006). NextAuth 를 import 하지 않는 이유:
 * next-auth 는 `next/server` 를 끌고 와 vitest(jsdom) 에서 로드되지 않는다.
 * 관리자 접근의 유일한 판정 로직이라 테스트가 반드시 닿아야 한다.
 *
 * 정본 API 는 `@/lib/auth` 다 — 거기서 다시 export 한다.
 */

/**
 * ADMIN_GITHUB_LOGINS 목록과 GitHub login 을 대조한다. GitHub login 은 대소문자를 구분하지 않는다.
 *
 * 목록이 비면 **전부 거부**다. 빈 값을 "전부 허용" 으로 읽으면 변수를 채우기 전까지 관리자 화면이
 * 통째로 열린다 — 열린 채 배포되는 쪽이 못 들어가는 쪽보다 훨씬 나쁘다.
 */
export function isAllowedLogin(
  login: string | null | undefined,
  rawList: string | undefined,
): boolean {
  const normalized = login?.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return (rawList ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .includes(normalized);
}
