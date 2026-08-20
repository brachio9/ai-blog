import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { CAT_CLASS, CATEGORIES, categoryHref } from "@/lib/categories";
import { SITE_NAME } from "@/lib/site";
import { countByCategory } from "@/lib/stats";

const SOURCES_PATH = "/sources";

// 루트 레이아웃의 title.template 이 " | {SITE_NAME}" 을 붙인다.
export const metadata: Metadata = {
  title: "출처",
  description: "글의 원문이 어디서 왔는지에 따라 나눈 다섯 칸.",
  alternates: { canonical: SOURCES_PATH },
};

/**
 * 출처 색인 — **원문이 어디서 왔는가**로 나눈 다섯 칸이다.
 *
 * 이 칸은 글의 성격이 아니라 **출처**를 말한다. 무엇에 대한 글인지는 주제 여섯이 맡는다.
 * 그래서 상단 메뉴에서 다섯 칸을 늘어놓는 대신 이 한 장을 두었다 — 메뉴에는 편수를 적을
 * 자리가 없어서 「커뮤니티」라는 낱말만으로는 4편인지 400편인지 알 수 없었다.
 * 여기서는 막대와 숫자가 그 답을 같이 준다.
 *
 * 안료는 그대로 쓴다. 카테고리에서 색을 거두는 개편이 아니라 **자리를 옮기는** 개편이다.
 */
export default function SourcesPage() {
  const counts = new Map(
    countByCategory().map(({ slug, count }) => [slug, count]),
  );
  const entries = CATEGORIES.map((category) => ({
    category,
    count: counts.get(category.slug) ?? 0,
  }));
  const total = entries.reduce((sum, entry) => sum + entry.count, 0);
  // 0 으로 나누지 않는다. 글이 하나도 없으면 막대가 전부 비어 있는 것이 맞다.
  const widest = Math.max(1, ...entries.map((entry) => entry.count));

  return (
    <Container>
      <div className="py-12 md:py-16">
        <header>
          <p className="kicker">{SITE_NAME} · 출처</p>
          <h1 className="mt-[var(--space-2)] text-[length:var(--text-h1)] font-semibold tracking-[-0.02em] text-heading">
            출처
          </h1>
          <p className="mt-[var(--space-3)] max-w-[var(--measure)] text-muted">
            원문이 어디서 왔는지에 따라 다섯 칸으로 나눕니다. 무엇에 대한 글인지는{" "}
            <Link href="/topics" className="underline underline-offset-4">
              주제 여섯 갈래
            </Link>
            가 맡습니다.
          </p>
          <p className="voice-source mt-[var(--space-2)] text-muted">
            전체 {total}편
          </p>
        </header>

        <div className="rule-pair mt-[var(--space-5)]" />

        <ul role="list" className="list-tight mt-[var(--space-5)]">
          {entries.map(({ category, count }) => (
            <li
              key={category.slug}
              className={`entry ${CAT_CLASS[category.accent]}`}
            >
              <div className="entry-rail">
                <span className="voice-source">{count}편</span>
              </div>
              <div className="min-w-0">
                <Link href={categoryHref(category)} className="entry-title">
                  {category.name}
                </Link>
                {/* 막대는 안료를 쓰지 않는다 — 라벨의 안료와 다투지 않게 한다. */}
                <div
                  className="count-bar mt-[var(--space-2)] max-w-[240px]"
                  aria-hidden
                >
                  <i style={{ width: `${(count / widest) * 100}%` }} />
                </div>
                <p className="mt-[var(--space-2)] max-w-[var(--measure)] text-[length:var(--text-small)] text-muted">
                  {category.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Container>
  );
}
