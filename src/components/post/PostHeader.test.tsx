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
      summary:
        "희소성 예산 하나로 정리한 논문. 잘라내는 위치보다 남기는 총량이 성능을 결정한다고 주장한다.",
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
  it("논문 글은 arXiv 식별자를 데이트라인에 남긴다", () => {
    render(<PostHeader post={makePost()} category={categoryOf("papers")} />);

    expect(screen.getByText("arXiv:2607.04512")).toBeTruthy();
    // 저자·라이선스·원문 제목은 출처 표기(SourceNote)가 맡는다 — 같은 것을 두 번 적지 않는다.
    expect(screen.queryByText(/L\. Amari/)).toBeNull();
  });

  it("논문이 아니면 arXiv 식별자를 만들지 않는다", () => {
    const post = makePost({
      category: "hf-blog",
      title: "데이터셋 뷰어 개편",
      paper: undefined,
    });

    render(<PostHeader post={post} category={categoryOf("hf-blog")} />);

    expect(screen.queryByText(/arXiv:/)).toBeNull();
  });

  it("카테고리를 색만이 아니라 이름과 함께 보인다", () => {
    const { container } = render(
      <PostHeader post={makePost()} category={categoryOf("papers")} />,
    );

    const link = screen.getByRole("link", { name: "논문" });
    expect(link.getAttribute("href")).toBe("/papers");
    // 색은 정보의 보강이지 정보 자체가 아니다 — 이름이 함께 있어야 한다.
    expect(link.className).toContain("cat-label");
    // 안료는 클래스로만 들어온다. 값은 globals.css 의 --cat 이 정한다.
    expect(container.querySelector("header")?.className).toContain("cat-papers");
  });

  it("표제는 h1 이고 1면의 머리기사와 달리 척도 안(--text-h1)에 선다", () => {
    render(<PostHeader post={makePost()} category={categoryOf("papers")} />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toBe("희소 어텐션은 어디까지 버티는가");
    expect(heading.className).toContain("headline");
    expect(heading.className).toContain("var(--text-h1)");
  });

  it("요약을 부제와 리드로 가른다 — 1면과 같은 규칙이다", () => {
    const { container } = render(
      <PostHeader post={makePost()} category={categoryOf("papers")} />,
    );

    expect(container.querySelector(".deck")?.textContent).toBe(
      "희소성 예산 하나로 정리한 논문.",
    );
    expect(container.querySelector(".lede")?.textContent).toBe(
      "잘라내는 위치보다 남기는 총량이 성능을 결정한다고 주장한다.",
    );
  });

  it("한 문장짜리 요약에는 없는 리드를 지어내지 않는다", () => {
    const post = makePost({ summary: "희소성 예산 하나로 정리한 논문." });

    const { container } = render(
      <PostHeader post={post} category={categoryOf("papers")} />,
    );

    expect(container.querySelector(".lede")).toBeNull();
  });

  it("발행일과 읽기 시간을 데이트라인에 묶는다", () => {
    const { container } = render(
      <PostHeader post={makePost()} category={categoryOf("papers")} />,
    );

    const dateline = container.querySelector(".dateline");
    expect(dateline?.textContent).toContain("2026.07.18");
    expect(dateline?.textContent).toContain("읽기 5분");
  });

  it("수정일은 머리에 적지 않는다 — 정정(Correction)이 기사 끝에서 맡는다", () => {
    const post = makePost({ updatedAt: "2026-08-13T09:00:00+0900" });

    render(<PostHeader post={post} category={categoryOf("papers")} />);

    expect(screen.queryByText(/2026\.08\.13/)).toBeNull();
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

  it("넘겨받은 추린 비율을 데이트라인의 한 조각으로 적는다", () => {
    const { container } = render(
      <PostHeader
        post={makePost()}
        category={categoryOf("papers")}
        ratio={{ ratio: 14, bodyChars: 580, sourceWords: 3240 }}
      />,
    );

    expect(container.querySelector(".ratio")?.textContent).toBe("14:1");
  });

  it("원문 단어 수가 없으면 비율 자리를 비운다", () => {
    const { container } = render(
      <PostHeader
        post={makePost()}
        category={categoryOf("papers")}
        ratio={null}
      />,
    );

    expect(container.querySelector(".ratio")).toBeNull();
  });

  it("괘선 쌍은 머리와 본문 사이 한 번뿐이다", () => {
    const { container } = render(
      <PostHeader post={makePost()} category={categoryOf("papers")} />,
    );

    expect(container.querySelectorAll(".rule-pair")).toHaveLength(1);
  });

  it("태그는 머리에 적지 않는다 — 우측 레일의 글 정보가 맡는다", () => {
    render(<PostHeader post={makePost()} category={categoryOf("papers")} />);

    expect(screen.queryByRole("link", { name: "LLM" })).toBeNull();
  });
});
