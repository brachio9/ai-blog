import { describe, expect, it } from "vitest";

import { postHref } from "@/lib/pagination";

import {
  CAT_CLASS,
  CATEGORIES,
  categoryHref,
  getCategory,
} from "./categories";

describe("CATEGORIES", () => {
  it("PRD 의 카테고리 5종을 그 순서대로 갖는다", () => {
    // 순서가 곧 화면 순서다 (내비게이션·홈·푸터).
    expect(CATEGORIES.map((category) => category.slug)).toEqual([
      "papers",
      "releases",
      "news",
      "community",
      "notes",
    ]);
  });

  it("slug 가 중복되지 않는다", () => {
    const slugs = CATEGORIES.map((category) => category.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("모든 카테고리에 이름과 설명이 있다", () => {
    for (const category of CATEGORIES) {
      expect(category.name).not.toBe("");
      expect(category.description).not.toBe("");
    }
  });

  it("짧은 이름은 밀집 목록의 구분 열에 들어갈 만큼 짧다", () => {
    for (const category of CATEGORIES) {
      expect(category.shortName.length).toBeGreaterThanOrEqual(1);
      expect(category.shortName.length).toBeLessThanOrEqual(4);
    }
  });

  it("색 토큰 키가 다섯 종류 안에 있고 서로 겹치지 않는다", () => {
    // 겹치면 목록에서 두 카테고리가 같은 색으로 보인다 — 색이 정보 부호 노릇을 못 한다.
    const accents = CATEGORIES.map((category) => category.accent);

    for (const accent of accents) {
      expect(["paper", "release", "news", "community", "note"]).toContain(
        accent,
      );
    }
    expect(new Set(accents).size).toBe(accents.length);
  });

  it("CAT_CLASS 가 모든 카테고리의 accent 를 덮는다", () => {
    // globals.css 의 `.cat-*` 는 컴파일이 못 잡는다 — 빠지면 조용히 무색이 된다.
    for (const category of CATEGORIES) {
      expect(CAT_CLASS[category.accent]).toBe(`cat-${category.slug}`);
    }
  });
});

describe("categoryHref", () => {
  it("`/sources/` 아래에 둔다 — 최상위 세그먼트를 먹지 않는다", () => {
    for (const category of CATEGORIES) {
      expect(categoryHref(category)).toBe(`/sources/${category.slug}`);
    }
  });

  it("글 주소가 아니다 — 글은 분류를 담지 않는다", () => {
    // 분류를 주소에 넣으면 분류를 고칠 때마다 링크가 죽는다. 이 사이트는 그 개편을
    // 이미 한 번 겪었다 (2026-08-15, hf-blog → releases + news).
    expect(postHref("moe-routing-pipeline")).toBe("/posts/moe-routing-pipeline");
  });
});

describe("getCategory", () => {
  it("등록된 slug 는 해당 카테고리를 준다", () => {
    for (const category of CATEGORIES) {
      expect(getCategory(category.slug)).toEqual(category);
    }
  });

  it("미지의 slug 는 undefined 를 준다", () => {
    expect(getCategory("does-not-exist")).toBeUndefined();
    expect(getCategory("")).toBeUndefined();
  });
});
