import { describe, expect, it } from "vitest";

import { isOwnAxisEcho, normalizeTagKey } from "@/lib/axes";
import { getAllPosts } from "@/lib/content/posts";

/**
 * 태그 규칙 — **실제 `content/` 를 읽는다.** 픽스처가 아니라 봇이 실제로 내려놓은 것을 본다.
 *
 * 스키마(zod)로 막지 않는 것이 의도다. 이것은 **편집 품질의 문제이지 유효성의 문제가 아니다** —
 * 태그가 축을 되풀이해도 글은 멀쩡히 렌더된다. 게다가 `parseFrontmatter` 는 첫 파일에서
 * 던지는데, 봇 PR 은 한 번에 스무 편이 들어와서 위반을 한 번에 다 봐야 한다.
 * 여기서 깨지면 AC(`npm run test`)가 막히지만 `next build` 는 안 막는다.
 *
 * **고칠 곳은 이 레포가 아니다.** 태그를 만드는 것은 `chorok-collect` 의
 * `draft/concepts.py` + `concepts.yaml` 이다.
 */
describe("태그 규칙", () => {
  const posts = getAllPosts();

  it("태그가 그 글의 축을 되풀이하지 않는다", () => {
    const violations = posts.flatMap((post) =>
      post.frontmatter.tags
        .filter((tag) => isOwnAxisEcho(tag, post.frontmatter.axis))
        .map(
          (tag) =>
            `${post.filePath}: '${tag}' 는 axis(${post.frontmatter.axis}) 를 되풀이한다`,
        ),
    );

    expect(violations).toEqual([]);
  });
});

describe("isOwnAxisEcho", () => {
  it("자기 축을 되풀이하면 막는다", () => {
    expect(isOwnAxisEcho("음성", "voice")).toBe(true);
    expect(isOwnAxisEcho("바이브코딩", "vibe-coding")).toBe(true);
    expect(isOwnAxisEcho("Agentic Engineering", "agent")).toBe(true);
    expect(isOwnAxisEcho("추론최적화·파인튜닝", "serving")).toBe(true);
  });

  it("**다른** 축을 가리키는 태그는 막지 않는다 — 그것이 부차 주제다", () => {
    // 실측 79회 중 38회가 이런 경우였다. 서빙 글에 붙은 「음성」은 두 축에 걸친다는 사실을 싣는다.
    expect(isOwnAxisEcho("음성", "serving")).toBe(false);
    expect(isOwnAxisEcho("바이브코딩", "agent")).toBe(false);
  });

  it("고유명사는 어느 축에서도 막지 않는다 — covers 를 금지 목록으로 쓰면 안 된다", () => {
    // `covers` 에는 MCP·vLLM·Whisper 가 들어 있다. 그것으로 막으면 태그의 존재 이유가 사라진다.
    expect(isOwnAxisEcho("MCP", "agent")).toBe(false);
    expect(isOwnAxisEcho("vLLM", "serving")).toBe(false);
    expect(isOwnAxisEcho("Whisper", "voice")).toBe(false);
    expect(isOwnAxisEcho("GraphRAG", "retrieval")).toBe(false);
  });

  it("모르는 축이면 아무것도 막지 않는다 — 판정할 근거가 없다", () => {
    expect(isOwnAxisEcho("음성", "없는축")).toBe(false);
  });
});

describe("normalizeTagKey", () => {
  it("표기 차이를 흡수한다 — 공백·가운뎃점·하이픈·마침표", () => {
    expect(normalizeTagKey("Agentic Engineering")).toBe(
      normalizeTagKey("agenticengineering"),
    );
    expect(normalizeTagKey("바이브 코딩")).toBe(normalizeTagKey("바이브코딩"));
    expect(normalizeTagKey("검색·RAG")).toBe(normalizeTagKey("검색rag"));
  });

  it("서로 다른 말은 서로 다르게 둔다", () => {
    expect(normalizeTagKey("RAG")).not.toBe(normalizeTagKey("GraphRAG"));
  });
});
