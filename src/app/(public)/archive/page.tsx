import type { Metadata } from "next";

import { Container } from "@/components/layout/Container";
import { ACCENT_TEXT, PostTable } from "@/components/post/PostTable";
import { getCategory } from "@/lib/categories";
import { countByCategory, postsByMonth, type MonthGroup } from "@/lib/stats";

/** 최근 몇 달만 펼쳐 둔다. 나머지는 접어야 달이 쌓여도 페이지가 훑을 만하다. */
const OPEN_MONTHS = 3;

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

  // 최근 OPEN_MONTHS 개월만 펼친다. 연도가 아니라 전체 기준이다.
  const opened = new Set(months.slice(0, OPEN_MONTHS).map((month) => month.ym));

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
               `.list-tight` 로 항목 간격을 최소로 좁힌다 (--entry-pad 는 상속된다). */
            <section key={year} className="list-tight mt-10">
              <div className="flex items-baseline justify-between gap-4 border-b border-border pb-2">
                <h2 className="text-xl font-semibold text-heading">{year}년</h2>
                <p className="font-mono text-xs text-muted tabular-nums">
                  {yearMonths.reduce((sum, month) => sum + month.count, 0)}편
                </p>
              </div>

              {yearMonths.map((month) => (
                <details
                  key={month.ym}
                  open={opened.has(month.ym)}
                  className="border-b border-border"
                >
                  {/* 여는 표식은 브라우저 기본 marker 를 그대로 쓴다 — 아이콘을 새로 그리지 않는다. */}
                  <summary className="cursor-pointer py-3 pl-4 text-[0.9375rem] text-heading transition-colors marker:text-muted hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus">
                    {monthLabel(month.ym)}
                    <span className="ml-2 font-mono text-xs text-muted tabular-nums">
                      {month.count}편
                    </span>
                  </summary>

                  <div className="pb-6">
                    {/* 되찾기에 필요한 것만 — 날짜·구분·제목. 읽기 시간은 여기서 고를 근거가 아니다. */}
                    <PostTable
                      posts={month.posts}
                      showCategory
                      showMeta={false}
                      caption={`${year}년 ${monthLabel(month.ym)} 발행 글`}
                    />
                  </div>
                </details>
              ))}
            </section>
          ))
        ) : (
          <p className="mt-6 text-sm text-muted">아직 발행한 글이 없습니다.</p>
        )}
      </div>
    </Container>
  );
}
