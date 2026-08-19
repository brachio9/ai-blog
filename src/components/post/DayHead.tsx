import Link from "next/link";

import { axisHref, axisNumber, getAxis } from "@/lib/axes";
import { formatDateShort } from "@/lib/format";
import type { DayGroup } from "@/lib/stats";

export interface DayHeadProps {
  group: DayGroup;
  /** 가장 새 날인가. 그 하루만 편집면이고 나머지는 색인이다 */
  isLatest?: boolean;
}

/**
 * 일자 구획의 머리 — **날짜 · 편수 · 그날의 축 집계** 한 줄.
 *
 * 이 한 줄이 상단 메뉴에서 걷어낸 분류 나열을 대신한다. 고정 목록은 「에이전트」라고만
 * 말할 수 있지만 여기는 **「지금 보고 있는 날에 에이전트가 8편」**이라고 말한다.
 * 그 차이가 이 줄이 존재하는 이유다.
 *
 * `design/brief.md` 가 보류해 둔 「시간축 눈금」 후보를 별도 장치 없이 흡수한 자리이기도 하다 —
 * 왼쪽에 눈금 레일을 따로 세우면 레일 폭이 두 번 들고 좁은 화면에서 접어야 하는데,
 * 구획을 나누고 머리에 한 줄을 얹으면 눈금이 하는 일(지금 시간 위 어디를 보는가)을
 * 세로 공간을 새로 먹지 않고 한다. **시그니처는 셋에서 멈춘다.**
 */
export function DayHead({ group, isLatest = false }: DayHeadProps) {
  return (
    <header className="flex flex-wrap items-baseline gap-x-[var(--space-3)] gap-y-[var(--space-1)]">
      <h2 className="voice-source text-[length:var(--text-h4)] text-heading">
        <time dateTime={group.day}>{formatDateShort(`${group.day}T00:00:00+0900`)}</time>
      </h2>

      <span className="voice-ui text-muted">
        <span className="voice-source">{group.count}</span>편
      </span>

      {/* 축 집계가 곧 내비게이션이다 — 관심 없는 갈래는 여기서 눈으로 건너뛴다. */}
      <nav
        aria-label={`${group.day} 갈래별 편수`}
        className="flex min-w-0 flex-wrap items-baseline gap-x-[var(--space-2)]"
      >
        {group.axes.map(({ slug, count }, index) => {
          const axis = getAxis(slug);
          if (!axis) {
            return null;
          }

          return (
            <span key={slug} className="voice-ui text-muted">
              {index > 0 ? <span aria-hidden> · </span> : null}
              <Link
                href={axisHref(axis)}
                className="transition-colors hover:text-heading focus-visible:outline-2 focus-visible:outline-focus"
              >
                {/* 좁은 화면에서는 번호만 — 레일의 부호와 같은 값이라 이름 없이도 읽힌다. */}
                <span className="sm:hidden voice-source">{axisNumber(axis)}</span>
                <span className="hidden sm:inline">{axis.shortName}</span>{" "}
                <span className="voice-source">{count}</span>
              </Link>
            </span>
          );
        })}
      </nav>

      {isLatest ? <span className="kicker ml-auto">오늘 자</span> : null}
    </header>
  );
}
