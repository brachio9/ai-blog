import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Post } from "@/types/content";

import { PostTable } from "./PostTable";

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    frontmatter: {
      title: "희소 어텐션 스케일링 법칙",
      category: "papers",
      summary: "긴 문맥에서 희소 어텐션이 밀집 어텐션을 따라잡는 조건을 정리했다.",
      // UTC 로는 전날(2026-08-08T15:30Z) — KST 표기가 유지되어야 한다.
      publishedAt: "2026-08-09T00:30:00+0900",
      tags: ["어텐션", "스케일링"],
      draft: false,
      lead: false,
      paper: { arxivId: "2607.04512", authors: ["김한나", "이도현"] },
      ...overrides.frontmatter,
    },
    slug: "sparse-attention-scaling",
    category: "papers",
    body: "본문",
    filePath: "content/papers/2026-08-09-sparse-attention-scaling.mdx",
    readingMinutes: 7,
    ...overrides,
  };
}

const post = makePost();

describe("PostTable", () => {
  it("제목이 /{category}/{slug} 링크이고 KST 날짜를 보인다", () => {
    render(<PostTable posts={[post]} />);

    const link = screen.getByRole("link", { name: post.frontmatter.title });
    expect(link.getAttribute("href")).toBe("/papers/sparse-attention-scaling");
    // 접힌 메타 줄에도 같은 날짜가 들어가므로 하나만 있다고 보지 않는다.
    expect(screen.getAllByText("2026.08.09").length).toBeGreaterThan(0);
  });

  it("카테고리를 색만이 아니라 짧은 이름 텍스트로도 알린다", () => {
    render(<PostTable posts={[post]} showCategory />);

    const labels = screen.getAllByText("논문");
    expect(labels.length).toBeGreaterThan(0);
    // 색은 globals.css 의 --cat-* 토큰에서 온다. accent 키가 그 짝이다.
    expect(labels[0].className).toContain("text-cat-paper");
  });

  it("showIdentifier 일 때만 arXiv ID 를 보인다", () => {
    const { unmount } = render(<PostTable posts={[post]} showIdentifier />);
    expect(screen.getAllByText("arXiv:2607.04512").length).toBeGreaterThan(0);
    unmount();

    render(<PostTable posts={[post]} />);
    expect(screen.queryByText(/arXiv:/)).toBeNull();
  });

  it("요약을 목록에 그리지 않는다", () => {
    render(<PostTable posts={[post]} showCategory showIdentifier />);

    // 요약이 들어가면 줄 수가 글마다 달라져 행 높이가 갈린다.
    expect(screen.queryByText(post.frontmatter.summary)).toBeNull();
  });

  it("reserveViews 면 값이 없어도 조회 열이 자리를 지킨다", () => {
    render(<PostTable posts={[post]} showCategory reserveViews />);

    const headers = screen.getAllByRole("columnheader");
    expect(headers.at(-1)?.textContent).toBe("조회");

    // step 4 가 값을 채운다. 지금은 비어 있어도 열 수가 머리글과 맞아야 한다.
    const bodyRow = screen.getAllByRole("row")[1];
    expect(bodyRow.querySelectorAll("td")).toHaveLength(headers.length);
    expect(bodyRow.querySelectorAll("td").item(headers.length - 1).textContent).toBe(
      "",
    );
  });

  it("reserveViews 가 꺼지면 조회 열 자체가 없다", () => {
    render(<PostTable posts={[post]} showCategory />);

    expect(screen.queryByRole("columnheader", { name: "조회" })).toBeNull();
  });

  it("표에 접근 가능한 이름을 붙인다", () => {
    render(<PostTable posts={[post]} caption="최신 논문" />);

    expect(screen.getByRole("table", { name: "최신 논문" })).toBeTruthy();
  });
});
