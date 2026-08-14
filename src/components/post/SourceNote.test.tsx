import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { PaperMeta, PostSource } from "@/types/content";

import { SourceNote } from "./SourceNote";

const source: PostSource = {
  url: "https://huggingface.co/blog/inference-endpoints-cli",
  title: "Ship Inference Endpoints from Your Terminal",
  author: "Hugging Face Infrastructure Team",
  license: "cc-by-4.0",
  publishedAt: "2026-07-23T22:05:00+0900",
};

const paper: PaperMeta = {
  arxivId: "2607.04512",
  authors: ["L. Amari", "R. Okonkwo"],
};

describe("SourceNote", () => {
  it("원문 링크를 새 탭으로 연다", () => {
    render(<SourceNote source={source} />);

    const link = screen.getByRole("link", { name: /Ship Inference Endpoints/ });
    expect(link.getAttribute("href")).toBe(source.url);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("저자와 라이선스를 함께 표기한다", () => {
    render(<SourceNote source={source} />);

    expect(screen.getByText(/Hugging Face Infrastructure Team/)).toBeTruthy();
    expect(screen.getByText(/cc-by-4\.0/)).toBeTruthy();
  });

  it("원문 번역 전재가 아니라 요약임을 밝힌다", () => {
    render(<SourceNote source={source} />);

    expect(screen.getByText(/요약/)).toBeTruthy();
  });

  it("원문 제목과 발행일을 함께 표기한다", () => {
    render(<SourceNote source={source} />);

    // 원문 제목은 링크 글자 그대로여야 한다 — 요약본 제목으로 바꿔 적으면 표기가 아니다.
    expect(
      screen.getByRole("link", { name: /Ship Inference Endpoints/ })
        .textContent,
    ).toContain(source.title);
    expect(screen.getByText(/원문 발행 2026년 7월 23일/)).toBeTruthy();
  });

  it("논문 메타가 있으면 arXiv 링크와 저자를 덧붙인다", () => {
    render(<SourceNote source={source} paper={paper} />);

    const arxiv = screen.getByRole("link", { name: /arXiv:2607\.04512/ });
    expect(arxiv.getAttribute("href")).toBe("https://arxiv.org/abs/2607.04512");
    expect(screen.getByText(/L\. Amari, R\. Okonkwo/)).toBeTruthy();
  });

  it("source 가 없으면 아무것도 렌더하지 않는다", () => {
    const { container } = render(<SourceNote />);

    expect(container.innerHTML).toBe("");
  });

  it("추린 비율을 확장형 막대로 편다 — 원문이 100%, 초록이 그 비율", () => {
    const { container } = render(
      <SourceNote
        source={source}
        ratio={{ ratio: 8, bodyChars: 742, sourceWords: 2410 }}
      />,
    );

    const fills = container.querySelectorAll<HTMLElement>(".ratio-fill");
    expect(fills).toHaveLength(2);
    expect(fills[0].style.width).toBe("100%");
    // 막대와 '1/8' 표기가 같은 말을 해야 한다 — 폭은 비율의 역수다.
    expect(fills[1].style.width).toBe("12.5%");

    const scale = container.querySelector(".ratio-scale");
    expect(scale?.textContent).toContain("2,410");
    expect(scale?.textContent).toContain("742");
    expect(scale?.textContent).toContain("1/8");
  });

  it("비율이 없으면 막대를 그리지 않는다 — 출처 표기는 그대로 남는다", () => {
    const { container } = render(<SourceNote source={source} ratio={null} />);

    expect(container.querySelector(".ratio-scale")).toBeNull();
    expect(
      screen.getByRole("link", { name: /Ship Inference Endpoints/ }),
    ).toBeTruthy();
  });

  it("mono 자리에 한글을 섞지 않는다 — '자'는 UI 목소리로 뺀다", () => {
    const { container } = render(
      <SourceNote
        source={source}
        ratio={{ ratio: 8, bodyChars: 742, sourceWords: 2410 }}
      />,
    );

    for (const node of container.querySelectorAll(".voice-source")) {
      const own = [...node.childNodes]
        .filter((child) => child.nodeType === Node.TEXT_NODE)
        .map((child) => child.textContent ?? "")
        .join("");
      expect(own).not.toMatch(/[가-힣]/);
    }
  });
});
