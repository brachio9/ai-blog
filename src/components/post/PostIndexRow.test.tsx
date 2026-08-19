import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Post } from "@/types/content";

import { PostIndexRow } from "./PostIndexRow";

function makePost(): Post {
  return {
    frontmatter: {
      title: "양자화 손실을 반년 동안 기록해 봤다",
      category: "notes",
      axis: "serving",
      summary: "같은 모델을 여섯 달 동안 여러 방식으로 양자화하며 남긴 기록.",
      publishedAt: "2026-08-02T09:00:00+0900",
      tags: ["양자화"],
      draft: false,
      lead: false,
    },
    slug: "quantization-notes",
    category: "notes",
    body: "",
    filePath: "content/notes/2026-08-02-quantization-notes.mdx",
    readingMinutes: 4,
  };
}

describe("PostIndexRow", () => {
  it("번호·날짜·제목·구분 4열이다 — 되찾기에 필요한 것만 남는다", () => {
    const { container } = render(
      <ul>
        <PostIndexRow post={makePost()} />
      </ul>,
    );

    expect(screen.getByText("2026.08.02")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "양자화 손실을 반년 동안 기록해 봤다" })
        .getAttribute("href"),
    ).toBe("/posts/quantization-notes");
    expect(screen.getByText("기록")).toBeTruthy();

    const row = container.querySelector(".index-row");
    expect(row?.className).toContain("cat-notes");
    // 4열 그대로 — 요약이나 읽기 시간이 끼어들면 색인이 아니다.
    expect(row?.children).toHaveLength(4);
  });

  it("축 번호를 맨 앞에 싣는다 — 되찾는 면에서도 1급 차원이 보여야 한다", () => {
    const { container } = render(
      <ul>
        <PostIndexRow post={makePost()} />
      </ul>,
    );

    const link = screen.getByRole("link", { name: "주제 서빙·학습" });
    expect(link.getAttribute("href")).toBe("/topics/serving");

    // **제목의 왼쪽 끝이 흔들리지 않는 근거다** — 이 칸은 언제나 두 글자다.
    const first = container.querySelector(".index-row")?.firstElementChild;
    expect(first?.className).toContain("index-no");
    expect(first?.textContent).toHaveLength(2);
  });
});
