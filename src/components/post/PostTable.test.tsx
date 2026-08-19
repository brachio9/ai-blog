import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Post } from "@/types/content";

import { PostTable } from "./PostTable";

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    frontmatter: {
      title: "희소 어텐션 스케일링 법칙",
      category: "papers",
      axis: "serving",
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
  it("제목이 /posts/{slug} 링크이고 KST 날짜를 보인다", () => {
    render(<PostTable posts={[post]} />);

    const link = screen.getByRole("link", { name: post.frontmatter.title });
    expect(link.getAttribute("href")).toBe("/posts/sparse-attention-scaling");
    expect(screen.getByText("2026.08.09")).toBeTruthy();
  });

  it("카테고리를 색만이 아니라 짧은 이름 텍스트로도 알린다", () => {
    const { container } = render(<PostTable posts={[post]} showCategory />);

    expect(screen.getByText("논문")).toBeTruthy();
    // 색은 항목 바깥의 .cat-* 가 정하는 --cat 에서 온다. accent 키가 그 짝이다.
    expect(container.querySelector(".entry")?.className).toContain("cat-papers");
  });

  it("제목의 왼쪽 끝이 흔들리지 않도록 레일이 폭을 잡는다", () => {
    const { container } = render(<PostTable posts={[post]} showIdentifier />);

    // 레일 폭은 --rail 고정이다. 날짜와 식별자가 같은 레일 안에 들어가야 한다.
    const rail = container.querySelector(".entry-rail");
    expect(rail?.textContent).toContain("2026.08.09");
    expect(rail?.textContent).toContain("arXiv:2607.04512");
  });

  it("showIdentifier 일 때만 arXiv ID 를 보인다", () => {
    const { unmount } = render(<PostTable posts={[post]} showIdentifier />);
    expect(screen.getByText("arXiv:2607.04512")).toBeTruthy();
    unmount();

    render(<PostTable posts={[post]} />);
    expect(screen.queryByText(/arXiv:/)).toBeNull();
  });

  it("요약은 showSummary 를 켠 화면에서만 실린다", () => {
    const { unmount } = render(<PostTable posts={[post]} />);
    expect(screen.queryByText(post.frontmatter.summary)).toBeNull();
    unmount();

    render(<PostTable posts={[post]} showSummary />);
    expect(screen.getByText(post.frontmatter.summary)).toBeTruthy();
  });

  it("조회수를 못 받으면 라벨째 사라진다 — 빈 자리를 남기지 않는다", () => {
    const { container } = render(<PostTable posts={[post]} reserveViews />);

    // <ViewCounts> 밖이라 값이 없다. 메타 줄에는 읽기 시간만 남아야 한다.
    expect(container.querySelector(".entry-meta")?.textContent).toBe("7분");
  });

  it("되찾기용 목록은 메타 줄을 떼어 낸다 — 밀도는 무엇을 싣는가로도 정해진다", () => {
    const { container } = render(<PostTable posts={[post]} showMeta={false} />);

    expect(container.querySelector(".entry-meta")).toBeNull();
    // 제목은 남는다 — 뺀 것은 고르는 근거가 아닌 값뿐이다.
    expect(screen.getByRole("link", { name: post.frontmatter.title })).toBeTruthy();
  });

  it("목록에 접근 가능한 이름을 붙인다", () => {
    render(<PostTable posts={[post]} caption="최신 논문" />);

    expect(screen.getByRole("list", { name: "최신 논문" })).toBeTruthy();
  });
});
