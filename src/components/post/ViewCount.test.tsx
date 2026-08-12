import { render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ViewCount } from "./ViewCount";

const POST_ID = "notes/quantization-notes";

const fetchMock = vi.fn();

function respond(count: number): void {
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ count }),
  });
}

/** 요청 메서드만 뽑는다. 두 번째 인자가 없으면 GET 이다. */
function methods(): string[] {
  return fetchMock.mock.calls.map(
    ([, init]) => (init as RequestInit | undefined)?.method ?? "GET",
  );
}

beforeEach(() => {
  sessionStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ViewCount", () => {
  it("세션에서 처음 보는 글이면 증가시키고 숫자를 그린다", async () => {
    respond(1234);

    render(<ViewCount postId={POST_ID} />);

    expect(await screen.findByText("조회 1,234")).toBeTruthy();
    expect(methods()).toEqual(["POST"]);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/views");
  });

  it("이미 본 글이면 증가시키지 않고 조회만 한다", async () => {
    sessionStorage.setItem(`viewed:${POST_ID}`, "1");
    respond(42);

    render(<ViewCount postId={POST_ID} />);

    expect(await screen.findByText("조회 42")).toBeTruthy();
    expect(methods()).toEqual(["GET"]);
    expect(fetchMock.mock.calls[0][0]).toBe(
      `/api/views?id=${encodeURIComponent(POST_ID)}`,
    );
  });

  it("StrictMode 로 effect 가 두 번 돌아도 두 번 증가하지 않는다", async () => {
    respond(1);

    render(
      <StrictMode>
        <ViewCount postId={POST_ID} />
      </StrictMode>,
    );

    await screen.findByText("조회 1");
    // 첫 effect 가 증가시키고 sessionStorage 에 표시를 남기므로 두 번째는 조회만 한다.
    expect(methods()).toEqual(["POST", "GET"]);
  });

  it("요청이 실패하면 아무것도 그리지 않는다", async () => {
    fetchMock.mockRejectedValue(new Error("네트워크 실패"));

    const { container } = render(<ViewCount postId={POST_ID} />);

    await waitFor(() => expect(container.textContent).toBe(""));
  });

  it("응답이 200 이 아니면 아무것도 그리지 않는다", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400 });

    const { container } = render(<ViewCount postId={POST_ID} />);

    await waitFor(() => expect(container.textContent).toBe(""));
  });

  it("추적이 꺼져 있으면(0) 아무것도 그리지 않는다", async () => {
    respond(0);

    const { container } = render(<ViewCount postId={POST_ID} />);

    await waitFor(() => expect(container.textContent).toBe(""));
  });

  it("숫자가 들어오기 전에도 자리를 잡아둔다", () => {
    respond(7);

    const { container } = render(<ViewCount postId={POST_ID} />);

    // 로딩 중에는 값이 비어 있고, 폭을 예약한 자리만 있다.
    const slot = container.querySelector("span > span:last-child");
    expect(slot?.textContent).toBe("");
    expect(slot?.className).toMatch(/min-w-/);
  });
});
