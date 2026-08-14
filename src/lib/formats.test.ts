import { describe, expect, it } from "vitest";

import { FORMATS, getFormat } from "./formats";

describe("FORMATS", () => {
  it("PRD 의 발행 포맷 5종을 모두 갖는다", () => {
    expect(FORMATS.map((format) => format.slug)).toEqual([
      "explainer",
      "digest",
      "replication",
      "kr-first",
      "fieldnote",
    ]);
  });

  it("slug 가 중복되지 않는다", () => {
    const slugs = FORMATS.map((format) => format.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("모든 포맷에 이름과 설명이 있다", () => {
    for (const format of FORMATS) {
      expect(format.name).not.toBe("");
      expect(format.description).not.toBe("");
    }
  });

  it("포맷은 주소도 색도 갖지 않는다", () => {
    // 포맷은 라우트가 없고(`?format=` 필터뿐) 안료도 카테고리 전용이다.
    // 필드가 늘어나면 축·카테고리와 부호가 섞인다.
    for (const format of FORMATS) {
      expect(Object.keys(format).sort()).toEqual([
        "description",
        "name",
        "slug",
      ]);
    }
  });
});

describe("getFormat", () => {
  it("등록된 slug 는 해당 포맷을 준다", () => {
    for (const format of FORMATS) {
      expect(getFormat(format.slug)).toEqual(format);
    }
  });

  it("미지의 slug 는 undefined 를 준다", () => {
    expect(getFormat("does-not-exist")).toBeUndefined();
    expect(getFormat("")).toBeUndefined();
  });
});
