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
  /** 카테고리 페이지 제목용 (예: "릴리즈·발표") */
  name: string;
  /** 밀집 목록의 구분 열용. 2~3자 (예: "논문") */
  shortName: string;
  /** 색 토큰 키. globals.css 의 --cat-* 와 짝을 이룬다 */
  accent: CategoryAccent;
  description: string;
}

export const CATEGORIES: readonly Category[] = [
  {
    // 주소는 허깅페이스 블로그만 옮기던 시절의 흔적이다. 걸린 링크를 끊지 않으려고 이름만 바꿨다.
    slug: "hf-blog",
    name: "릴리즈·발표",
    shortName: "소식",
    accent: "hf",
    description:
      "모델·라이브러리 릴리즈, 기업 연구 블로그, 툴 문서 변경을 한글로 추려 적고 원문 링크를 답니다.",
  },
  {
    slug: "papers",
    name: "논문",
    shortName: "논문",
    accent: "paper",
    description:
      "arXiv·OpenReview 논문을 읽고 문제 설정·방법·결과를 한글로 정리합니다. 수식과 도표 비중이 높습니다.",
  },
  {
    slug: "notes",
    name: "관측·기록",
    shortName: "관측",
    accent: "note",
    description:
      "커뮤니티에서 관측한 것과 직접 해 본 것. 옮길 원문이 없는 글에는 원문 링크 대신 측정 조건과 실패한 시도를 답니다.",
  },
];

/**
 * 정적 라우트가 점유한 최상위 세그먼트. 카테고리 slug 이 이 중 하나면 그 카테고리는 도달 불가능해진다.
 * `/{category}` 는 최상위 동적 세그먼트라 정적 라우트가 항상 먼저 이긴다 — 충돌해도 404 가 아니라
 * 엉뚱한 페이지가 조용히 뜬다. 카테고리를 늘리지 않는 지금은 잠재 위험이지만, 바꾸는 순간 실사고다.
 */
export const RESERVED_SEGMENTS: readonly string[] = [
  "topics",
  "tags",
  "archive",
  "about",
  "search",
  "admin",
  "api",
  "rss.xml",
  "sitemap.xml",
  "search-index.json",
];

/**
 * 안료 클래스 — globals.css 의 `.cat-*` 가 그 항목의 `--cat` 을 정한다.
 * 항목(.entry·.brief-item·.index-row·.entry-lead) 바깥쪽에 붙이면 안쪽의
 * `.cat-label` · `.ratio` 가 그 색을 따라온다. 색 값을 컴포넌트에 적지 않기 위한 유일한 통로다.
 */
export const CAT_CLASS: Record<CategoryAccent, string> = {
  hf: "cat-news",
  paper: "cat-papers",
  note: "cat-notes",
};

/** 카테고리 목록 URL. `content/{slug}/` 와 같은 이름을 경로로 쓴다. */
export function categoryHref(category: Category): string {
  return `/${category.slug}`;
}

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((category) => category.slug === slug);
}
