import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { DayHead } from "@/components/post/DayHead";
import { PostRow } from "@/components/post/PostRow";
import { SITE_NAME } from "@/lib/site";
import { postsByDay, postsByMonth } from "@/lib/stats";

/** `2026-08` → `2026년 8월`. 앞의 0 을 떼는 것은 화면 표기일 뿐 값은 그대로다. */
function monthLabel(ym: string): string {
  const [year, month] = ym.split("-");
  return `${year}년 ${Number(month)}월`;
}

export function generateStaticParams() {
  return postsByMonth().map((month) => ({ ym: month.ym }));
}

export async function generateMetadata(
  props: PageProps<"/archive/[ym]">,
): Promise<Metadata> {
  const { ym } = await props.params;
  const found = postsByMonth().find((month) => month.ym === ym);
  if (!found) {
    return {};
  }

  return {
    title: `${monthLabel(ym)} 아카이브`,
    description: `${monthLabel(ym)}에 실은 글 ${found.count}편.`,
    alternates: { canonical: `/archive/${ym}` },
  };
}

/**
 * 한 달치 — **일자별로 편다.**
 *
 * 옛 아카이브는 달마다 `<details>` 안에 그 달 글을 통째로 넣었다. 하루 20편이면 한 달이
 * 600편이고, 그것을 접었다 폈다 하는 아코디언은 되찾기 도구가 아니다
 * (`design/brief.md` 의 「글이 300편이 되면 아카이브는 어떻게 생겼는가」가 이 질문이었다).
 *
 * 여기는 **페이지네이션을 두지 않는다.** 되찾기가 유일한 목적인 지면이라 한 화면에 다 있는 편이
 * 낫다 — 600행이라도 정적 HTML 100KB 남짓이고, 그 위에서 브라우저 찾기(Ctrl-F)가 가장 빠른 도구다.
 * 쪽을 나누면 그 도구가 죽는다.
 */
export default async function ArchiveMonthPage(
  props: PageProps<"/archive/[ym]">,
) {
  const { ym } = await props.params;
  const month = postsByMonth().find((found) => found.ym === ym);
  if (!month) {
    notFound();
  }

  // 그 달에 속한 날만 남긴다. 날짜는 이미 최신순이다.
  const days = postsByDay().filter((day) => day.day.startsWith(ym));

  return (
    <Container>
      <div className="py-12 md:py-16">
        <header>
          <p className="kicker">{SITE_NAME} · 아카이브</p>
          <h1 className="mt-[var(--space-2)] text-[length:var(--text-h1)] font-semibold tracking-[-0.02em] text-heading">
            {monthLabel(ym)}
          </h1>
          <p className="voice-ui mt-[var(--space-2)] text-muted">
            <span className="voice-source">{month.count}</span>편 ·{" "}
            <span className="voice-source">{days.length}</span>일
          </p>
        </header>

        <div className="rule-pair mt-[var(--space-4)]" />

        {days.map((day) => (
          <section key={day.day} className="mt-[var(--space-5)]">
            <DayHead group={day} />
            <ul role="list" className="list-tight mt-[var(--space-2)]">
              {day.posts.map((post) => (
                <PostRow key={post.slug} post={post} />
              ))}
            </ul>
          </section>
        ))}

        <div className="rule-pair mt-[var(--space-6)]" />

        <nav
          aria-label="더 보기"
          className="mt-[var(--space-4)] flex flex-wrap gap-x-[var(--space-5)] gap-y-[var(--space-2)]"
        >
          <Link href="/archive" className="voice-ui text-muted hover:text-heading">
            다른 달 → 아카이브
          </Link>
          <Link href="/search" className="voice-ui text-muted hover:text-heading">
            말로 찾기 → 검색
          </Link>
        </nav>
      </div>
    </Container>
  );
}
