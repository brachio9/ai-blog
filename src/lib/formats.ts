/**
 * 발행 포맷 단일 진실 공급원 — docs/PRD.md 의 「발행 포맷」 표를 그대로 옮긴다.
 *
 * 포맷은 선택이고, 자기 페이지를 갖지 않는다. 목록의 `?format=` 필터로만 쓰인다 —
 * 그래서 이 파일에는 주소를 만드는 함수가 없다. 주소를 갖는 축은 axes.ts, 카테고리는 categories.ts.
 */
export type FormatSlug =
  | "explainer"
  | "digest"
  | "replication"
  | "kr-first"
  | "fieldnote";

export interface Format {
  /** `?format=` 값. 라우트가 아니다. */
  slug: FormatSlug;
  /** 필터 칩·글 머리의 표기 (예: "재현 검증") */
  name: string;
  /** 그 포맷의 글이 어떤 꼴로 쓰이는지 — 독자에게 하는 약속이자 나에게 하는 규칙 */
  description: string;
}

export const FORMATS: readonly Format[] = [
  {
    slug: "explainer",
    name: "기술 해설",
    description:
      "무엇인가 / 기존과 무엇이 다른가 / 우리 스택에 넣을 수 있는가 — 세 물음에 차례로 답합니다.",
  },
  {
    slug: "digest",
    name: "주간 다이제스트",
    description:
      "이번 주 논쟁 하나. 무슨 일이 있었고, 왜 시끄러웠고, 양측이 무엇을 주장했고, 나는 어느 쪽으로 봤는지까지 적습니다.",
  },
  {
    slug: "replication",
    name: "재현 검증",
    description:
      "커뮤니티의 성능 주장을 직접 돌려 봅니다. 하드웨어·설정·측정 방법을 반드시 함께 싣고, 재현하지 못한 경우도 그대로 적습니다.",
  },
  {
    slug: "kr-first",
    name: "국내 첫 해설",
    description:
      "영어권에서만 논의되던 이슈를 한국어 실무 맥락으로 옮겨 적습니다.",
  },
  {
    slug: "fieldnote",
    name: "실전 기록",
    description:
      "직접 만들어 본 기록. 옮길 원문이 없으므로 측정 조건과 실패한 시도가 원문 자리를 대신합니다.",
  },
];

export function getFormat(slug: string): Format | undefined {
  return FORMATS.find((format) => format.slug === slug);
}
