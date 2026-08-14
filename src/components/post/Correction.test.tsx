import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Correction } from "./Correction";

const PUBLISHED = "2026-08-05T08:15:00+0900";

describe("Correction", () => {
  it("고쳐 실은 날이 없으면 아무것도 그리지 않는다", () => {
    const { container } = render(<Correction publishedAt={PUBLISHED} />);

    expect(container.innerHTML).toBe("");
  });

  it("발행일과 수정일이 같은 날이면 정정이 아니다", () => {
    const { container } = render(
      <Correction
        publishedAt={PUBLISHED}
        // 같은 KST 날짜 안의 손질은 발행 작업의 일부다.
        updatedAt="2026-08-05T21:40:00+0900"
      />,
    );

    expect(container.innerHTML).toBe("");
  });

  it("고쳐 실었으면 두 날짜를 함께 남긴다 — 발행일을 덮어쓰지 않는다", () => {
    render(
      <Correction publishedAt={PUBLISHED} updatedAt="2026-08-13T09:00:00+0900" />,
    );

    const note = screen.getByLabelText("정정");
    expect(note.textContent).toContain("2026.08.13");
    // 처음 실은 날이 사라지면 기록이 아니라 은폐다.
    expect(note.textContent).toContain("2026.08.05");
  });

  it("두 날짜 모두 기계가 읽을 수 있는 datetime 을 단다", () => {
    const updatedAt = "2026-08-13T09:00:00+0900";
    render(<Correction publishedAt={PUBLISHED} updatedAt={updatedAt} />);

    const times = screen
      .getByLabelText("정정")
      .querySelectorAll<HTMLTimeElement>("time");
    expect([...times].map((time) => time.getAttribute("datetime"))).toEqual([
      updatedAt,
      PUBLISHED,
    ]);
  });

  it("안료를 쓰지 않는다 — 정정은 경고가 아니라 기록이다", () => {
    render(
      <Correction publishedAt={PUBLISHED} updatedAt="2026-08-13T09:00:00+0900" />,
    );

    const note = screen.getByLabelText("정정");
    const classes = [note, ...note.querySelectorAll("*")]
      .map((element) => element.className)
      .join(" ");
    expect(classes).not.toMatch(/cat|accent|danger|warning/);
  });
});
