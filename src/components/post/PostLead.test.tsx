import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Post } from "@/types/content";

import { PostLead } from "./PostLead";

/** 본문 글자 수가 비율의 분모다 — 3240 단어 × 2.5 / 이 길이 ≈ 16:1 이 되도록 잡았다. */
const BODY = "가".repeat(500);

function makePost(overrides: Partial<Post["frontmatter"]> = {}): Post {
  return {
    frontmatter: {
      title: "MoE 라우팅을 두 단계로 쪼갠 학습 파이프라인",
      category: "papers",
      summary:
        "전문가 라우터를 본 학습과 분리해 먼저 굳히고 시작하는 2단계 파이프라인. 초기 라우팅 붕괴를 막아 손실을 더 내렸다고 보고한다.",
      publishedAt: "2026-08-05T08:15:00+0900",
      tags: ["MoE"],
      draft: false,
      lead: true,
      paper: { arxivId: "2608.01337", authors: ["H. Vasquez"] },
      source: {
        url: "https://arxiv.org/abs/2608.01337",
        title: "Two-Stage Router Warmup for Sparse Mixture-of-Experts",
        words: 3240,
      },
      ...overrides,
    },
    slug: "moe-routing-pipeline",
    category: "papers",
    body: BODY,
    filePath: "content/papers/2026-08-05-moe-routing-pipeline.mdx",
    readingMinutes: 6,
  };
}

describe("PostLead", () => {
  it("표제·부제·리드 3단으로 들어간다 — 요약 첫 문장이 부제, 나머지가 리드다", () => {
    const { container } = render(<PostLead post={makePost()} />);

    const link = screen.getByRole("link", {
      name: "MoE 라우팅을 두 단계로 쪼갠 학습 파이프라인",
    });
    expect(link.getAttribute("href")).toBe("/papers/moe-routing-pipeline");

    expect(container.querySelector(".deck")?.textContent).toBe(
      "전문가 라우터를 본 학습과 분리해 먼저 굳히고 시작하는 2단계 파이프라인.",
    );
    expect(container.querySelector(".lede")?.textContent).toBe(
      "초기 라우팅 붕괴를 막아 손실을 더 내렸다고 보고한다.",
    );
  });

  it("추린 비율을 데이트라인 안의 한 조각으로 넣는다", () => {
    const { container } = render(<PostLead post={makePost()} />);

    // 3240 × 2.5 / 500 = 16.2 → 16:1. 수치는 mono, 한글 라벨은 산세리프다.
    const ratio = container.querySelector(".ratio");
    expect(ratio?.textContent).toBe("16:1");
    expect(container.querySelector(".dateline")?.textContent).toContain("추림");
  });

  it("원문 단어 수가 없으면 비율 자리 자체가 생기지 않는다", () => {
    const post = makePost({ source: undefined });
    const { container } = render(<PostLead post={post} />);

    expect(container.querySelector(".ratio")).toBeNull();
    expect(container.querySelector(".dateline")?.textContent).not.toContain(
      "추림",
    );
  });

  it("ratio 를 null 로 넘기면 본문이 있어도 그리지 않는다", () => {
    const { container } = render(<PostLead post={makePost()} ratio={null} />);

    expect(container.querySelector(".ratio")).toBeNull();
  });

  it("카테고리 안료를 항목 바깥에 붙이고 이름도 함께 적는다", () => {
    const { container } = render(<PostLead post={makePost()} />);

    // 색만으로 알리지 않는다 — 안료 클래스와 이름이 함께 간다.
    expect(container.querySelector(".entry-lead")?.className).toContain(
      "cat-papers",
    );
    expect(screen.getByText("최신 논문")).toBeTruthy();
  });
});
