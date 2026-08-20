import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { ACCENT_TEXT, getCategory } from "@/lib/categories";
import { countByCategory, postsByMonth, type MonthGroup } from "@/lib/stats";

// 루트 레이아웃의 title.template 이 " | {SITE_NAME}" 을 붙인다.
export const metadata: Metadata = {
  title: "아카이브",
  description: "발행한 글을 연·월로 묶어 모았습니다.",
  alternates: { canonical: "/archive" },
};

/** "2026-08" → "8월". ym 은 KST 기준이라 다시 계산할 것이 없다. */
function monthLabel(ym: string): string {
  return `${Number(ym.slice(5))}월`;
}

/** 최신순으로 온 월 묶음을 연 단위로 잇는다 — 이미 정렬돼 있어 이웃끼리만 비교하면 된다. */
function groupByYear(months: MonthGroup[]): { year: string; months: MonthGroup[] }[] {
  const years: { year: string; months: MonthGroup[] }[] = [];

  for (const month of months) {
    const year = month.ym.slice(0, 4);
    const last = years.at(-1);

    if (last?.year === year) {
      last.months.push(month);
    } else {
      years.push({ year, months: [month] });
    }
  }

  return years;
}

/**
 * 아카이브 — 이 사이트가 얼마나 꾸준했는지가 상단 한 줄과 월 목록에 드러난다.
 * 달을 펼치고 접는 것은 <details> 가 한다. 이 일에 JS 를 새로 쓸 이유가 없다.
 */
export default function ArchivePage() {
  const months = postsByMonth();
  const years = groupByYear(months);
  const perCategory = countByCategory();
  const total = perCategory.reduce((sum, entry) => sum + entry.count, 0);

  // 막대의 기준. 0 으로 나누지 않는다 — 글이 없으면 전부 비어 있는 것이 맞다.
  const widest = Math.max(0, ...months.map((month) => month.count));

  const newest = months.at(0);
  const oldest = months.at(-1);

  return (
    <Container>
      <div className="py-12 md:py-16">
        <header className="border-b border-border pb-4">
          <h1 className="text-3xl font-semibold tracking-tight text-heading md:text-4xl">
            아카이브
          </h1>
          <p className="mt-2 max-w-[68ch] text-[1.0625rem] leading-[1.75] text-muted">
            발행한 글 전부를 연·월로 묶었습니다. 달을 펼치면 그 달에 올린 글이
            나옵니다.
          </p>

          {/* 꾸준함은 문장이 아니라 수치로 말한다. */}
          <p className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-xs text-muted tabular-nums">
            <span>총 {total}편</span>
            {oldest && newest ? (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  {oldest.ym.slice(0, 4)}년 {monthLabel(oldest.ym)} ~{" "}
                  {newest.ym.slice(0, 4)}년 {monthLabel(newest.ym)}
                </span>
              </>
            ) : null}
            {perCategory.map(({ slug, count }) => {
              const category = getCategory(slug);
              if (!category) {
                return null;
              }

              return (
                <span key={slug} className="flex items-baseline gap-x-3">
                  <span aria-hidden="true">·</span>
                  {/* 카테고리 색은 여기서도 부호로만 쓴다 — 이름을 함께 적는다. */}
                  <span className={ACCENT_TEXT[category.accent]}>
                    {category.shortName} {count}
                  </span>
                </span>
              );
            })}
          </p>
        </header>

        {years.length > 0 ? (
          years.map(({ year, months: yearMonths }) => (
            /* 아카이브는 긴장 축의 밀도 쪽 끝이다 — 되찾기가 유일한 목적이라
               `.list-tight` 로 항목 간격을 최소로 좁힌다. */
            <section key={year} className="list-tight mt-10">
              <div className="flex items-baseline justify-between gap-4 border-b border-border pb-2">
                <h2 className="text-xl font-semibold text-heading">{year}년</h2>
                <p className="font-mono text-xs text-muted tabular-nums">
                  {yearMonths.reduce((sum, month) => sum + month.count, 0)}편
                </p>
              </div>

              {/* **달마다 글을 다 펼치지 않는다.** 하루 20편이면 한 달이 600편이고,
                  그것을 접었다 폈다 하는 아코디언은 되찾기 도구가 아니다.
                  여기는 어느 달에 얼마나 있었는지만 말하고, 그 달의 목록은 제 페이지가 받는다.
                  막대는 안료를 쓰지 않는다 — 달에는 부호가 없다. */}
              <ul role="list" aria-label={`${year}년 월별`}>
                {yearMonths.map((month) => (
                  <li
                    key={month.ym}
                    className="grid grid-cols-[5.5em_1fr_5em] items-baseline gap-x-[var(--space-3)] border-b border-border py-[6px]"
                  >
                    <Link
                      href={`/archive/${month.ym}`}
                      className="voice-source text-heading underline-offset-[0.2em] hover:underline focus-visible:outline-2 focus-visible:outline-focus"
                    >
                      {monthLabel(month.ym)}
                    </Link>
                    <span className="count-bar mt-[3px]" aria-hidden>
                      <i
                        style={{
                          width: `${widest > 0 ? (month.count / widest) * 100 : 0}%`,
                        }}
                      />
                    </span>
                    <span className="voice-ui text-right text-muted">
                      <span className="voice-source">{month.count}</span>편
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))
        ) : (
          <p className="mt-10 text-sm text-muted">아직 발행된 글이 없습니다.</p>
        )}

      </div>
    </Container>
  );
}
