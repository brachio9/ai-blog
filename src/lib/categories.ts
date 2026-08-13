/**
 * 카테고리 단일 진실 공급원 — docs/PRD.md 의 카테고리 표를 그대로 옮긴다.
 * 카테고리 추가는 이 파일 수정만으로 끝나야 한다.
 * 내비게이션·푸터·홈은 CATEGORIES 를 순회해서 그리고, 이름·slug 를 하드코딩하지 않는다.
 */
export type CategorySlug = "hf-blog" | "papers" | "notes";

/** 카테고리 색 토큰 키. globals.css 의 `--cat-*` 와 짝을 이룬다. */
export type CategoryAccent = "hf" | "paper" | "note";

export interface Category {
  /** URL·디렉토리 이름. 발행된 글 주소·RSS·sitemap 이 걸려 있어 바꿀 수 없다. */
  slug: CategorySlug;
  /** 카테고리 페이지 제목용 (예: "최신 논문") */
  name: string;
  /** 밀집 목록의 구분 열용. 2~3자 (예: "논문") */
  shortName: string;
  /** 색 토큰 키. globals.css 의 --cat-* 와 짝을 이룬다 */
  accent: CategoryAccent;
  description: string;
}

export const CATEGORIES: readonly Category[] = [
  {
    slug: "hf-blog",
    name: "허깅페이스 소식",
    shortName: "소식",
    accent: "hf",
    description:
      "HuggingFace 블로그의 모델·데이터셋·라이브러리 발표를 한글로 추려 적고 원문 링크를 답니다.",
  },
  {
    slug: "papers",
    name: "최신 논문",
    shortName: "논문",
    accent: "paper",
    description:
      "arXiv 논문을 읽고 문제 설정·방법·결과를 한글로 정리합니다. 수식과 도표 비중이 높습니다.",
  },
  {
    slug: "notes",
    name: "수집 자료",
    shortName: "메모",
    accent: "note",
    description:
      "글 한 편으로 묶기 전의 스크랩과 메모. 짧은 인용과 링크 위주입니다.",
  },
];

/** 카테고리 목록 URL. `content/{slug}/` 와 같은 이름을 경로로 쓴다. */
export function categoryHref(category: Category): string {
  return `/${category.slug}`;
}

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((category) => category.slug === slug);
}
