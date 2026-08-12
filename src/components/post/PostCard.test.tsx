import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { getCategory } from "@/lib/categories";
import type { Post } from "@/types/content";

import { PostCard } from "./PostCard";

const post: Post = {
  frontmatter: {
    title: "희소 어텐션 스케일링 법칙",
    category: "papers",
    summary: "긴 문맥에서 희소 어텐션이 밀집 어텐션을 따라잡는 조건을 정리했다.",
    // UTC 로는 전날(2026-08-08T15:30Z) — KST 표기가 유지되어야 한다.
    publishedAt: "2026-08-09T00:30:00+0900",
    tags: ["어텐션", "스케일링"],
    draft: false,
  },
  slug: "sparse-attention-scaling",
  category: "papers",
  body: "본문",
  filePath: "content/papers/2026-08-09-sparse-attention-scaling.mdx",
  readingMinutes: 7,
};

describe("PostCard", () => {
  it("제목·요약·KST 날짜를 그린다", () => {
    render(<PostCard post={post} />);

    expect(screen.getByText(post.frontmatter.title)).toBeTruthy();
    expect(screen.getByText(post.frontmatter.summary)).toBeTruthy();
    expect(screen.getByText("2026년 8월 9일")).toBeTruthy();
  });

  it("카드 전체가 /{category}/{slug} 로 가는 링크 하나다", () => {
    render(<PostCard post={post} />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute("href")).toBe(
      "/papers/sparse-attention-scaling",
    );
    // 제목이 링크 밖에 있으면 카드 일부만 눌리게 된다.
    expect(within(links[0]).getByText(post.frontmatter.title)).toBeTruthy();
  });

  it("showCategory 일 때만 카테고리 배지를 붙인다", () => {
    const categoryName = getCategory(post.category)!.name;

    const { unmount } = render(<PostCard post={post} />);
    expect(screen.queryByText(categoryName)).toBeNull();
    unmount();

    render(<PostCard post={post} showCategory />);
    expect(screen.getByText(categoryName)).toBeTruthy();
  });
});
