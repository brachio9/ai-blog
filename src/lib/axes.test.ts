import { describe, expect, it } from "vitest";

import { AXES, axisHref, axisNumber, getAxis } from "./axes";

describe("AXES", () => {
  it("PRD 의 주제 축 6종을 순서대로 갖는다", () => {
    expect(AXES.map((axis) => axis.slug)).toEqual([
      "retrieval",
      "serving",
      "voice",
      "agent",
      "domain",
      "vibe-coding",
    ]);
  });

  it("slug 가 중복되지 않는다", () => {
    const slugs = AXES.map((axis) => axis.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("번호가 1부터 6까지 빈칸 없이 이어진다", () => {
    // 번호가 축의 부호다 — 비거나 겹치면 화면의 '01'~'06' 이 목차 노릇을 못 한다.
    expect(AXES.map((axis) => axis.order)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("모든 축에 이름과 설명이 있다", () => {
    for (const axis of AXES) {
      expect(axis.name).not.toBe("");
      expect(axis.description).not.toBe("");
    }
  });

  it("짧은 이름은 좁은 자리에 들어갈 만큼 짧다", () => {
    for (const axis of AXES) {
      expect(axis.shortName.length).toBeGreaterThanOrEqual(1);
      expect(axis.shortName.length).toBeLessThanOrEqual(4);
    }
  });

  it("대표 키워드를 6~10개씩 갖는다", () => {
    for (const axis of AXES) {
      expect(axis.covers.length).toBeGreaterThanOrEqual(6);
      expect(axis.covers.length).toBeLessThanOrEqual(10);
    }
  });

  it("어떤 축에도 색 토큰 키가 없다", () => {
    // 안료 3색은 카테고리 전용이고 네 번째 안료는 사실상 없다.
    // 축의 부호는 번호이며, 여기에 accent 가 생기는 순간 UI_GUIDE 의 축-색 금지가 무너진다.
    for (const axis of AXES) {
      expect(Object.keys(axis)).not.toContain("accent");
    }
  });
});

describe("axisHref", () => {
  it("축은 /topics 아래에 둔다", () => {
    for (const axis of AXES) {
      expect(axisHref(axis)).toBe(`/topics/${axis.slug}`);
    }
  });
});

describe("axisNumber", () => {
  it("두 자리로 자릿수를 맞춘다 — 축의 부호는 색이 아니라 이 번호다", () => {
    expect(AXES.map(axisNumber)).toEqual([
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
    ]);
  });
});

describe("getAxis", () => {
  it("등록된 slug 는 해당 축을 준다", () => {
    for (const axis of AXES) {
      expect(getAxis(axis.slug)).toEqual(axis);
    }
  });

  it("미지의 slug 는 undefined 를 준다", () => {
    expect(getAxis("does-not-exist")).toBeUndefined();
    expect(getAxis("")).toBeUndefined();
  });
});
