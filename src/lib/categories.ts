/**
 * 카테고리 단일 진실 공급원 — docs/PRD.md 의 카테고리 표를 그대로 옮긴다.
 * 카테고리 추가는 이 파일 수정만으로 끝나야 한다.
 * 내비게이션·푸터·홈은 CATEGORIES 를 순회해서 그리고, 이름·slug 를 하드코딩하지 않는다.
 */
export type CategorySlug = "hf-blog" | "papers" | "notes";

export interface Category {
  slug: CategorySlug;
  /** 화면 표기 (한글) */
  name: string;
  /** 카테고리 페이지 상단 설명 */
  description: string;
}

export const CATEGORIES: readonly Category[] = [
  {
    slug: "hf-blog",
    name: "허깅페이스 소식",
    description:
      "HuggingFace 블로그 글을 한글로 요약하고 원문 링크를 함께 답니다.",
  },
  {
    slug: "papers",
    name: "최신 논문",
    description: "arXiv 논문 리뷰. 수식과 도표로 핵심을 정리합니다.",
  },
  {
    slug: "notes",
    name: "수집 자료",
    description: "따로 모아둔 개인 스크랩과 메모.",
  },
];

/** 카테고리 목록 URL. `content/{slug}/` 와 같은 이름을 경로로 쓴다. */
export function categoryHref(category: Category): string {
  return `/${category.slug}`;
}

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((category) => category.slug === slug);
}
