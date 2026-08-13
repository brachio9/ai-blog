import Link from "next/link";

import { CloseIcon } from "@/components/ui/icons";
import { listHref } from "@/lib/pagination";

export interface TagFilterProps {
  tags: { tag: string; count: number }[];
  activeTag?: string;
  /** 태그 링크의 기준 경로 (예: "/papers"). 검색 페이지도 재사용한다. */
  basePath: string;
}

const CHIP =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-focus";
const INACTIVE = "border-border text-muted hover:border-muted hover:text-heading";
const ACTIVE = "border-heading bg-surface font-medium text-heading";

/** page 를 넘기지 않는다 — 태그를 바꾸면 1페이지로 돌아가야 3페이지에서 빈 목록을 보지 않는다. */
function tagHref(basePath: string, tag?: string): string {
  return listHref(basePath, { tag });
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
                {/* 태그 개수는 읽어야 하는 정보다 — faint 는 라이트에서 대비가 2.42:1 이라 못 쓴다. */}
                <span className="text-muted tabular-nums">{count}</span>
                {isActive ? <CloseIcon size={16} /> : null}
                {isActive ? <span className="sr-only">필터 해제</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
