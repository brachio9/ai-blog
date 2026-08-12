import { describe, expect, it } from "vitest";

import { CATEGORIES, categoryHref, getCategory } from "./categories";

describe("CATEGORIES", () => {
  it("PRD 의 카테고리 3종을 모두 갖는다", () => {
    expect(CATEGORIES.map((category) => category.slug)).toEqual([
      "hf-blog",
      "papers",
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
});

describe("categoryHref", () => {
  it("slug 를 그대로 경로로 쓴다", () => {
    for (const category of CATEGORIES) {
      expect(categoryHref(category)).toBe(`/${category.slug}`);
    }
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
