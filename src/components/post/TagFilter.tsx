import Link from "next/link";

export interface TagFilterProps {
  tags: { tag: string; count: number }[];
  activeTag?: string;
  /** 태그 링크의 기준 경로 (예: "/papers"). 검색 페이지도 재사용한다. */
  basePath: string;
}

const CHIP =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-accent";
const INACTIVE = "border-border text-muted hover:border-accent hover:text-accent";
const ACTIVE = "border-accent bg-surface text-accent";

/** 태그를 바꾸면 페이지는 1로 되돌아간다 — 3페이지에서 태그만 갈아끼우면 빈 목록이 된다. */
function tagHref(basePath: string, tag?: string): string {
  if (!tag) {
    return basePath;
  }
  const params = new URLSearchParams({ tag });
  return `${basePath}?${params.toString()}`;
}

export function TagFilter({ tags, activeTag, basePath }: TagFilterProps) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <nav aria-label="태그 필터">
      <ul className="flex flex-wrap gap-2">
        <li>
          {/* 선택 해제 수단. 아무 태그도 고르지 않은 상태가 곧 "전체" 다. */}
          <Link
            href={tagHref(basePath)}
            aria-current={activeTag ? undefined : "page"}
            className={`${CHIP} ${activeTag ? INACTIVE : ACTIVE}`}
          >
            전체
          </Link>
        </li>

        {tags.map(({ tag, count }) => {
          const isActive = tag === activeTag;

          return (
            <li key={tag}>
              <Link
                href={isActive ? tagHref(basePath) : tagHref(basePath, tag)}
                aria-current={isActive ? "page" : undefined}
                className={`${CHIP} ${isActive ? ACTIVE : INACTIVE}`}
              >
                <span>{tag}</span>
                <span className="text-faint">{count}</span>
                {isActive ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                ) : null}
                {isActive ? <span className="sr-only">필터 해제</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
