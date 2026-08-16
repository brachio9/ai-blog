import { AXES, getAxis, type AxisSlug } from "@/lib/axes";
import { CATEGORIES, getCategory, type CategorySlug } from "@/lib/categories";
import { checkFrontmatter, type FrontmatterIssue } from "@/lib/content/schema";
import { getFormat, type FormatSlug } from "@/lib/formats";

/**
 * 에디터 폼의 순수 로직 — slug·경로·KST 시각·frontmatter 조립.
 * 네트워크도 JSX 도 없다. 클라이언트 컴포넌트가 그대로 import 하므로 node 전용 모듈을 들이지 마라
 * (gray-matter 직렬화는 서버 쪽인 serialize.ts 에 있다).
 */
export interface DraftForm {
  title: string;
  category: CategorySlug;
  /** 주제 축 — 필수·단일 */
  axis: AxisSlug;
  /** 발행 포맷 — 선택. 빈 문자열이면 frontmatter 에 키를 만들지 않는다 */
  format: FormatSlug | "";
  /** 파일명에 들어가는 URL 조각. 폼에서만 다루고 frontmatter 에는 없다. */
  slug: string;
  summary: string;
  /** KST ISO-8601 (+0900) */
  publishedAt: string;
  updatedAt: string;
  /** 콤마 구분 — 화면에서 한 줄로 다룬다 */
  tags: string;
  cover: string;
  draft: boolean;
  /** 1면 머리기사 지정. 폼이 이 값을 안 들면 저장할 때마다 지워진다 */
  lead: boolean;
  sourceUrl: string;
  sourceTitle: string;
  sourceAuthor: string;
  sourceLicense: string;
  sourcePublishedAt: string;
  /** 원문 단어 수 — 「추린 비율」의 분모. 폼에서는 문자열, frontmatter 에서는 정수다 */
  sourceWords: string;
  paperArxivId: string;
  /** 콤마 구분 */
  paperAuthors: string;
  /** frontmatter 를 뺀 MDX 본문 */
  body: string;
}

/**
 * 로더의 파일명 정규식은 한글도 통과시키지만 그러면 URL 이 퍼센트 인코딩되어 링크가 깨지기 쉽다.
 * slug 는 ASCII 로 못 박는다 — 자동 로마자화는 하지 않고 사용자가 직접 채운다.
 */
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const SLUG_RULE =
  "slug 는 영소문자·숫자·하이픈만 쓴다 (예: moe-routing-pipeline). 한글은 쓸 수 없다.";

/** content/{category}/YYYY-MM-DD-{slug}.mdx — 로더·github 서비스와 같은 규약이다. */
const POST_PATH_PATTERN =
  /^content\/([^/]+)\/(\d{4}-\d{2}-\d{2})-(.+)\.mdx$/;

const DATE_PREFIX_PATTERN = /^\d{4}-\d{2}-\d{2}/;

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}

/**
 * 제목에서 slug 후보를 만든다. ASCII 만 남기므로 한글 제목은 빈 문자열이 된다 —
 * 그때는 사용자가 직접 입력한다 (로마자화 라이브러리를 들이지 않는다).
 */
export function suggestSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * 현재 시각을 KST ISO-8601 로 (CLAUDE.md CRITICAL).
 * `Z` 로 끝나는 값을 만들면 frontmatter 스키마가 거부한다.
 */
export function nowKstIso(now: Date = new Date()): string {
  return `${new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 19)}+0900`;
}

/** 저장될 파일 경로. 날짜나 slug 가 아직 쓸 수 없으면 null — 화면에는 안내를 띄운다. */
export function draftFilePath(
  category: CategorySlug,
  publishedAt: string,
  slug: string,
): string | null {
  const date = DATE_PREFIX_PATTERN.exec(publishedAt.trim())?.[0];
  return date && isValidSlug(slug)
    ? `content/${category}/${date}-${slug}.mdx`
    : null;
}

export interface ParsedPostPath {
  category: CategorySlug;
  date: string;
  slug: string;
}

/** 편집 링크의 ?path= 를 되읽는다. 모르는 카테고리면 null. */
export function parsePostPath(path: string): ParsedPostPath | null {
  const match = POST_PATH_PATTERN.exec(path);
  const category = match ? getCategory(match[1]) : undefined;
  return match && category
    ? { category: category.slug, date: match[2], slug: match[3] }
    : null;
}

/** 콤마로 나눈 목록. 빈 조각은 버린다. */
export function parseList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function newDraft(publishedAt: string): DraftForm {
  return {
    title: "",
    category: CATEGORIES[0].slug,
    axis: AXES[0].slug,
    format: "",
    slug: "",
    summary: "",
    publishedAt,
    updatedAt: "",
    tags: "",
    cover: "",
    draft: true,
    lead: false,
    sourceUrl: "",
    sourceTitle: "",
    sourceAuthor: "",
    sourceLicense: "",
    sourcePublishedAt: "",
    sourceWords: "",
    paperArxivId: "",
    paperAuthors: "",
    body: "",
  };
}

