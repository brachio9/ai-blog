/**
 * 카테고리 단일 진실 공급원 — docs/PRD.md 의 카테고리 표를 그대로 옮긴다.
 * 카테고리 추가는 이 파일 수정만으로 끝나야 한다.
 * 내비게이션·푸터·홈은 CATEGORIES 를 순회해서 그리고, 이름·slug 를 하드코딩하지 않는다.
 */
export type CategorySlug =
  | "papers"
  | "releases"
  | "news"
  | "community"
  | "notes";

/** 카테고리 색 토큰 키. globals.css 의 `--cat-*` 와 짝을 이룬다. */
export type CategoryAccent =
  | "paper"
  | "release"
  | "news"
  | "community"
  | "note";

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

/**
 * 배열 순서가 화면 순서다 (내비게이션·홈·푸터).
 * 5칸 구성은 수집 파이프라인(`chorok-collect`)이 실제로 모으는 소스 59곳의 분포에 맞춘 것이다 —
 * 옛 한 칸에 GitHub 릴리즈 28곳과 기업 블로그·뉴스레터 17곳이 함께 들어 있었고,
 * "버전이 나왔다"와 "이런 걸 만들었다"는 성격이 달라 두 칸으로 갈랐다.
 */
export const CATEGORIES: readonly Category[] = [
  {
    slug: "papers",
    name: "논문",
    shortName: "논문",
    accent: "paper",
    description:
      "arXiv·HF Daily Papers 논문을 읽고 문제 설정·방법·결과를 한글로 추려 적습니다. 수식과 도표 비중이 높습니다.",
  },
  {
    slug: "releases",
    name: "릴리즈",
    shortName: "릴리즈",
    accent: "release",
    description:
      "모델·라이브러리·툴의 버전 발표를 한글로 추려 적고 원문 링크를 답니다. 무엇이 어떻게 달라졌는지가 요점입니다.",
  },
  {
    slug: "news",
    name: "소식",
    shortName: "소식",
    accent: "news",
    description:
      "기업 연구 블로그·뉴스레터·문서 변경에서 읽을 만한 것을 골라 한글로 추려 적고 원문 링크를 답니다.",
  },
  {
    slug: "community",
    name: "커뮤니티",
    shortName: "커뮤니티",
    accent: "community",
    description:
      "HN·포럼·긱뉴스에서 관측한 논쟁을 묶어 적습니다. 원문이 하나가 아니라 여럿이라 링크도 여럿입니다.",
  },
  {
    slug: "notes",
    name: "기록",
    shortName: "기록",
    accent: "note",
    description:
      "직접 재 보고 직접 만들어 본 것, 그리고 직접 골라 추린 것. 잰 글에는 측정 조건을, 옮긴 글에는 원문 링크를 답니다.",
  },
];

/**
 * 카테고리 색을 **글자색 유틸리티**로 받는다 — `--cat-*` 를 Tailwind 로 노출한 통로다.
 * Tailwind 는 런타임에 조합한 클래스 문자열을 만들어 주지 않으므로 accent 키로 고른다.
 *
 * `CAT_CLASS` 와 갈리는 지점: 저쪽은 `--cat` 변수를 **정해 주고**(그 아래 `.cat-label`·
 * `.ratio` 가 따라온다), 이쪽은 그 색을 **직접 칠한다**. 항목 안에서는 CAT_CLASS 를,
 * 제호·머리글처럼 홀로 서는 라벨에는 이쪽을 쓴다.
 *
 * 다섯 칸 모두 두 지면에서 AA 4.5:1 을 넘는다 (design-tokens.test.ts 가 지킨다) —
 * 개편 전에는 그러지 못해 `dark:` 변형과 700/300 단계를 따로 적어야 했다.
 */
export const ACCENT_TEXT: Record<CategoryAccent, string> = {
  paper: "text-cat-paper",
  release: "text-cat-release",
  news: "text-cat-news",
  community: "text-cat-community",
  note: "text-cat-note",
};

/**
 * 안료 클래스 — globals.css 의 `.cat-*` 가 그 항목의 `--cat` 을 정한다.
 * 항목(.entry·.brief-item·.index-row·.entry-lead) 바깥쪽에 붙이면 안쪽의
 * `.cat-label` · `.ratio` 가 그 색을 따라온다. 색 값을 컴포넌트에 적지 않기 위한 유일한 통로다.
 *
 * 클래스 이름은 `cat-{slug}` 규칙이다. 5칸 개편 전에는 `.cat-news` 가 朱土(옛 릴리즈·발표)였고
 * 지금은 藍(소식)이다 — 이름이 같고 뜻이 바뀐 자리라 globals.css 쪽을 함께 봐야 한다.
 */
export const CAT_CLASS: Record<CategoryAccent, string> = {
  paper: "cat-papers",
  release: "cat-releases",
  news: "cat-news",
  community: "cat-community",
  note: "cat-notes",
};

/** 카테고리 목록 URL. `content/{slug}/` 와 같은 이름을 경로로 쓴다. */
/**
 * 출처별 목록의 주소. **글 주소가 아니다** — 글은 `/posts/{slug}` 다 (`lib/pagination.ts`).
 *
 * 옛 주소는 최상위 `/{category}` 였다. 그것을 `/sources/` 아래로 내리면서 최상위 동적
 * 세그먼트가 사라졌고, 그와 함께 「정적 라우트와 겹치면 404 가 아니라 엉뚱한 페이지가
 * 조용히 뜬다」는 함정도 사라졌다 (옛 `RESERVED_SEGMENTS`).
 */
export function categoryHref(category: Category): string {
  return `/sources/${category.slug}`;
}

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((category) => category.slug === slug);
}
