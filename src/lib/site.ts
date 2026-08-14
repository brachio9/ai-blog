/**
 * 절대 URL 이 필요한 곳(RSS·sitemap·OG)에서 쓴다.
 * 실제 도메인은 배포 단계에서 NEXT_PUBLIC_SITE_URL 로 덮어쓴다 — 변수 이름은 CLAUDE.md 의 표가 정본이다.
 * 값이 없어도 빌드는 통과해야 하므로 로컬 기본값을 둔다.
 * 뒤쪽 슬래시는 여기서 한 번만 떼어 `${SITE_URL}/papers` 가 `//papers` 가 되는 일을 막는다.
 */
export const SITE_URL = (
  // .env.example 은 이 변수를 빈 값으로 실어 보낸다 — `??` 로는 빈 문자열이 걸러지지 않는다.
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000"
).replace(/\/+$/, "");

/** 사이트명의 유일한 소재지 — 헤더·푸터·metadata·RSS·OG 가 전부 여기를 읽는다. */
export const SITE_NAME = "초록";

/**
 * 마스트헤드(.masthead-line, 52ch)·RSS·OG 가 이 한 문자열을 그대로 싣는다.
 * 여섯 갈래를 여기서 **나열하지 않는다** — 여섯 줄이 마스트헤드에 들어오면 히어로가 되어
 * "첫 화면에서 글이 보여야 한다"(docs/PRD.md)를 깬다. 나열은 /topics 와 /about 의 몫이다.
 *
 * 뒷문장이 두 갈래인 것이 의도다. 옮긴 글에는 원문 링크(CLAUDE.md CRITICAL),
 * 옮길 원문이 없는 글(재현 검증·실전 기록)에는 측정 조건이 출처 노릇을 한다.
 */
export const SITE_DESCRIPTION =
  "영문 AI 원문을 여섯 갈래로 좁혀 한글로 추려 적습니다. 옮긴 글에는 원문 링크를, 직접 잰 글에는 측정 조건을 함께 답니다.";