/** YAML 은 무엇이든 담을 수 있다 — 폼은 문자열만 다루므로 여기서 좁힌다. */
function text(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function list(value: unknown): string {
  return Array.isArray(value) ? value.map(text).filter(Boolean).join(", ") : "";
}

function field(raw: unknown, key: string): unknown {
  return raw && typeof raw === "object"
    ? (raw as Record<string, unknown>)[key]
    : undefined;
}

/**
 * 레포에서 읽은 frontmatter + 본문을 폼 초기값으로 옮긴다.
 * frontmatter 가 깨진 글도 열려야 한다 (관리자는 그걸 고치러 들어온다) — 그래서 검증하지 않고 좁히기만 한다.
 * 파일 경로는 카테고리·slug 의 대체 출처다.
 */
export function toDraftForm(
  raw: unknown,
  body: string,
  path?: string,
): DraftForm {
  const fromPath = path ? parsePostPath(path) : null;
  const category = getCategory(text(field(raw, "category")))?.slug;
  const source = field(raw, "source");
  const paper = field(raw, "paper");

  return {
    title: text(field(raw, "title")),
    category: category ?? fromPath?.category ?? CATEGORIES[0].slug,
    // 모르는 값이면 첫 축으로 떨어진다 — 축은 파일 경로에 없어 대체 출처가 없다.
    axis: getAxis(text(field(raw, "axis")))?.slug ?? AXES[0].slug,
    format: getFormat(text(field(raw, "format")))?.slug ?? "",
    slug: fromPath?.slug ?? "",
    summary: text(field(raw, "summary")),
    publishedAt: text(field(raw, "publishedAt")),
    updatedAt: text(field(raw, "updatedAt")),
    tags: list(field(raw, "tags")),
    cover: text(field(raw, "cover")),
    draft: field(raw, "draft") === true,
    lead: field(raw, "lead") === true,
    sourceUrl: text(field(source, "url")),
    sourceTitle: text(field(source, "title")),
    sourceAuthor: text(field(source, "author")),
    sourceLicense: text(field(source, "license")),
    sourcePublishedAt: text(field(source, "publishedAt")),
    sourceWords: text(field(source, "words")),
    paperArxivId: text(field(paper, "arxivId")),
    paperAuthors: list(field(paper, "authors")),
    body,
  };
}

function optional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * 폼의 문자열 → 정수. 숫자가 아니면 입력값을 그대로 넘긴다 —
 * 조용히 버리면 오타 하나에 「추린 비율」이 사라진다. 스키마가 "정수여야 한다"로 잡게 둔다.
 */
function integer(value: string): number | string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : trimmed;
}

/** 빈 값을 지운 객체. 키가 하나도 안 남으면 undefined — 빈 source/paper 를 파일에 남기지 않는다. */
function compact(
  entries: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const kept = Object.entries(entries).filter(
    ([, value]) => value !== undefined,
  );
  return kept.length > 0 ? Object.fromEntries(kept) : undefined;
}

/**
 * 폼 값 → frontmatter 객체. 키 순서가 그대로 파일에 실린다.
 * 스키마가 요구하는 필드를 여기서 채워 넣지 마라 — 비어 있으면 검증이 잡아야 한다.
 */
export function toFrontmatterObject(form: DraftForm): Record<string, unknown> {
  const source = compact({
    url: optional(form.sourceUrl),
    title: optional(form.sourceTitle),
    author: optional(form.sourceAuthor),
    license: optional(form.sourceLicense),
    publishedAt: optional(form.sourcePublishedAt),
    words: integer(form.sourceWords),
  });

  const authors = parseList(form.paperAuthors);
  const paper = compact({
    arxivId: optional(form.paperArxivId),
    authors: authors.length > 0 ? authors : undefined,
  });

  return {
    title: form.title.trim(),
    category: form.category,
    axis: form.axis,
    ...(form.format ? { format: form.format } : {}),
    summary: form.summary.trim(),
    publishedAt: form.publishedAt.trim(),
    ...(optional(form.updatedAt) ? { updatedAt: form.updatedAt.trim() } : {}),
    // 비어 있으면 아예 내보내지 않는다 — 다른 선택 필드와 같은 규칙이다.
    // `tags` 는 스키마가 `default([])` 라 생략과 빈 배열이 같은 뜻이지만, 늘 적어 내면
    // **`tags` 를 생략한 파일을 열었다 저장하기만 해도 `tags: []` 가 붙는다.**
    // 봇 초안이 그 형태다(태그 정규화 층이 없어 비워 둔다) — 왕복이 무손실이 아니게 된다.
    ...(parseList(form.tags).length ? { tags: parseList(form.tags) } : {}),
    ...(optional(form.cover) ? { cover: form.cover.trim() } : {}),
    draft: form.draft,
    lead: form.lead,
    ...(source ? { source } : {}),
    ...(paper ? { paper } : {}),
  };
}

/**
 * 저장 전 검증. frontmatter 규칙은 src/lib/content/schema.ts 를 그대로 쓴다 —
 * 에디터가 규칙을 다시 적으면 빌드에서만 걸리는 글이 생긴다.
 */
export function validateDraft(form: DraftForm): FrontmatterIssue[] {
  const issues = checkFrontmatter(toFrontmatterObject(form));
  return isValidSlug(form.slug)
    ? issues
    : [{ field: "slug", message: SLUG_RULE }, ...issues];
}
