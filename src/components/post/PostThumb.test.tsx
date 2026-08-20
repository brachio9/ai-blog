import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Post, PostSource } from "@/types/content";

import { PostThumb } from "./PostThumb";

function makePost(source?: PostSource): Post {
  return {
    frontmatter: {
      title: "제목",
      category: "papers",
      axis: "serving",
      summary: "요약",
      publishedAt: "2026-08-19T09:00:00+0900",
      tags: [],
      draft: false,
      source,
    },
    slug: "x",
    category: "papers",
    body: "",
    filePath: "content/papers/2026-08-19-x.mdx",
    readingMinutes: 2,
    ratio: null,
  };
}

const withImage = (image: string): PostSource => ({
  url: "https://arxiv.org/abs/2608.17528",
  title: "Original",
  image,
});

describe("PostThumb", () => {
  it("주소가 있으면 원본을 그대로 임베드한다", () => {
    const { container } = render(
      <PostThumb post={makePost(withImage("https://arxiv.org/html/2608.1/x1.png"))} />,
    );

    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("https://arxiv.org/html/2608.1/x1.png");
    expect(img?.getAttribute("loading")).toBe("lazy");
    // 옆에 제목 링크가 있으므로 순수 장식이다. 빈 alt 는 깨진 이미지 아이콘도 억제한다.
    expect(img?.getAttribute("alt")).toBe("");
  });

  it("**`/_next/image` 를 거치지 않는다** — 최적화기를 태우면 우리가 사본을 재배포하게 된다", () => {
    // 이 단언이 A3 결정의 회귀 네트다. next/image 로 바꾸면 여기서 깨진다.
    const { container } = render(
      <PostThumb post={makePost(withImage("https://i.ytimg.com/vi/abc/hqdefault.jpg"))} />,
    );

    expect(container.innerHTML).not.toContain("/_next/image");
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "https://i.ytimg.com/vi/abc/hqdefault.jpg",
    );
  });

  it("주소가 없으면 img 를 아예 그리지 않는다 — 표지가 그대로 보인다", () => {
    const { container } = render(<PostThumb post={makePost()} />);

    expect(container.querySelector("img")).toBeNull();
    // 상자는 남는다. **그림이 있든 없든 열 폭이 같아야 스무 행이 떨리지 않는다.**
    expect(container.querySelector(".thumb")).not.toBeNull();
  });

  it("`notes` 처럼 원문이 없는 글은 저절로 표지로 간다", () => {
    // source 자체가 없으므로 게이트를 따로 만들 필요가 없다 — 구조가 게이트다.
    const post = makePost();
    expect(post.frontmatter.source).toBeUndefined();

    const { container } = render(<PostThumb post={post} />);
    expect(container.querySelector("img")).toBeNull();
  });

  it("장식이라고 알린다 — 화면낭독기가 같은 글을 두 번 읽지 않게", () => {
    const { container } = render(
      <PostThumb post={makePost(withImage("https://ex.org/a.png"))} />,
    );

    expect(container.querySelector(".thumb")?.getAttribute("aria-hidden")).toBe(
      "true",
    );
  });
});
