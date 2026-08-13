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

export const SITE_DESCRIPTION =
  "HuggingFace 블로그와 arXiv 논문 등 영문 AI 자료를 한글로 추려 적습니다. 전문 번역이 아니라 요약이며, 원문 링크를 반드시 함께 답니다.";
