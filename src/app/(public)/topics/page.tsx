import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { PostRow } from "@/components/post/PostRow";
import { AXES, axisHref, axisNumber } from "@/lib/axes";
import { getPostsByAxis } from "@/lib/content/posts";
import { SITE_NAME } from "@/lib/site";
import { countByAxis } from "@/lib/stats";

const TOPICS_PATH = "/topics";

/** 축마다 맛보기로 싣는 편수. 색인면이라 이 이상은 축 페이지의 몫이다. */
const RECENT_COUNT = 3;

// 루트 레이아웃의 title.template 이 " | {SITE_NAME}" 을 붙인다.
export const metadata: Metadata = {
  title: "주제",
  description:
    "이 사이트가 다루는 여섯 갈래. 무엇을 싣고 무엇을 빼는지가 여기서 정해집니다.",
  alternates: { canonical: TOPICS_PATH },
};

/**
 * 주제 색인 — 이 매체의 지도다. 글은 축을 하나만 갖고 축은 여섯뿐이라
 * 여섯 편수의 합이 곧 전체 글 수이고, 그래서 **0편인 축도 자리를 지킨다.**
 * 빈 축은 감출 것이 아니라 무엇을 더 실어야 하는지 알리는 정보다.
 *
 * 축에는 안료를 주지 않는다 (docs/UI_GUIDE.md). 부호는 레일의 두 자리 번호다 —
 * 안료 3색은 카테고리 전용이고 네 번째 안료는 사실상 없다.
 */
export default function TopicsPage() {
  const counts = new Map(countByAxis().map(({ slug, count }) => [slug, count]));
  const entries = AXES.map((axis) => ({
    axis,
    count: counts.get(axis.slug) ?? 0,
    recent: getPostsByAxis(axis.slug).slice(0, RECENT_COUNT),
  }));
  const total = entries.reduce((sum, entry) => sum + entry.count, 0);
  // 0 으로 나누지 않는다. 글이 없으면 막대가 전부 비어 있는 것이 맞다.
  const widest = Math.max(0, ...entries.map((entry) => entry.count));

  return (
    <Container>
      {/* 위쪽 여백은 .masthead 가 이미 갖고 있다. */}
      <div className="pb-12 md:pb-16">
        {/* 카테고리 목록은 아래를 얇은 선으로 닫지만 색인면은 굵은선/얇은선 쌍으로 연다 —
            두 화면이 나란히 놓였을 때 구분되어야 한다 (design/brief.md 파격 예산). */}
        <header className="masthead">
          <p className="voice-ui text-muted">{SITE_NAME} · 색인</p>
          <h1
            className="masthead-title mt-[var(--space-1)] text-heading"
            style={{ fontSize: "var(--text-h1)" }}
          >
            주제
          </h1>
          <p className="masthead-line">
            영문 원문을 여섯 갈래로 좁혀 싣습니다. 글마다 축은 하나뿐이라 아래
            여섯 편수의 합이 곧 전체입니다 — 비어 있는 축은 아직 다루지 않았다는
            뜻이고, 그것도 이 지도가 알리는 것입니다.
          </p>

          <div className="masthead-meta">
            <span className="voice-ui text-muted">
              <span className="voice-source">{AXES.length}</span>축
            </span>
            <span className="voice-ui text-muted">
              <span className="voice-source">{total}</span>편
            </span>
          </div>
        </header>

        <div className="rule-pair" />

        {/* 분포 표 — **여섯 칸을 균등하게 그리는 것은 거짓말이다.** 실측으로 서빙 21 · 도메인 3 이라
            같은 크기로 늘어놓으면 「고르게 다룬다」는 인상만 남는다. 번호 순서는 지키고
            (번호는 순위가 아니라 신원이라 레일의 부호로 쓰려면 고정이어야 한다)
            **길이로** 차이를 말한다. 막대에는 안료를 쓰지 않는다 — 축에 색을 주지 않는 규칙이다. */}
        <ul
          role="list"
          aria-label="갈래별 분량"
          className="list-tight mb-[var(--space-5)]"
        >
          {entries.map(({ axis, count }) => (
            <li
              key={axis.slug}
              className="grid grid-cols-[2.4em_1fr] items-baseline gap-x-[var(--space-3)] py-[2px] sm:grid-cols-[2.4em_9em_1fr_5em]"
            >
              <span className="voice-source text-muted">{axisNumber(axis)}</span>
              <Link
                href={axisHref(axis)}
                className="text-[length:var(--text-small)] text-heading underline-offset-[0.2em] hover:underline focus-visible:outline-2 focus-visible:outline-focus"
              >
                {axis.name}
              </Link>
              <span className="count-bar col-span-2 mt-[3px] sm:col-span-1 sm:mt-0" aria-hidden>
                <i style={{ width: `${widest > 0 ? (count / widest) * 100 : 0}%` }} />
              </span>
              <span className="voice-ui col-span-2 text-muted sm:col-span-1 sm:text-right">
                <span className="voice-source">{count}</span>편{" "}
                <span className="voice-source">
                  {total > 0 ? Math.round((count / total) * 100) : 0}
                </span>
                %
              </span>
            </li>
          ))}
        </ul>

        {/* 색인면이므로 항목 간격은 좁게 연다 — 여섯을 한눈에 훑는 것이 이 화면의 일이다. */}
        <ul role="list" aria-label="주제 축" className="list-tight">
          {entries.map(({ axis, count, recent }) => (
            <li key={axis.slug} className="entry">
              {/* 축의 부호. 레일 폭이 고정이라 번호를 키워도 이름의 왼쪽 끝은 흔들리지 않는다.
                  .voice-source 는 레이어 밖이라 유틸리티로 못 덮는다 — 크기는 인라인으로 얹는다. */}
              <div
                className="entry-rail voice-source"
                style={{ fontSize: "var(--text-h2)" }}
              >
                {axisNumber(axis)}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-[var(--space-3)]">
                  <Link
                    href={axisHref(axis)}
                    className="entry-title underline-offset-[0.2em] hover:underline focus-visible:outline-2 focus-visible:outline-focus"
                  >
                    {axis.name}
                  </Link>
                  <span className="voice-ui text-muted">
                    <span className="voice-source">{count}</span>편
                  </span>
                </div>

                {/* 축이 하는 약속. 0편인 축에도 이 문장은 남아 자리를 지킨다. */}
                <p className="mt-[var(--space-1)] max-w-[54ch] text-[length:var(--text-small)] leading-[var(--leading-tight)] text-body">
                  {axis.description}
                </p>

                {/* 무엇을 이 축으로 보는지. 태그가 아니라 예시라 링크로 걸지 않는다. */}
                <p className="voice-ui mt-[var(--space-2)] max-w-[54ch] text-muted">
                  {axis.covers.join(" · ")}
                </p>

                {recent.length > 0 ? (
                  <ul
                    role="list"
                    aria-label={`${axis.name} 최근 글`}
                    className="mt-[var(--space-2)]"
                  >
                    {recent.map((post) => (
                      <PostRow
                        key={post.slug}
                        post={post}
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="voice-ui mt-[var(--space-2)] text-muted">
                    아직 실린 글이 없습니다. 다음에 채울 자리입니다.
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Container>
  );
}
