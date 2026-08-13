import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { CATEGORIES, getCategory, type CategorySlug } from "@/lib/categories";
import { formatCount, formatDateShort } from "@/lib/format";
import { isPublishConfigured, listPosts } from "@/services/github";
import { getViews, isViewTrackingEnabled } from "@/services/turso";

import {
  editorHref,
  filterByCategory,
  resolveCategoryFilter,
  toAdminRows,
  withViews,
  type AdminPostRow,
} from "./posts";

export const metadata: Metadata = {
  title: "관리자",
  // 관리자 화면은 검색엔진에 실리면 안 된다.
  robots: { index: false, follow: false },
};

const CHIP =
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-focus";
const CHIP_INACTIVE =
  "border-border text-muted hover:border-muted hover:text-heading";
const CHIP_ACTIVE = "border-heading bg-surface font-medium text-heading";

const BADGE = "rounded-full border px-2.5 py-0.5 text-xs";

type LoadResult = { rows: AdminPostRow[] } | { error: string };

/**
 * 목록의 출처는 **레포**다. 빌드 타임 콘텐츠 로더나 파일시스템으로 읽지 마라.
 * 1) 이 페이지는 auth() 때문에 동적이라 서버리스 번들에 content/ 가 없다 — 배포 후에만 깨진다.
 * 2) 방금 발행한 글은 커밋됐지만 재배포 전이다. 빌드 스냅샷은 "발행했는데 목록에 없다" 가 된다.
 */
async function loadRows(): Promise<LoadResult> {
  try {
    const rows = toAdminRows(await listPosts());
    if (!isViewTrackingEnabled()) {
      return { rows };
    }

    // 조회수는 부가 정보다 — turso.ts 는 실패해도 던지지 않고 0 을 준다.
    const views = await getViews(rows.map((row) => row.postId));
    return { rows: withViews(rows, views) };
  } catch (error) {
    // ARCHITECTURE: 실패 원인을 조용히 삼키지 마라. GitHubApiError 의 메시지에 토큰은 들어 있지 않다.
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

function filterHref(category?: CategorySlug): string {
  return category ? `/admin?category=${category}` : "/admin";
}

export default async function AdminHomePage(props: PageProps<"/admin">) {
  // CLAUDE.md CRITICAL — proxy 가 이미 막지만 페이지에서 화이트리스트를 다시 확인한다.
  await requireAdmin();

  const activeCategory = resolveCategoryFilter(
    (await props.searchParams).category,
  );
  const configured = isPublishConfigured();
  const result = configured ? await loadRows() : null;
  const rows =
    result && "rows" in result
      ? filterByCategory(result.rows, activeCategory)
      : [];

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-heading md:text-4xl">
            글 목록
          </h1>
          <p className="mt-2 text-sm text-muted">
            레포에 커밋된 <code className="font-mono text-xs">content/</code> 를
            그대로 읽습니다. 발행 직후 재배포 전에도 여기에는 바로 보입니다.
          </p>
        </div>

        <Link
          href="/admin/editor"
          className="rounded bg-heading px-4 py-2 text-sm font-medium text-bg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-focus"
        >
          새 글 작성
        </Link>
      </header>

      {!configured ? (
        <PublishNotConfigured />
      ) : result && "error" in result ? (
        <LoadError message={result.error} />
      ) : (
        <div className="mt-8 space-y-6">
          <nav aria-label="카테고리 필터">
            <ul className="flex flex-wrap gap-2">
              <li>
                <Link
                  href={filterHref()}
                  aria-current={activeCategory ? undefined : "page"}
                  className={`${CHIP} ${activeCategory ? CHIP_INACTIVE : CHIP_ACTIVE}`}
                >
                  전체
                </Link>
              </li>
              {CATEGORIES.map((category) => {
                const isActive = category.slug === activeCategory;
                return (
                  <li key={category.slug}>
                    <Link
                      href={filterHref(isActive ? undefined : category.slug)}
                      aria-current={isActive ? "page" : undefined}
                      className={`${CHIP} ${isActive ? CHIP_ACTIVE : CHIP_INACTIVE}`}
                    >
                      {category.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {rows.length === 0 ? (
            <p className="text-sm text-muted">
              {activeCategory
                ? "이 카테고리에는 글이 없습니다."
                : "레포에 글이 없습니다. 새 글을 작성해 보세요."}
            </p>
          ) : (
            <>
              <p className="text-sm text-muted">{rows.length}건</p>
              <ul className="border-y border-border">
                {rows.map((row) => (
                  <li
                    key={row.path}
                    className="border-b border-border py-4 last:border-b-0"
                  >
                    <PostRow row={row} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function PostRow({ row }: { row: AdminPostRow }) {
  const category = getCategory(row.category);

  return (
    <article>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Link
          href={editorHref(row.path)}
          className="text-base font-medium text-heading underline-offset-[0.2em] hover:underline focus-visible:outline-2 focus-visible:outline-focus"
        >
          {row.title}
        </Link>

        {row.error ? (
          <span className={`${BADGE} border-danger text-danger`}>오류</span>
        ) : row.draft ? (
          <span className={`${BADGE} border-warning text-warning`}>초안</span>
        ) : (
          <span className={`${BADGE} border-border text-muted`}>발행</span>
        )}
      </div>

      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
        <span>{category?.name ?? row.category}</span>
        <span aria-hidden="true">·</span>
        {row.publishedAt ? (
          <time dateTime={row.publishedAt}>
            {formatDateShort(row.publishedAt)}
          </time>
        ) : (
          // frontmatter 를 못 읽었으면 파일명 날짜라도 보여 준다.
          <span>{row.fileDate}</span>
        )}
        {row.views === undefined ? null : (
          <>
            <span aria-hidden="true">·</span>
            <span>조회 {formatCount(row.views)}</span>
          </>
        )}
        <span aria-hidden="true">·</span>
        <span className="font-mono text-xs break-all">{row.path}</span>
      </p>

      {row.tags.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {row.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted"
            >
              {tag}
            </li>
          ))}
        </ul>
      ) : null}

      {row.error ? (
        <p
          role="alert"
          className="mt-2 border-l-[3px] border-l-danger bg-surface py-2 pl-4 text-sm text-body"
        >
          {row.error}
        </p>
      ) : null}
    </article>
  );
}

/** 빈 화면을 내지 않는다 — 무엇이 없어서 목록을 못 읽는지 이름으로 알려 준다 (값은 절대 찍지 않는다). */
function PublishNotConfigured() {
  return (
    <div className="mt-8 rounded-md border border-border bg-surface p-5">
      <p className="text-sm text-body">
        GitHub 연결이 설정되지 않아 글 목록을 읽을 수 없습니다.
      </p>
      <p className="mt-2 text-sm text-muted">
        <code className="font-mono text-xs">GITHUB_CONTENT_REPO</code> ·{" "}
        <code className="font-mono text-xs">GITHUB_CONTENT_BRANCH</code> ·{" "}
        <code className="font-mono text-xs">GITHUB_CONTENT_TOKEN</code> 을{" "}
        <code className="font-mono text-xs">.env.local</code> 에 채운 뒤 서버를
        다시 시작하세요.
      </p>
    </div>
  );
}

function LoadError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mt-8 border-l-[3px] border-l-danger bg-surface py-3 pl-4"
    >
      <p className="text-sm text-body">글 목록을 불러오지 못했습니다.</p>
      <p className="mt-1 text-sm break-words text-muted">{message}</p>
    </div>
  );
}
