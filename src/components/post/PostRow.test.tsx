import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Post, PostFrontmatter, PostSelection } from "@/types/content";

import { PostRow } from "./PostRow";

type Overrides = Partial<Omit<Post, "frontmatter">> & {
  frontmatter?: Partial<PostFrontmatter>;
};

function makePost(overrides: Overrides = {}): Post {
  const { frontmatter, ...rest } = overrides;

  return {
    slug: "quantization-notes",
    category: "notes",
    body: "",
    filePath: "content/notes/2026-08-02-quantization-notes.mdx",
    readingMinutes: 4,
    ratio: null,
    ...rest,
    frontmatter: {
      title: "양자화 손실을 반년 동안 기록해 봤다",
      category: "notes",
      axis: "serving",
      summary: "같은 모델을 여섯 달 동안 여러 방식으로 양자화하며 남긴 기록.",
      publishedAt: "2026-08-02T09:00:00+0900",
      tags: ["양자화"],
      draft: false,
      ...frontmatter,
    },
  };
}

const selection = (extra: Partial<PostSelection> = {}): PostSelection => ({
  axisBy: "llm",
  axisConfidence: "high",
  band: "mid",
  crossSources: 1,
  ...extra,
});

function rowOf(container: HTMLElement) {
  return container.querySelector(".row");
}

describe("PostRow — 균일 피드", () => {
  it("모든 행이 같은 슬롯을 갖는다 — 그림·번호·제목·요약·메타", () => {
    const { container } = render(
      <ul>
        <PostRow post={makePost()} />
      </ul>,
    );

    const row = rowOf(container);
    // 왼쪽 두 칸은 폭이 고정된 열이다. 이게 제목의 왼쪽 끝이 흔들리지 않는 근거다.
    expect(row?.children).toHaveLength(3);
    expect(row?.firstElementChild?.className).toContain("thumb");
    expect(row?.children[1]?.className).toContain("row-no");
    expect(container.querySelector(".row-summary")?.textContent).toBe(
      "같은 모델을 여섯 달 동안 여러 방식으로 양자화하며 남긴 기록.",
    );
  });

  it("**요약은 행마다 켜고 끄지 않는다** — 그게 곧 비균일이다", () => {
    // 교차등장이 없는 글에도 요약이 실린다. 예전에는 이 조건으로 폈다 접었다 했다.
    const { container } = render(
      <ul>
        <PostRow post={makePost({ frontmatter: { selection: selection() } })} />
      </ul>,
    );

    expect(container.querySelector(".row-summary")).not.toBeNull();
  });

  it("축 번호는 언제나 두 자리다 — 폭이 내용에 안 달렸다", () => {
    const { container } = render(
      <ul>
        <PostRow post={makePost()} />
      </ul>,
    );

    const link = screen.getByRole("link", { name: "주제 서빙·학습" });
    expect(link.getAttribute("href")).toBe("/topics/serving");
    expect(container.querySelector(".row-no")?.textContent).toHaveLength(2);
  });

  it("「추린 비율」은 값이 있을 때만 그리고, 자리를 예약하지 않는다", () => {
    const { container: without } = render(
      <ul>
        <PostRow post={makePost()} />
      </ul>,
    );
    expect(without.querySelector(".ratio")).toBeNull();
    // 자리를 비우는 대신 **왼쪽 무리의 마지막 칸**이라 뒤에서 밀릴 것이 없다.
    expect(without.querySelector(".row-meta-right")).not.toBeNull();

    const { container: with_ } = render(
      <ul>
        <PostRow post={makePost({ ratio: 35 })} />
      </ul>,
    );
    expect(with_.querySelector(".ratio")?.textContent).toBe("추림 35:1");
  });

  it("선별 경위를 부호로 싣는다 — 교차 · 추천 수 · 약한 축", () => {
    const { container } = render(
      <ul>
        <PostRow
          post={makePost({
            frontmatter: {
              selection: selection({
                crossSources: 3,
                popularity: { kind: "hf-upvotes", count: 128 },
              }),
            },
          })}
        />
      </ul>,
    );

    const marks = container.querySelector(".row-meta-right")?.textContent;
    expect(marks).toContain("교차 3곳");
    expect(marks).toContain("▲128");
  });

  it("교차 1곳은 적지 않는다 — 90%가 1곳이라 아무것도 가르지 못한다", () => {
    const { container } = render(
      <ul>
        <PostRow
          post={makePost({ frontmatter: { selection: selection() } })}
        />
      </ul>,
    );

    expect(container.querySelector(".row-meta-right")?.textContent).not.toContain(
      "교차",
    );
  });

  it("약한 축은 감추지 않고 표시한다 — 색만으로 알리지 않는다", () => {
    // 목록에서 빼면 여섯 축 편수의 합이 전체와 달라져 /topics 가 지도 노릇을 못 한다.
    const { container } = render(
      <ul>
        <PostRow
          post={makePost({
            category: "papers",
            frontmatter: { category: "papers", selection: selection({ axisBy: "source" }) },
          })}
        />
      </ul>,
    );

    const mark = container.querySelector(".row-weak");
    expect(mark?.textContent).toBe("†");
    expect(mark?.getAttribute("title")).toBeTruthy();
  });
});

describe("PostRow — 되찾는 면(index)", () => {
  it("번호·날짜·제목·구분 4열이다 — 썸네일도 요약도 오지 않는다", () => {
    const { container } = render(
      <ul>
        <PostRow post={makePost()} density="index" />
      </ul>,
    );

    const row = container.querySelector(".index-row");
    expect(row?.children).toHaveLength(4);
    expect(container.querySelector(".thumb")).toBeNull();
    expect(container.querySelector(".row-summary")).toBeNull();

    expect(screen.getByText("2026.08.02")).toBeTruthy();
    expect(screen.getByText("기록")).toBeTruthy();
    expect(row?.className).toContain("cat-notes");
  });

  it("두 성격이 같은 글 주소를 가리킨다", () => {
    render(
      <ul>
        <PostRow post={makePost()} />
        <PostRow post={makePost()} density="index" />
      </ul>,
    );

    const links = screen.getAllByRole("link", {
      name: "양자화 손실을 반년 동안 기록해 봤다",
    });
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link.getAttribute("href")).toBe("/posts/quantization-notes");
    }
  });
});
