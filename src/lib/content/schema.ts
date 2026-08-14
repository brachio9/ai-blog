import { z } from "zod";

import { CATEGORIES, type CategorySlug } from "@/lib/categories";
import type { PostFrontmatter } from "@/types/content";

/** slug 는 categories.ts 가 단일 진실 공급원 — 여기서 문자열을 다시 적지 않는다. */
const CATEGORY_SLUGS = CATEGORIES.map((category) => category.slug) as [
  CategorySlug,
  ...CategorySlug[],
];

/**
 * CLAUDE.md CRITICAL — 모든 시각은 KST(+0900) ISO-8601.
 * `Z` 나 다른 오프셋은 형식만으로 걸러낸다.
 */
const KST_ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?\+0900$/;

function kstDateTime(field: string) {
  return z
    .string()
    .regex(
      KST_ISO_PATTERN,
      `${field} 는 KST ISO-8601 (+0900) 이어야 한다. 예: 2026-08-12T15:46:52+0900`,
    )
    .refine(
      // Date.parse 는 콜론 없는 오프셋이 표준이 아니므로 +09:00 으로 바꿔 검사한다.
      (value) => !Number.isNaN(Date.parse(value.replace(/\+0900$/, "+09:00"))),
      `${field} 가 실제로 존재하는 시각이 아니다`,
    );
}

const sourceSchema = z.object({
  url: z.url("source.url 은 유효한 URL 이어야 한다"),
  title: z.string().min(1, "source.title (원문 제목) 은 비어 있을 수 없다"),
  author: z.string().min(1).optional(),
  license: z.string().min(1).optional(),
  publishedAt: kstDateTime("source.publishedAt").optional(),
  /**
   * 원문의 단어 수 — 시그니처 「추린 비율」의 분모다 (design/brief.md).
   * 초록(한글) 쪽 길이는 본문에서 세므로 적지 않는다.
   * 선택 필드다 — source 가 없는 notes 글에는 비교 대상 자체가 없다.
   */
  words: z
    .int("source.words 는 정수여야 한다 (원문 단어 수)")
    .positive("source.words 는 1 이상이어야 한다")
    .optional(),
});

const paperSchema = z.object({
  arxivId: z.string().min(1, "paper.arxivId 는 비어 있을 수 없다"),
  authors: z.array(z.string().min(1)).min(1, "paper.authors 는 최소 1명"),
});

const frontmatterSchema = z
  .object({
    title: z.string().min(1, "title 은 비어 있을 수 없다"),
    category: z.enum(
      CATEGORY_SLUGS,
      `category 는 ${CATEGORY_SLUGS.join(" | ")} 중 하나여야 한다`,
    ),
    summary: z.string().min(1, "summary 는 비어 있을 수 없다"),
    publishedAt: kstDateTime("publishedAt"),
    updatedAt: kstDateTime("updatedAt").optional(),
    tags: z.array(z.string().min(1)).default([]),
    cover: z.string().min(1).optional(),
    draft: z.boolean().default(false),
    /** 1면 머리기사 지정. 없으면 가장 최근 글이 자동으로 머리기사가 된다. */
    lead: z.boolean().default(false),
    source: sourceSchema.optional(),
    paper: paperSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.category === "papers" && !value.paper) {
      ctx.addIssue({
        code: "custom",
        path: ["paper"],
        message: "category 가 papers 이면 paper (arxivId·authors) 가 필수다",
      });
    }
    if (value.category !== "papers" && value.paper) {
      ctx.addIssue({
        code: "custom",
        path: ["paper"],
        message: `paper 는 papers 카테고리 전용이다 (현재 category: ${value.category})`,
      });
    }
  });

export interface FrontmatterIssue {
  /** "publishedAt" · "source.url" — 중첩 필드는 점으로 잇는다 */
  field: string;
  message: string;
}

/**
 * 검증만 하고 던지지 않는다. 관리자 에디터가 필드별 오류를 화면에 그리는 데 쓴다 —
 * 저장 전에 무엇이 왜 틀렸는지 보여줘야 하므로 예외 메시지를 되파싱할 수는 없다.
 * 스키마는 위의 frontmatterSchema 하나뿐이다 (에디터가 규칙을 다시 적지 않는다).
 */
export function checkFrontmatter(raw: unknown): FrontmatterIssue[] {
  const result = frontmatterSchema.safeParse(raw);
  return result.success ? [] : toIssues(result.error);
}

function toIssues(error: z.ZodError): FrontmatterIssue[] {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join(".") : "(전체)",
    message: issue.message,
  }));
}

/**
 * frontmatter 를 검증해 반환한다. 실패하면 던진다 — 조용히 건너뛰지 않는다.
 * 빌드가 깨질 때 어느 글의 어느 필드가 문제인지 메시지만 보고 알 수 있어야 한다.
 */
export function parseFrontmatter(
  raw: unknown,
  filePath: string,
): PostFrontmatter {
  const result = frontmatterSchema.safeParse(raw);

  if (!result.success) {
    const details = toIssues(result.error)
      .map((issue) => `  - ${issue.field}: ${issue.message}`)
      .join("\n");

    throw new Error(`frontmatter 검증 실패: ${filePath}\n${details}`);
  }

  return result.data;
}
