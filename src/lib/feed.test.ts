import { describe, expect, it, vi } from "vitest";

import type { Post, PostFrontmatter } from "@/types/content";

import { getAllPosts } from "./content/posts";
import { buildRssXml, buildSearchIndex } from "./feed";

const SITE = "https://blog.example.com";

/** draft 제외는 NODE_ENV 로만 갈린다. 프로덕션 빌드와 같은 조건으로 재 본다. */
function inProduction<T>(run: () => T): T {
  vi.stubEnv("NODE_ENV", "production");
  try {
    return run();
  } finally {
    vi.unstubAllEnvs();
  }
}

const BODY = "본문에만 있는 문장이다. 피드에도 인덱스에도 나오면 안 된다.";

function makePost(
  frontmatter: Partial<PostFrontmatter> = {},
  slug = "sample-post",
): Post {
  const merged: PostFrontmatter = {
    title: "제목",
    category: "papers",
    summary: "요약",
    publishedAt: "2026-08-05T09:00:00+0900",
    tags: ["LLM"],
    draft: false,
    ...frontmatter,
  };

  return {
    frontmatter: merged,
    slug,
    category: merged.category,
    body: BODY,
    filePath: `content/${merged.category}/2026-08-05-${slug}.mdx`,
    readingMinutes: 3,
  };
}

function parseXml(xml: string): Document {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  const failure = document.querySelector("parsererror");
  expect(failure?.textContent ?? null).toBeNull();
  return document;
}

describe("buildRssXml", () => {
  it("RSS 2.0 채널 정보를 담은 유효한 XML 을 만든다", () => {
    const document = parseXml(buildRssXml([makePost()], SITE));

    expect(document.documentElement.nodeName).toBe("rss");
    expect(document.documentElement.getAttribute("version")).toBe("2.0");

    const channel = document.querySelector("rss > channel");
    expect(channel?.querySelector("title")?.textContent).toBeTruthy();
    expect(channel?.querySelector("link")?.textContent).toBe(SITE);
    expect(channel?.querySelector("description")?.textContent).toBeTruthy();
    expect(channel?.querySelector("language")?.textContent).toBe("ko");
    expect(channel?.querySelector("lastBuildDate")?.textContent).toBeTruthy();
  });

  it("제목·요약의 XML 특수문자를 이스케이프한다", () => {
    const title = "R&D <script> 성능 > 비용";
    const summary = "a & b < c > d";
    const xml = buildRssXml([makePost({ title, summary })], SITE);

    // 날것의 <script> 가 남으면 피드가 통째로 깨진다.
    expect(xml).toContain("&amp;");
    expect(xml).not.toContain("<script>");

    // 파싱해서 원문이 그대로 돌아오는지가 이스케이프의 진짜 기준이다.
    const item = parseXml(xml).querySelector("item");
    expect(item?.querySelector("title")?.textContent).toBe(title);
    expect(item?.querySelector("description")?.textContent).toBe(summary);
  });

  it("글 절대 URL 을 guid·link 에 넣는다", () => {
    const xml = buildRssXml(
      [makePost({ category: "notes" }, "quantization-notes")],
      SITE,
    );
    const item = parseXml(xml).querySelector("item");
    const url = `${SITE}/notes/quantization-notes`;

    expect(item?.querySelector("link")?.textContent).toBe(url);
    expect(item?.querySelector("guid")?.textContent).toBe(url);
    expect(item?.querySelector("guid")?.getAttribute("isPermaLink")).toBe(
      "true",
    );
  });

  it("siteUrl 끝의 슬래시로 // 를 만들지 않는다", () => {
    const xml = buildRssXml([makePost()], `${SITE}/`);

    expect(xml).toContain(`${SITE}/papers/sample-post`);
    expect(xml).not.toContain(`${SITE}//`);
  });

  it("pubDate 는 RFC 822 형식이다", () => {
    const xml = buildRssXml([makePost()], SITE);
    const pubDate = parseXml(xml).querySelector("item > pubDate")?.textContent;

    expect(pubDate).toMatch(/^\w{3}, \d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2} GMT$/);
    // 2026-08-05T09:00:00+0900 == 2026-08-05T00:00:00Z
    expect(pubDate).toBe("Wed, 05 Aug 2026 00:00:00 GMT");
  });

  it("본문 전문을 넣지 않는다 — summary 까지만", () => {
    const xml = buildRssXml([makePost()], SITE);

    expect(xml).not.toContain(BODY);
    expect(xml).toContain("요약");
  });

  it("항목 수가 초안을 제외한 글 수와 맞는다", () => {
    const posts = inProduction(getAllPosts);
    const document = parseXml(buildRssXml(posts, SITE));

    expect(posts).toHaveLength(8);
    expect(document.querySelectorAll("item")).toHaveLength(8);

    // 초안 제목이 새어 나가면 발행 전 글이 공개된다.
    const titles = [...document.querySelectorAll("item > title")].map(
      (node) => node.textContent,
    );
    expect(titles).not.toContain(
      getAllPosts().find((post) => post.frontmatter.draft)?.frontmatter.title,
    );
  });
});

describe("buildSearchIndex", () => {
  it("본문을 넣지 않는다 (ADR-007)", () => {
    const [doc] = buildSearchIndex([makePost()]);

    expect(doc).not.toHaveProperty("body");
    expect(JSON.stringify(doc)).not.toContain(BODY);
  });

  it("id 는 `${category}/${slug}` 다", () => {
    const [doc] = buildSearchIndex([
      makePost({ category: "hf-blog" }, "dataset-viewer-refresh"),
    ]);

    expect(doc.id).toBe("hf-blog/dataset-viewer-refresh");
  });

  it("검색·목록에 필요한 필드만 담는다", () => {
    const [doc] = buildSearchIndex([makePost({ tags: ["LLM", "벤치마크"] })]);

    expect(Object.keys(doc).sort()).toEqual([
      "category",
      "id",
      "publishedAt",
      "readingMinutes",
      "slug",
      "summary",
      "tags",
      "title",
    ]);
    expect(doc.tags).toEqual(["LLM", "벤치마크"]);
  });

  it("cover 가 있는 글만 cover 를 갖는다", () => {
    const [withCover] = buildSearchIndex([
      makePost({ cover: "/sample/cover.svg" }),
    ]);

    expect(withCover.cover).toBe("/sample/cover.svg");
  });

  it("초안을 제외한 글 수와 맞는다", () => {
    expect(buildSearchIndex(inProduction(getAllPosts))).toHaveLength(8);
  });
});
