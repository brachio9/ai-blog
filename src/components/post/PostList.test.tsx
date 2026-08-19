import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PostList, type PostListItem } from "./PostList";

/** useSearchParams 는 라우터가 없는 테스트 환경에서 동작하지 않으므로 값을 갈아끼운다. */
const { query } = vi.hoisted(() => ({ query: { current: "" } }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(query.current),
}));

const BASE_PATH = "/topics/serving";

const items: PostListItem[] = [
  {
    slug: "measured",
    category: "notes",
    axis: "vibe-coding",
    title: "직접 재 본 기록",
    summary: "요약",
    publishedAt: "2026-08-09T10:00:00+0900",
    tags: ["vLLM"],
    readingMinutes: 4,
    format: "replication",
  },
  {
    slug: "explained",
    category: "papers",
    axis: "serving",
    title: "논문 해설",
    summary: "요약",
    publishedAt: "2026-08-05T10:00:00+0900",
    tags: ["vLLM"],
    readingMinutes: 6,
    format: "explainer",
  },
  {
    slug: "quantized",
    category: "papers",
    axis: "serving",
    title: "양자화 논문",
    summary: "요약",
    publishedAt: "2026-08-04T10:00:00+0900",
    tags: ["LoRA"],
    readingMinutes: 5,
  },
  {
    slug: "plain",
    category: "news",
    axis: "agent",
    title: "포맷 없는 글",
    summary: "요약",
    publishedAt: "2026-08-02T10:00:00+0900",
    tags: ["MCP"],
    readingMinutes: 3,
  },
];

/** 링크의 쿼리는 순서가 아니라 값으로 본다. */
function queryOf(name: string | RegExp): URLSearchParams {
  const href = screen.getByRole("link", { name }).getAttribute("href") ?? "";
  return new URL(href, "https://example.test").searchParams;
}

describe("PostList 의 조합 필터", () => {
  beforeEach(() => {
    query.current = "";
  });

  it("축·출처·태그를 함께 건다 — 지금까지는 한 번에 하나씩만 걸렸다", () => {
    query.current = "axis=serving&source=papers";

    render(<PostList items={items} basePath={BASE_PATH} />);

    expect(screen.getByRole("link", { name: /논문 해설/ })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /직접 재 본 기록/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /포맷 없는 글/ })).toBeNull();
  });

  it("한 조건을 갈아 끼워도 나머지는 지킨다", () => {
    query.current = "axis=serving&source=papers";

    render(<PostList items={items} basePath={BASE_PATH} />);

    // 출처 칩을 눌러도 축 조건은 그대로 남아야 한다.
    const params = queryOf("소식1");
    expect(params.get("axis")).toBe("serving");
    expect(params.get("source")).toBe("news");
  });

  it("고를 것이 하나뿐인 줄은 그리지 않는다 — 필터가 아니라 제목의 반복이다", () => {
    render(<PostList items={[items[0]]} basePath={BASE_PATH} />);

    expect(screen.queryByRole("navigation", { name: "주제 필터" })).toBeNull();
    expect(screen.queryByRole("navigation", { name: "출처 필터" })).toBeNull();
  });

  it("태그 칩은 축·출처로 좁힌 뒤에 센다 — 고른 순간 빈 목록이 나오면 안 된다", () => {
    // 전역 태그를 쓰면 지금 조건에 하나도 없는 태그가 칩으로 나오고, 누르면 빈 목록이 뜬다.
    query.current = "axis=serving";

    render(<PostList items={items} basePath={BASE_PATH} />);

    const tagNav = screen.getByRole("navigation", { name: "태그 필터" });
    expect(tagNav.textContent).toContain("vLLM");
    expect(tagNav.textContent).toContain("LoRA");
    expect(tagNav.textContent).not.toContain("MCP");
  });

  it("비었으면 무엇으로 좁혀서 비었는지 말한다", () => {
    query.current = "axis=agent&tag=vLLM";

    render(<PostList items={items} basePath={BASE_PATH} />);

    expect(screen.getByText(/에이전트·자동화 · 'vLLM' 태그.*없습니다/)).toBeTruthy();
  });

  it("페이지 링크가 필터를 떨어뜨리지 않는다", () => {
    query.current = "axis=serving";
    const many: PostListItem[] = Array.from({ length: 30 }, (_, index) => ({
      ...items[1],
      slug: `post-${index}`,
      title: `글 ${index}`,
    }));

    render(<PostList items={many} basePath={BASE_PATH} />);

    expect(queryOf("다음").get("axis")).toBe("serving");
    expect(queryOf("다음").get("page")).toBe("2");
  });

  it("모르는 축도 slug 그대로 되읽어 준다 — 빈 목록의 이유가 사라지면 안 된다", () => {
    query.current = "axis=없는축";

    render(<PostList items={items} basePath={BASE_PATH} />);

    expect(screen.getByText(/없는축.*없습니다/)).toBeTruthy();
  });
});
