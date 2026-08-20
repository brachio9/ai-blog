import type { AxisSlug } from "@/lib/axes";
import type { CategorySlug } from "@/lib/categories";
import type { FormatSlug } from "@/lib/formats";
import type {
  AxisBySlug,
  AxisConfidence,
  PopularityKind,
  SelectionBand,
} from "@/lib/selection";

/** 요약·인용한 외부 원문. CLAUDE.md CRITICAL — 출처 없는 번역 게시 금지. */
export interface PostSource {
  url: string;
  /** 원문 제목 */
  title: string;
  author?: string;
  /** "cc-by-4.0" | "unknown" 등 자유 문자열 */
  license?: string;
  publishedAt?: string;
  /** 원문 단어 수 — 「추린 비율」의 분모. 없으면 비율을 그리지 않는다 */
  words?: number;
  /**
   * 원문 페이지의 그림 주소. **복제가 아니라 임베드다** — 우리 레포에 받아 두지 않는다.
   * 없는 글이 40% 라 목록은 그때 표지를 그린다 (`PostThumb`).
   */
  image?: string;
}

/** 원문 매체의 반응. **매체마다 세는 것이 달라 종류를 함께 적는다** — 비교하지 마라. */
export interface PostPopularity {
  kind: PopularityKind;
  /** 그 매체의 단위 그대로 */
  count: number;
}

/**
 * 봇이 이 글을 고른 경위. **사람이 고른 글(`notes`)에는 없다** — 고른 주체가 사람이다.
 *
 * 분류 축이 **아니다.** 라우팅도 집계도 하지 않는다 (분류 축은 셋뿐이다 — docs/PRD.md).
 * 흩어진 최상위 칸이 아니라 객체 하나인 것은 관리자 에디터가 모르는 칸을 저장할 때
 * 지우기 때문이다 — 통과시킬 슬롯이 하나면 한 번만 챙기면 된다 (`admin/editor/draft.ts`).
 */
export interface PostSelection {
  /** 축을 누가 정했나. `axis` 가 1급 차원이 된 이상 그 출처를 숨기면 지도가 거짓이 된다 */
  axisBy: AxisBySlug;
  /** 그 판정이 다른 경로와 만났나. `low` = 한 경로만 보고 정했거나 자동 분류가 답하지 못했다 */
  axisConfidence: AxisConfidence;
  /** 선별 등급 3단. **원점수가 아니다** — `src/lib/selection.ts` 에 근거를 적었다 */
  band: SelectionBand;
  /** 같은 소식이 뜬 서로 다른 매체 수. 1 = 한 곳뿐. **초안 시점의 값이다** */
  crossSources: number;
  /** 원문 매체의 반응. 없는 글이 절반이라 선택 필드다 */
  popularity?: PostPopularity;
}

/** category === "papers" 전용 메타 */
export interface PaperMeta {
  arxivId: string;
  authors: string[];
}

export interface PostFrontmatter {
  title: string;
  category: CategorySlug;
  /** 주제 축 — 필수·단일. 6축 편수의 합이 전체와 같아야 /topics 가 지도가 된다 */
  axis: AxisSlug;
  /** 발행 포맷 — 선택. 라우트가 없고 `?format=` 필터로만 쓰인다 */
  format?: FormatSlug;
  summary: string;
  /** KST ISO-8601 (+0900) */
  publishedAt: string;
  updatedAt?: string;
  tags: string[];
  draft: boolean;
  source?: PostSource;
  paper?: PaperMeta;
  /**
   * 봇이 고른 경위. **여기서는 선택 필드다** — 사람이 `/admin` 에서 손으로 쓰는 글에는
   * 없다. 수집기 쪽 미러는 이 칸을 필수로 강제한다 (봇은 경위 없이 글을 내지 않는다).
   * 그 비대칭이 의도이고, 수집기의 계약 픽스처가 근거를 기록한다.
   */
  selection?: PostSelection;
}

export interface Post {
  frontmatter: PostFrontmatter;
  /** 파일명에서 날짜 접두사를 뗀 부분 */
  slug: string;
  category: CategorySlug;
  /** frontmatter 를 제외한 MDX 본문 */
  body: string;
  /** 레포 기준 상대 경로 (에러 메시지용) */
  filePath: string;
  readingMinutes: number;
  /**
   * 「추린 비율」 — **로드 타임에 미리 잰다.** 없으면 null.
   *
   * 렌더에서 구하면 `countBodyChars()` 의 정규식 여섯 패스를 행마다 돈다.
   * 더 중요한 것은 **목록이 body 없이도 비율을 그릴 수 있게 된다**는 것이다 —
   * 「목록은 본문을 클라이언트로 넘기지 않는다」 계약이 그대로 지켜진다.
   */
  ratio: number | null;
}
