import { z } from "zod";

import { AXES, type AxisSlug } from "@/lib/axes";
import { CATEGORIES, type CategorySlug } from "@/lib/categories";
import { FORMATS, type FormatSlug } from "@/lib/formats";
import {
  AXIS_BY_SLUGS,
  AXIS_CONFIDENCES,
  POPULARITY_KINDS,
  SELECTION_BANDS,
  type AxisBySlug,
  type AxisConfidence,
  type PopularityKind,
  type SelectionBand,
} from "@/lib/selection";
import type { PostFrontmatter } from "@/types/content";

/** slug 는 categories.ts 가 단일 진실 공급원 — 여기서 문자열을 다시 적지 않는다. */
const CATEGORY_SLUGS = CATEGORIES.map((category) => category.slug) as [
  CategorySlug,
  ...CategorySlug[],
];

/** 축·포맷도 같은 규칙이다 — axes.ts · formats.ts 가 정본이다. */
const AXIS_SLUGS = AXES.map((axis) => axis.slug) as [AxisSlug, ...AxisSlug[]];

const FORMAT_SLUGS = FORMATS.map((format) => format.slug) as [
  FormatSlug,
  ...FormatSlug[],
];

/** 선별 경위의 값들도 같은 규칙이다 — `selection.ts` 가 정본이고 여기서 다시 적지 않는다. */
const AXIS_BY = AXIS_BY_SLUGS as [AxisBySlug, ...AxisBySlug[]];
const CONFIDENCES = AXIS_CONFIDENCES as unknown as [AxisConfidence, ...AxisConfidence[]];
const BANDS = SELECTION_BANDS as unknown as [SelectionBand, ...SelectionBand[]];
const POPULARITIES = POPULARITY_KINDS as unknown as [
  PopularityKind,
  ...PopularityKind[],
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
  /**
   * 원문 페이지가 쓰던 그림의 **주소**. 목록 썸네일이 이걸 그대로 임베드한다.
   *
   * **`source` 안에 두는 것이 핵심이다.** 「이 그림은 `source.url` 페이지에서 왔다」가
   * 관례가 아니라 구조가 되고, 출처가 어긋날 방법이 없어진다. `notes`(사람이 쓴 글)에는
   * `source` 가 없으니 자동으로 표지로 떨어진다.
   *
   * **호스트 화이트리스트를 여기 두지 마라.** 스키마 실패는 `next build` 를 깨뜨린다 —
   * 처음 보는 호스트 하나가 사이트 전체를 못 세우게 만든다. 어느 그림을 버릴지는
   * 수집기가 정한다 (`chorok/draft/figures.py`).
   */
  image: z
    .url("source.image 는 유효한 URL 이어야 한다")
    .refine(
      (value) => value.startsWith("https://"),
      "source.image 는 https 여야 한다 — http 그림은 브라우저가 막아 빈칸이 된다",
    )
    .optional(),
});

const popularitySchema = z.object({
  kind: z.enum(
    POPULARITIES,
    `popularity.kind 는 ${POPULARITIES.join(" | ")} 중 하나여야 한다`,
  ),
  count: z
    .int("popularity.count 는 정수여야 한다")
    .nonnegative("popularity.count 는 0 이상이어야 한다"),
});

/**
 * 봇이 이 글을 고른 경위. **있으면 다 있어야 한다** — 반쯤 채운 경위는 경위가 아니다.
 * 사람이 고른 글(`notes`)에는 이 칸이 아예 없다 (아래 superRefine).
 */
const selectionSchema = z.object({
  axisBy: z.enum(AXIS_BY, `selection.axisBy 는 ${AXIS_BY.join(" | ")} 중 하나여야 한다`),
  axisConfidence: z.enum(
    CONFIDENCES,
    `selection.axisConfidence 는 ${CONFIDENCES.join(" | ")} 여야 한다`,
  ),
  band: z.enum(BANDS, `selection.band 는 ${BANDS.join(" | ")} 여야 한다`),
  crossSources: z
    .int("selection.crossSources 는 정수여야 한다")
    .min(1, "selection.crossSources 는 1 이상이다 — 자기 자신이 한 곳이다"),
  popularity: popularitySchema.optional(),
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
    /**
     * 주제 축 — 필수·단일이다. 「미분류」를 허용하면 /topics 에서 그 칸이 최대가 되고
     * 6축 편수의 합이 전체와 어긋나 지도 노릇을 못 한다 (docs/PRD.md).
     */
    axis: z.enum(
      AXIS_SLUGS,
      `axis 는 ${AXIS_SLUGS.join(" | ")} 중 하나여야 한다`,
    ),
    /** 발행 포맷 — 선택. 라우트가 없고 목록의 `?format=` 필터로만 쓰인다. */
    format: z
      .enum(
        FORMAT_SLUGS,
        `format 은 ${FORMAT_SLUGS.join(" | ")} 중 하나여야 한다`,
      )
      .optional(),
    summary: z.string().min(1, "summary 는 비어 있을 수 없다"),
    publishedAt: kstDateTime("publishedAt"),
    updatedAt: kstDateTime("updatedAt").optional(),
    tags: z.array(z.string().min(1)).default([]),
    draft: z.boolean().default(false),
    source: sourceSchema.optional(),
    paper: paperSchema.optional(),
    /**
     * **선택 필드다.** 사람이 `/admin` 에서 쓰는 글에는 없다 — 여기서 필수로 하면 그 경로가
     * 아예 막힌다. 「봇은 경위 없이 글을 내지 않는다」는 수집기 쪽 타입이 강제한다.
     */
    selection: selectionSchema.optional(),
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
    // 사람이 골랐다는 것이 notes 의 기준이다 — 기계의 선별 경위를 적을 자리가 없다.
    if (value.category === "notes" && value.selection) {
      ctx.addIssue({
        code: "custom",
        path: ["selection"],
        message:
          "notes 는 사람이 고른 글이다 — selection (봇의 선별 경위) 을 넣을 수 없다",
      });
    }
    // 직접 재 보고 직접 만들어 본 글에는 옮길 원문이 없다 — 그 자리가 notes 다.
    if (
      (value.format === "replication" || value.format === "fieldnote") &&
      value.category !== "notes"
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["format"],
        message:
          "재현 검증·실전 기록은 관측·기록(notes) 카테고리다 — 옮길 원문이 없는 글이다",
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
