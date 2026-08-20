import { describe, expect, it } from "vitest";

import { contrast, inGamut, oklchToHex, parseOklch } from "./color";

describe("color", () => {
  it("알려진 값과 맞는다 — 흰색·검정·먹 지면", () => {
    expect(oklchToHex(1, 0, 0)).toBe("#ffffff");
    expect(oklchToHex(0, 0, 0)).toBe("#000000");
    // 새 팔레트의 밤 지면. 정본과 이 값이 갈리면 소셜 카드가 사이트와 다른 색이 된다.
    expect(oklchToHex(0.165, 0.013, 255)).toBe("#0b0f14");
  });

  it("알파가 붙어도 읽는다 — `--edge-top` 이 그 모양이다", () => {
    expect(parseOklch("oklch(1 0 0 / 0.05)")).toEqual({ l: 1, c: 0, h: 0 });
  });

  it("대비비는 WCAG 정의를 따른다", () => {
    // 흰 바탕 위 검정 글자는 정의상 21:1 이다.
    expect(contrast("oklch(1 0 0)", "oklch(0 0 0)")).toBeCloseTo(21, 1);
    expect(contrast("oklch(0.5 0 0)", "oklch(0.5 0 0)")).toBeCloseTo(1, 5);
  });

  it("색역 밖을 잡는다 — **채도를 올리다 넘어가는 것이 이 함수의 존재 이유다**", () => {
    expect(inGamut(0.715, 0.19, 148)).toBe(true);
    // 같은 명도·색상에서 채도만 올리면 sRGB 를 벗어난다. 브라우저는 말없이 잘라 낸다.
    expect(inGamut(0.715, 0.34, 148)).toBe(false);
  });
});
