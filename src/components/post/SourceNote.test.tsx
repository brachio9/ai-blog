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
});
