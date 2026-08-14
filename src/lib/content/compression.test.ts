import { describe, expect, it } from "vitest";

import { compressionRatio, countBodyChars } from "./compression";

describe("countBodyChars", () => {
  it("한글 본문의 글자만 센다 (공백·문장부호 제외)", () => {
    expect(countBodyChars("라우터를 먼저 굳힌다.")).toBe(9);
  });

  it("코드블록을 세지 않는다", () => {
    const body = ["라우터를 먼저 굳힌다.", "", "```ts", "const a = 1;", "```"].join(
      "\n",
    );

    expect(countBodyChars(body)).toBe(countBodyChars("라우터를 먼저 굳힌다."));
  });

  it("인라인 코드를 세지 않는다", () => {
    expect(countBodyChars("임계값은 `threshold` 다.")).toBe(
      countBodyChars("임계값은 다."),
    );
  });

  it("수식을 세지 않는다", () => {
    const body = "손실은 아래와 같다.\n\n$$\n\\mathcal{L} = \\sum_i x_i\n$$\n";

    expect(countBodyChars(body)).toBe(countBodyChars("손실은 아래와 같다."));
  });

  it("JSX 태그는 빼되 그 안의 문장은 센다", () => {
    expect(countBodyChars('<Callout type="warning">재현 시 주의</Callout>')).toBe(
      countBodyChars("재현 시 주의"),
    );
  });

  it("frontmatter 가 붙은 원본 파일을 넘겨도 본문만 센다", () => {
    const raw = [
      "---",
      'title: "제목"',
      "category: papers",
      "---",
      "",
      "라우터를 먼저 굳힌다.",
    ].join("\n");

    expect(countBodyChars(raw)).toBe(countBodyChars("라우터를 먼저 굳힌다."));
  });

  it("링크는 표시 문자열만 세고 URL 은 세지 않는다", () => {
    expect(countBodyChars("[원문](https://arxiv.org/abs/2608.01337) 참고")).toBe(
      countBodyChars("원문 참고"),
    );
  });

  it("이미지의 alt 텍스트는 세지 않는다", () => {
    expect(countBodyChars("![라우팅 그림](/sample/a.svg)\n\n본문이다.")).toBe(
      countBodyChars("본문이다."),
    );
  });

  it("빈 본문은 0 이다", () => {
    expect(countBodyChars("")).toBe(0);
    expect(countBodyChars("```ts\nconst a = 1;\n```")).toBe(0);
  });
});

describe("compressionRatio", () => {
  it("원문 단어 수를 한글 글자 수로 환산해 1/N 을 낸다", () => {
    // 4000 단어 × 2.5 = 10,000자 → 500자 초록이면 1/20
    expect(compressionRatio(4000, 500)).toEqual({
      ratio: 20,
      bodyChars: 500,
      sourceWords: 4000,
    });
  });

  it("정수로 반올림한다", () => {
    // 1000 × 2.5 = 2500 → 2500/600 = 4.16
    expect(compressionRatio(1000, 600)?.ratio).toBe(4);
    // 2500/450 = 5.55
    expect(compressionRatio(1000, 450)?.ratio).toBe(6);
  });

  it("sourceWords 가 없으면 null (비교 대상이 없는 notes 글)", () => {
    expect(compressionRatio(undefined, 500)).toBeNull();
  });

  it("비율이 2 미만이면 null — 1:1 로 추림은 뜻이 없다", () => {
    // 300 × 2.5 = 750 → 750/500 = 1.5. 반올림하면 2 가 되지만 그건 없는 편집이다.
    expect(compressionRatio(300, 500)).toBeNull();
    // 경계 바로 아래: 399 × 2.5 = 997.5 → 1.995
    expect(compressionRatio(399, 500)).toBeNull();
    // 경계: 400 × 2.5 = 1000 → 정확히 2
    expect(compressionRatio(400, 500)?.ratio).toBe(2);
  });

  it("sourceWords 가 0 이하면 null", () => {
    expect(compressionRatio(0, 500)).toBeNull();
    expect(compressionRatio(-100, 500)).toBeNull();
  });

  it("bodyChars 가 0 이면 null", () => {
    expect(compressionRatio(4000, 0)).toBeNull();
  });
});
