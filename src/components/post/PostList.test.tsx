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
    title: "논문 해설",
    summary: "요약",
    publishedAt: "2026-08-05T10:00:00+0900",
    tags: ["vLLM"],
    readingMinutes: 6,
    format: "explainer",
  },
  {
    slug: "plain",
    category: "news",
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

describe("PostList 의 ?format= 필터", () => {
  beforeEach(() => {
    query.current = "";
  });

  it("포맷이 없으면 전부 그린다", () => {
    render(<PostList items={items} basePath={BASE_PATH} />);

    for (const item of items) {
      expect(screen.getByRole("link", { name: item.title })).toBeTruthy();
    }
  });

  it("고른 포맷의 글만 남긴다 — 포맷이 없는 글도 함께 빠진다", () => {
    query.current = "format=replication";
    render(<PostList items={items} basePath={BASE_PATH} />);

    expect(screen.getByRole("link", { name: "직접 재 본 기록" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "논문 해설" })).toBeNull();
    expect(screen.queryByRole("link", { name: "포맷 없는 글" })).toBeNull();
  });

  it("켜진 포맷을 이름으로 알리고 끄는 길을 준다 — 태그는 유지한다", () => {
    query.current = "tag=vLLM&format=replication";
    render(<PostList items={items} basePath={BASE_PATH} />);

    // slug 가 아니라 사람이 읽는 이름으로 보인다 (src/lib/formats.ts).
    expect(screen.getByText("재현 검증")).toBeTruthy();

    const cleared = queryOf("포맷 해제");
    expect(cleared.get("format")).toBeNull();
    expect(cleared.get("tag")).toBe("vLLM");
  });

  it("태그를 갈아 끼워도 포맷 필터가 풀리지 않는다", () => {
    query.current = "format=explainer";
    render(<PostList items={items} basePath={BASE_PATH} />);

    const chip = queryOf(/^vLLM/);
    expect(chip.get("tag")).toBe("vLLM");
    expect(chip.get("format")).toBe("explainer");
  });

  it("태그 칩은 포맷으로 좁힌 뒤에 센다 — 고른 순간 빈 목록이 나오면 안 된다", () => {
    query.current = "format=explainer";
    render(<PostList items={items} basePath={BASE_PATH} />);

    // 'MCP' 는 포맷이 없는 글에만 붙어 있다.
    expect(screen.queryByRole("link", { name: /^MCP/ })).toBeNull();
  });

  it("비었으면 무엇으로 좁혀서 비었는지 말한다", () => {
    query.current = "tag=MCP&format=explainer";
    render(<PostList items={items} basePath={BASE_PATH} />);

    expect(
      screen.getByText("기술 해설 · 'MCP' 태그에 해당하는 글이 없습니다."),
    ).toBeTruthy();
  });

  it("모르는 포맷도 slug 그대로 되읽어 준다 — 빈 목록의 이유가 사라지면 안 된다", () => {
    query.current = "format=없는포맷";
    render(<PostList items={items} basePath={BASE_PATH} />);

    expect(
      screen.getByText("없는포맷에 해당하는 글이 없습니다."),
    ).toBeTruthy();
  });

  it("페이지 링크가 포맷을 떨어뜨리지 않는다", () => {
    const many: PostListItem[] = Array.from({ length: 12 }, (_, index) => ({
      ...items[1],
      slug: `explained-${index}`,
      title: `논문 해설 ${index}`,
    }));

    query.current = "format=explainer";
    render(<PostList items={many} basePath={BASE_PATH} />);

    const next = queryOf("다음");
    expect(next.get("page")).toBe("2");
    expect(next.get("format")).toBe("explainer");
  });
});
