import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Post } from "@/types/content";

import { PostBrief } from "./PostBrief";

function makePost(): Post {
  return {
    frontmatter: {
      title: "추론 엔드포인트 CLI 가 정식으로 나왔다",
      category: "hf-blog",
      summary: "터미널에서 엔드포인트를 만들고 지우는 명령이 정식 배포됐다.",
      // UTC 로는 전날이다 — KST 표기가 유지되어야 한다.
      publishedAt: "2026-07-25T00:30:00+0900",
      tags: ["도구"],
      draft: false,
      lead: false,
    },
    slug: "inference-endpoints-cli",
    category: "hf-blog",
    body: "",
    filePath: "content/hf-blog/2026-07-25-inference-endpoints-cli.mdx",
    readingMinutes: 3,
  };
}

describe("PostBrief", () => {
  it("날짜·구분·제목 한 줄이다. 날짜는 연도를 뗀 KST 표기다", () => {
    render(
      <ul>
        <PostBrief post={makePost()} />
      </ul>,
    );

    expect(screen.getByText("07.25")).toBeTruthy();
    // 밀집 목록의 구분에는 짧은 이름을 쓴다 (docs/PRD.md).
    expect(screen.getByText("소식")).toBeTruthy();

    const link = screen.getByRole("link", {
      name: "추론 엔드포인트 CLI 가 정식으로 나왔다",
    });
    expect(link.getAttribute("href")).toBe("/hf-blog/inference-endpoints-cli");
  });

  it("요약을 싣지 않는다 — 단신은 한 줄이다", () => {
    const post = makePost();
    const { container } = render(
      <ul>
        <PostBrief post={post} />
      </ul>,
    );

    expect(container.textContent).not.toContain(post.frontmatter.summary);
    expect(container.querySelector(".brief-item")?.className).toContain(
      "cat-news",
    );
  });
});
