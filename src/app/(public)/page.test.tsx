import { isValidElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { SinceLastVisit } from "@/components/post/SinceLastVisit";
import { getAllPosts } from "@/lib/content/posts";

import Home from "./page";

/** 반환된 JSX 트리를 렌더하지 않고 훑어, 주어진 컴포넌트 요소의 props 를 모은다. */
function findProps(node: ReactNode, type: unknown): Record<string, unknown>[] {
  if (Array.isArray(node)) {
    return node.flatMap((child) => findProps(child, type));
  }
  if (!isValidElement(node)) {
    return [];
  }
  const props = node.props as Record<string, unknown> & { children?: ReactNode };
  const here = node.type === type ? [props] : [];
  return [...here, ...findProps(props.children, type)];
}

describe("홈 → SinceLastVisit", () => {
  // 클라이언트 컴포넌트 props 는 전부 HTML 에 직렬화된다.
  // 글 전체(`Post`)를 넘기면 본문 수백 편이 1면 HTML 에 실린다 (2026-10 기준 1.97MB).
  it("본문(body)을 넘기지 않는다", () => {
    const found = findProps(Home(), SinceLastVisit);
    expect(found).toHaveLength(1);

    const serialized = JSON.stringify(found[0]);
    // 실패 시 1.9MB 를 diff 로 쏟지 않도록 불리언으로 본다.
    expect(serialized.includes('"body"')).toBe(false);

    const sample = getAllPosts().at(0);
    expect(sample).toBeDefined();
    expect(serialized.includes(sample!.body.slice(0, 200))).toBe(false);
  });
});
