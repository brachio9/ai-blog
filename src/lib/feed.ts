/**
 * RSS·검색 인덱스 생성. 라우트에서 로직을 떼어내 테스트 가능하게 둔다.
 * 두 산출물 모두 요약(summary)까지만 담는다 — 본문 전문을 실으면 인덱스가 커져
 * 클라이언트 검색(ADR-007)의 초기 로딩이 무너진다.
 */
import type { CategorySlug } from "@/lib/categories";
import type { Post } from "@/types/content";

import { SITE_DESCRIPTION, SITE_NAME } from "./site";

export interface SearchDoc {
  /** `${category}/${slug}` — 카테고리가 달라도 slug 가 겹칠 수 있다. */
  id: string;
  title: string;
  summary: string;
  category: CategorySlug;
  slug: string;
  tags: string[];
  publishedAt: string;
  /** 아래 둘은 검색 대상이 아니라 결과를 PostList 로 그리기 위한 값이다. */
  readingMinutes: number;
  cover?: string;
}

/** `&` 를 먼저 바꿔야 뒤에 만든 엔티티를 두 번 이스케이프하지 않는다. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** RSS 의 pubDate 는 RFC 822. toUTCString() 이 그 형식을 그대로 준다. */
function toRfc822(iso: string): string {
  return new Date(iso).toUTCString();
}

export function buildSearchIndex(posts: Post[]): SearchDoc[] {
  return posts.map((post) => {
    const { frontmatter } = post;

    return {
      id: `${post.category}/${post.slug}`,
      title: frontmatter.title,
      summary: frontmatter.summary,
      category: post.category,
      slug: post.slug,
      tags: frontmatter.tags,
      publishedAt: frontmatter.publishedAt,
      readingMinutes: post.readingMinutes,
      ...(frontmatter.cover ? { cover: frontmatter.cover } : {}),
    };
  });
}

export function buildRssXml(posts: Post[], siteUrl: string): string {
  const base = siteUrl.replace(/\/+$/, "");

  // 채널의 마지막 갱신 시각 = 가장 최신 글. 빌드 시각을 쓰면 내용이 그대로여도 매 빌드 달라진다.
  const lastBuildDate = posts[0]
    ? `\n    <lastBuildDate>${toRfc822(posts[0].frontmatter.publishedAt)}</lastBuildDate>`
    : "";

  const items = posts
    .map((post) => {
      const { frontmatter } = post;
      const url = `${base}/${post.category}/${post.slug}`;

      return `    <item>
      <title>${escapeXml(frontmatter.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <description>${escapeXml(frontmatter.summary)}</description>
      <pubDate>${toRfc822(frontmatter.publishedAt)}</pubDate>
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_NAME)}</title>
    <link>${escapeXml(base)}</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>ko</language>${lastBuildDate}
    <atom:link href="${escapeXml(`${base}/rss.xml`)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}
