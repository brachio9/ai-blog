import type { AxisSlug } from "@/lib/axes";
import type { CategorySlug } from "@/lib/categories";
import type { FormatSlug } from "@/lib/formats";

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
  cover?: string;
  draft: boolean;
  /** 1면 머리기사 수동 지정. 기본값은 false — 그때는 가장 최근 글이 머리기사다 */
  lead: boolean;
  source?: PostSource;
  paper?: PaperMeta;
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
}
