import type { CategorySlug } from "@/lib/categories";

/** 요약·인용한 외부 원문. CLAUDE.md CRITICAL — 출처 없는 번역 게시 금지. */
export interface PostSource {
  url: string;
  /** 원문 제목 */
  title: string;
  author?: string;
  /** "cc-by-4.0" | "unknown" 등 자유 문자열 */
  license?: string;
  publishedAt?: string;
}

/** category === "papers" 전용 메타 */
export interface PaperMeta {
  arxivId: string;
  authors: string[];
}

export interface PostFrontmatter {
  title: string;
  category: CategorySlug;
  summary: string;
  /** KST ISO-8601 (+0900) */
  publishedAt: string;
  updatedAt?: string;
  tags: string[];
  cover?: string;
  draft: boolean;
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
