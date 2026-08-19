import Link from "next/link";

import { CloseIcon } from "@/components/ui/icons";
import { listHref, type ListFilters } from "@/lib/pagination";

/** 필터 한 줄. `key` 가 곧 쿼리 이름이다 (`?axis=` · `?source=` · `?tag=`). */
export interface ChipGroup {
  key: keyof ListFilters;
  /** 줄머리 라벨 */
  label: string;
  options: { value: string; label: string; count: number }[];
}

export interface FilterChipsProps {
  groups: ChipGroup[];
  filters: ListFilters;
  /** 링크의 기준 경로. 검색 페이지의 `?q=` 처럼 지켜야 할 쿼리는 여기 붙여 넘긴다 */
  basePath: string;
}

const CHIP =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-focus";
const INACTIVE = "border-border text-muted hover:border-muted hover:text-heading";
const ACTIVE = "border-heading bg-surface font-medium text-heading";

/**
 * 주제 × 출처 × 태그를 **함께** 거는 칩 바.
 *
 * 옛 판은 태그 한 줄뿐이었고 축·출처는 아예 걸 수 없었다. 「6개월 전에 본 그 서빙 쪽 논문」을
 * 찾으려면 둘을 같이 걸어야 하는데, 그때는 주소를 손으로 고치는 것 말고 방법이 없었다.
 *
 * 세 줄이 **같은 칩 어휘**를 쓴다 — 줄마다 다른 모양을 주면 세 축이 다른 종류의 것처럼 읽힌다.
 * 실제로는 셋 다 「지금 목록을 좁히는 조건」 하나다.
 *
 * 고를 것이 하나뿐인 줄은 그리지 않는다 (`PostList` 가 거른다) — 카테고리 페이지에서
 * 출처 줄을 그려 봐야 「논문 37」 하나만 서고, 그것은 필터가 아니라 제목의 반복이다.
 */
export function FilterChips({ groups, filters, basePath }: FilterChipsProps) {
  const shown = groups.filter((group) => group.options.length > 0);
  if (shown.length === 0) {
    return null;
  }

  return (
    <div className="space-y-[var(--space-2)]">
      {shown.map((group) => {
        const active = filters[group.key] ?? undefined;

        return (
          <nav
            key={group.key}
            aria-label={`${group.label} 필터`}
            className="flex flex-wrap items-baseline gap-x-[var(--space-3)] gap-y-[var(--space-1)]"
          >
            <span className="kicker shrink-0">{group.label}</span>

            <ul className="flex flex-wrap gap-2">
              <li>
                {/* 고르지 않은 상태가 곧 「전체」다 — 따로 값을 만들지 않는다. */}
                <Link
                  href={hrefWith(basePath, filters, group.key, undefined)}
                  aria-current={active ? undefined : "page"}
                  className={`${CHIP} ${active ? INACTIVE : ACTIVE}`}
                >
                  전체
                </Link>
              </li>

              {group.options.map(({ value, label, count }) => {
                const isActive = value === active;

                return (
                  <li key={value}>
                    <Link
                      href={hrefWith(
                        basePath,
                        filters,
                        group.key,
                        isActive ? undefined : value,
                      )}
                      aria-current={isActive ? "page" : undefined}
                      className={`${CHIP} ${isActive ? ACTIVE : INACTIVE}`}
                    >
                      <span>{label}</span>
                      {/* 개수는 읽어야 하는 정보다 — faint 는 낮 바탕에서 대비가 2.42:1 이라 못 쓴다. */}
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
      })}
    </div>
  );
}

/**
 * 한 조건만 갈아 끼우고 **나머지는 지킨다.** page 는 넘기지 않는다 —
 * 조건을 바꾸면 1쪽으로 돌아가야 3쪽에서 빈 목록을 보지 않는다.
 */
function hrefWith(
  basePath: string,
  filters: ListFilters,
  key: keyof ListFilters,
  value: string | undefined,
): string {
  return listHref(basePath, { ...filters, [key]: value });
}
