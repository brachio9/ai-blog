import { describe, expect, it } from "vitest";

import {
  CATEGORIES,
  categoryHref,
  getCategory,
  RESERVED_SEGMENTS,
} from "./categories";

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

  it("짧은 이름은 밀집 목록의 구분 열에 들어갈 만큼 짧다", () => {
    for (const category of CATEGORIES) {
      expect(category.shortName.length).toBeGreaterThanOrEqual(1);
      expect(category.shortName.length).toBeLessThanOrEqual(4);
    }
  });

  it("색 토큰 키가 세 종류 안에 있고 서로 겹치지 않는다", () => {
    // 겹치면 목록에서 두 카테고리가 같은 색으로 보인다 — 색이 정보 부호 노릇을 못 한다.
    const accents = CATEGORIES.map((category) => category.accent);

    for (const accent of accents) {
      expect(["hf", "paper", "note"]).toContain(accent);
    }
    expect(new Set(accents).size).toBe(accents.length);
  });
});

describe("RESERVED_SEGMENTS", () => {
  it("어떤 카테고리 slug 도 예약 세그먼트와 겹치지 않는다", () => {
    // 겹치면 `/{category}` 동적 라우트가 정적 라우트에 먹혀 그 카테고리가 도달 불가능해진다.
    for (const category of CATEGORIES) {
      expect(RESERVED_SEGMENTS).not.toContain(category.slug);
    }
  });

  it("실제로 점유된 최상위 세그먼트를 빠짐없이 담는다", () => {
    for (const segment of [
      "topics",
      "tags",
      "archive",
      "about",
      "search",
      "admin",
      "api",
      "rss.xml",
      "sitemap.xml",
      "search-index.json",
    ]) {
      expect(RESERVED_SEGMENTS).toContain(segment);
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
