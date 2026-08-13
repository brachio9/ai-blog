import { getCategory, type CategorySlug } from "@/lib/categories";
import type { RemotePostSummary } from "@/services/github";

/**
 * 대시보드 목록의 순수 로직 — 정렬·필터·조회수 병합.
 * 네트워크는 page.tsx 가 services/ 를 통해 부른다. 여기서는 데이터만 다룬다.
 */
export interface AdminPostRow {
  /** 레포 기준 경로 — 편집 링크의 ?path= 값이다 */
  path: string;
  category: CategorySlug;
  slug: string;
  /** 조회수 키. services/turso.ts 의 post_id 규약 `{category}/{slug}` 와 같아야 한다. */
  postId: string;
  /** frontmatter 가 깨졌으면 파일명 — 클릭해서 고치러 들어갈 것이 있어야 한다 */
  title: string;
  /** frontmatter 가 깨졌으면 null */
  publishedAt: string | null;
  /** 파일명 앞의 YYYY-MM-DD. publishedAt 을 못 읽을 때의 대체 표기이자 정렬 키다. */
  fileDate: string;
  tags: string[];
  draft: boolean;
  /** frontmatter 를 읽지 못한 이유 (step 1 규약: 목록에서 사라지지 않는다) */
  error?: string;
  /** 조회수 추적이 꺼져 있으면 undefined — 0 과 구분한다 */
  views?: number;
}

/** content/{category}/YYYY-MM-DD-{slug}.mdx */
const FILE_DATE_PATTERN = /\/(\d{4}-\d{2}-\d{2})-[^/]+\.mdx$/;

function toRow(summary: RemotePostSummary): AdminPostRow {
  const base = {
    path: summary.path,
    category: summary.category,
    slug: summary.slug,
    postId: `${summary.category}/${summary.slug}`,
    fileDate: FILE_DATE_PATTERN.exec(summary.path)?.[1] ?? "",
  };

  if (!summary.frontmatter) {
    return {
      ...base,
      title: summary.path.split("/").pop() ?? summary.path,
      publishedAt: null,
      tags: [],
      draft: false,
      error: summary.error ?? "frontmatter 를 읽을 수 없다",
    };
  }

  return {
    ...base,
    title: summary.frontmatter.title,
    publishedAt: summary.frontmatter.publishedAt,
    tags: summary.frontmatter.tags,
    draft: summary.frontmatter.draft,
  };
}

/** publishedAt 은 시각까지 있고 fileDate 는 날짜뿐이라 날짜 자리만 비교한다. */
function sortKey(row: AdminPostRow): string {
  return (row.publishedAt ?? row.fileDate).slice(0, 10);
}

/**
 * 발행일 내림차순. frontmatter 가 깨진 글은 파일명 날짜로 자리를 잡는다 —
 * 정렬 못 한다고 목록 끝으로 밀어내면 방금 깨뜨린 글을 못 찾는다.
 */
export function toAdminRows(summaries: RemotePostSummary[]): AdminPostRow[] {
  return summaries
    .map(toRow)
    .sort(
      (a, b) =>
        sortKey(b).localeCompare(sortKey(a)) || a.path.localeCompare(b.path),
    );
}

/** 쿼리로 들어온 값은 무엇이든 될 수 있다 — 아는 카테고리가 아니면 필터를 걸지 않는다. */
export function resolveCategoryFilter(
  raw: string | string[] | undefined,
): CategorySlug | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value ? getCategory(value)?.slug : undefined;
}

export function filterByCategory(
  rows: AdminPostRow[],
  category?: CategorySlug,
): AdminPostRow[] {
  return category ? rows.filter((row) => row.category === category) : rows;
}

/** 조회수를 행에 얹는다. 기록이 없는 글은 turso 가 0 으로 채워 준다. */
export function withViews(
  rows: AdminPostRow[],
  views: Record<string, number>,
): AdminPostRow[] {
  return rows.map((row) => ({ ...row, views: views[row.postId] ?? 0 }));
}

/** 에디터 규약: 편집 대상은 `?path=` 로 넘긴다. 파라미터가 없으면 신규 작성이다. */
export function editorHref(path: string): string {
  return `/admin/editor?path=${encodeURIComponent(path)}`;
}
