import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CATEGORIES, type Category } from "@/lib/categories";
import type { Post, PostFrontmatter } from "@/types/content";

import { PostHeader } from "./PostHeader";

function categoryOf(slug: string): Category {
  const found = CATEGORIES.find((category) => category.slug === slug);
  if (!found) {
    throw new Error(`테스트 픽스처의 카테고리가 없다: ${slug}`);
  }
  return found;
}

function makePost(frontmatter: Partial<PostFrontmatter> = {}): Post {
  return {
    frontmatter: {
      title: "희소 어텐션은 어디까지 버티는가",
      category: "papers",
      summary: "희소성 예산 하나로 정리한 논문.",
      publishedAt: "2026-07-18T09:30:00+0900",
      tags: ["LLM", "어텐션"],
      draft: false,
      lead: false,
      paper: {
        arxivId: "2607.04512",
        authors: ["L. Amari", "R. Okonkwo", "J. Park"],
      },
      ...frontmatter,
    },
    slug: "sparse-attention-scaling",
    category: frontmatter.category ?? "papers",
    body: "",
    filePath: "content/papers/2026-07-18-sparse-attention-scaling.mdx",
    readingMinutes: 5,
  };
}

describe("PostHeader", () => {
  it("논문 글은 arXiv ID 와 저자를 머리에서 바로 보인다", () => {
    render(<PostHeader post={makePost()} category={categoryOf("papers")} />);

    expect(screen.getByText("arXiv:2607.04512")).toBeTruthy();
    expect(screen.getByText("L. Amari, R. Okonkwo, J. Park")).toBeTruthy();
  });

  it("논문이 아니면 arXiv 식별자 줄을 만들지 않는다", () => {
    const post = makePost({
      category: "hf-blog",
      title: "데이터셋 뷰어 개편",
      paper: undefined,
    });

    render(<PostHeader post={post} category={categoryOf("hf-blog")} />);

    expect(screen.queryByText(/arXiv:/)).toBeNull();
  });

  it("카테고리를 색만이 아니라 이름과 함께 보인다", () => {
    render(<PostHeader post={makePost()} category={categoryOf("papers")} />);

    const link = screen.getByRole("link", { name: "최신 논문" });
    expect(link.getAttribute("href")).toBe("/papers");
    // 색은 정보의 보강이지 정보 자체가 아니다 — 이름이 함께 있어야 한다.
    expect(link.className).toContain("text-cat-paper");
  });

  it("제목은 h1 이고 UI_GUIDE 스케일을 넘지 않는다", () => {
    render(<PostHeader post={makePost()} category={categoryOf("papers")} />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toBe("희소 어텐션은 어디까지 버티는가");
    expect(heading.className).toContain("font-serif");
    expect(heading.className).not.toMatch(/text-(4|5)xl/);
  });

  it("발행일과 읽기 시간을 한 줄로 묶는다", () => {
    render(<PostHeader post={makePost()} category={categoryOf("papers")} />);

    const published = screen.getByText(/발행 2026년 7월 18일/);
    expect(published.closest("p")?.textContent).toContain("읽기 5분");
    expect(screen.queryByText(/수정/)).toBeNull();
  });

  it("수정일이 있으면 같은 줄에 덧붙인다", () => {
    const post = makePost({ updatedAt: "2026-08-13T09:00:00+0900" });

    render(<PostHeader post={post} category={categoryOf("papers")} />);

    expect(screen.getByText(/수정 2026년 8월 13일/)).toBeTruthy();
  });

  it("조회수 자리는 넘겨받은 것을 그대로 그린다", () => {
    render(
      <PostHeader
        post={makePost()}
        category={categoryOf("papers")}
        views={<span>조회 128</span>}
      />,
    );

    expect(screen.getByText("조회 128")).toBeTruthy();
  });

  it("태그는 머리에 적지 않는다 — 우측 레일의 글 정보가 맡는다", () => {
    render(<PostHeader post={makePost()} category={categoryOf("papers")} />);

    expect(screen.queryByRole("link", { name: "LLM" })).toBeNull();
  });
});
