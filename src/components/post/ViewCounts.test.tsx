import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  PopularPosts,
  rankByViews,
  ViewCell,
  ViewCounts,
} from "./ViewCounts";

const A = "papers/moe-routing";
const B = "notes/quantization";
const C = "hf-blog/open-weights";

const fetchMock = vi.fn();

function respond(views: Record<string, number>): void {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ views }) });
}

/** 표 밖에서도 값이 같으므로 셀 내용만 확인한다. */
function cells(ids: string[]) {
  return (
    <ViewCounts ids={ids}>
      {ids.map((id) => (
        <span key={id} data-testid={id}>
          <ViewCell postId={id} />
        </span>
      ))}
    </ViewCounts>
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("rankByViews", () => {
  const posts = [
    { postId: A, title: "MoE" },
    { postId: B, title: "양자화" },
    { postId: C, title: "공개 가중치" },
  ];

  it("조회수 내림차순으로 자르고 순위를 준다", () => {
    expect(rankByViews(posts, { [A]: 3, [B]: 10, [C]: 5 }, 2)).toEqual([
      { postId: B, title: "양자화", count: 10 },
      { postId: C, title: "공개 가중치", count: 5 },
    ]);
  });

  it("기록이 없는(0) 글은 순위에 넣지 않는다", () => {
    expect(rankByViews(posts, { [A]: 0, [B]: 4 }, 3)).toEqual([
      { postId: B, title: "양자화", count: 4 },
    ]);
  });

  it("동률은 postId 코드포인트순으로 갈린다 (환경마다 순서가 달라지면 안 된다)", () => {
    const ranked = rankByViews(posts, { [A]: 5, [B]: 5, [C]: 5 }, 3);

    expect(ranked.map((post) => post.postId)).toEqual([C, B, A]);
  });

  it("조회수를 못 받았으면 빈 목록이다", () => {
    expect(rankByViews(posts, null, 3)).toEqual([]);
  });
});

describe("ViewCounts", () => {
  it("여러 글이어도 배치 호출 한 번으로 각 칸을 채운다", async () => {
    respond({ [A]: 1234, [B]: 42 });

    render(cells([A, B]));

    expect(await screen.findByText("1,234")).toBeTruthy();
    expect(screen.getByTestId(B).textContent).toBe("42");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      `/api/views?ids=${encodeURIComponent(`${A},${B}`)}`,
    );
  });

  it("목록에서는 조회수를 증가시키지 않는다 — GET 뿐이다", async () => {
    respond({ [A]: 3 });

    render(cells([A]));

    await screen.findByText("3");
    // fetch 두 번째 인자가 없으면 GET 이다.
    expect(fetchMock.mock.calls[0][1]).toBeUndefined();
  });

  it("같은 id 를 두 번 넘겨도 한 번만 물어본다", async () => {
    respond({ [A]: 5 });

    render(
      <ViewCounts ids={[A, A]}>
        <ViewCell postId={A} />
      </ViewCounts>,
    );

    await screen.findByText("5");
    expect(fetchMock.mock.calls[0][0]).toBe(
      `/api/views?ids=${encodeURIComponent(A)}`,
    );
  });

  it("채울 칸이 없으면(빈 목록) 아무것도 부르지 않는다", () => {
    render(
      <ViewCounts ids={[]}>
        <span>목록</span>
      </ViewCounts>,
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("요청이 실패해도 칸만 비고 목록은 그대로다", async () => {
    fetchMock.mockRejectedValue(new Error("네트워크 실패"));

    render(cells([A]));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.getByTestId(A).textContent).toBe("");
  });

  it("응답이 200 이 아니면 아무것도 그리지 않는다", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    render(cells([A]));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.getByTestId(A).textContent).toBe("");
  });

  it("기록이 없으면(0) 0 을 그리지 않는다", async () => {
    respond({ [A]: 0 });

    render(cells([A]));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.getByTestId(A).textContent).toBe("");
  });
});

describe("PopularPosts", () => {
  const posts = [
    { postId: A, title: "MoE 라우팅" },
    { postId: B, title: "양자화 메모" },
  ];

  it("조회수를 받으면 순위대로 그린다", async () => {
    respond({ [A]: 20, [B]: 300 });

    render(
      <ViewCounts ids={[A, B]}>
        <PopularPosts posts={posts} />
      </ViewCounts>,
    );

    expect(await screen.findByText("많이 읽힌 글")).toBeTruthy();
    const titles = screen.getAllByRole("link").map((link) => link.textContent);
    expect(titles).toEqual(["양자화 메모", "MoE 라우팅"]);
    expect(screen.getByRole("link", { name: "양자화 메모" })).toHaveProperty(
      "href",
      `http://localhost:3000/${B}`,
    );
    expect(screen.getByText("조회 300")).toBeTruthy();
  });

  it("아무도 읽지 않았으면 구역 자체를 그리지 않는다", async () => {
    respond({ [A]: 0, [B]: 0 });

    const { container } = render(
      <ViewCounts ids={[A, B]}>
        <PopularPosts posts={posts} />
      </ViewCounts>,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container.textContent).toBe("");
  });

  it("조회수를 못 받으면 구역 자체를 그리지 않는다", async () => {
    fetchMock.mockRejectedValue(new Error("네트워크 실패"));

    const { container } = render(
      <ViewCounts ids={[A, B]}>
        <PopularPosts posts={posts} />
      </ViewCounts>,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container.textContent).toBe("");
  });
});
