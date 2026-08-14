import { describe, expect, it } from "vitest";

import type { Post } from "@/types/content";

import { pickLead } from "./frontpage";

/**
 * 순수 함수라 실제 `content/` 를 읽지 않는다 — 경계값(lead 가 여럿·없음·0편)을
 * 파일로 만들어 두면 콘텐츠를 고칠 때마다 테스트가 흔들린다.
 */
function makePost(
  slug: string,
  publishedAt: string,
  lead = false,
): Post {
  return {
    frontmatter: {
      title: slug,
      category: "papers",
      axis: "serving",
      summary: "요약.",
      publishedAt,
      tags: [],
      draft: false,
      lead,
    },
    slug,
    category: "papers",
    body: "본문",
    filePath: `content/papers/${publishedAt.slice(0, 10)}-${slug}.mdx`,
    readingMinutes: 1,
  };
}

const OLD = makePost("old", "2026-06-01T09:00:00+0900");
const MIDDLE = makePost("middle", "2026-07-01T09:00:00+0900");
const NEWEST = makePost("newest", "2026-08-01T09:00:00+0900");

describe("pickLead", () => {
  it("lead 를 아무 글에도 안 붙이면 가장 최근 글이 머리기사가 된다", () => {
    // 손 안 대면 저절로 굴러가야 한다 — 1인 운영에서 매번 편집 결정을 요구하면 흐지부지된다.
    expect(pickLead([NEWEST, MIDDLE, OLD])).toBe(NEWEST);
  });

  it("lead 가 붙은 글은 최신이 아니어도 머리기사가 된다", () => {
    const marked = makePost("marked", "2026-07-01T09:00:00+0900", true);

    expect(pickLead([NEWEST, marked, OLD])).toBe(marked);
  });

  it("lead 가 여럿이면 그중 가장 최근 것 하나만 고른다", () => {
    const older = makePost("older-lead", "2026-06-15T09:00:00+0900", true);
    const later = makePost("later-lead", "2026-07-20T09:00:00+0900", true);

    // 셋 중 NEWEST 가 더 최근이지만 lead 가 붙은 쪽이 이긴다. 지면당 머리기사는 하나다.
    expect(pickLead([older, NEWEST, later])).toBe(later);
  });

  it("글이 0편이면 null 이다", () => {
    expect(pickLead([])).toBeNull();
  });

  it("글이 한 편뿐이면 lead 여부와 상관없이 그 글이다", () => {
    expect(pickLead([OLD])).toBe(OLD);
    expect(pickLead([makePost("only", "2026-06-01T09:00:00+0900", true)])?.slug).toBe(
      "only",
    );
  });

  it("넘겨받은 배열의 순서에 기대지 않는다", () => {
    // 홈은 최신순 목록을 넘기지만 그 사실에 의존하면 호출부가 바뀔 때 조용히 틀린다.
    expect(pickLead([OLD, NEWEST, MIDDLE])).toBe(NEWEST);
    expect(pickLead([MIDDLE, OLD, NEWEST])).toBe(NEWEST);
  });

  it("발행 시각이 같으면 slug 오름차순으로 고정한다", () => {
    const a = makePost("alpha", "2026-08-01T09:00:00+0900");
    const b = makePost("beta", "2026-08-01T09:00:00+0900");

    // 목록 정렬(content/posts.ts)과 같은 기준이라 머리기사가 목록 첫 글과 어긋나지 않는다.
    expect(pickLead([b, a])).toBe(a);
    expect(pickLead([a, b])).toBe(a);
  });
});
