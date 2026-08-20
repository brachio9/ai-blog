/**
 * OKLCH → sRGB 변환과 대비비. 의존성 없음.
 *
 * **왜 있나.** 두 곳에서 같은 계산을 손으로 하고 있었다:
 *
 * 1. `opengraph-image.tsx` — satori 가 `oklch()` 를 못 읽어 hex 를 손으로 적어 뒀다
 * 2. 팔레트를 고칠 때마다 일회성 스크립트로 색역·대비를 재고 버렸다
 *
 * 그 계산을 코드로 만들어 `design-tokens.test.ts` 가 매번 돌린다. 채도를 올리다
 * sRGB 색역을 벗어나거나 대비가 4.5:1 아래로 떨어지면 **테스트가 잡는다.**
 *
 * 변환은 Björn Ottosson 의 Oklab 정의를 그대로 옮긴 것이다.
 */

export type Rgb = { r: number; g: number; b: number };

/** `oklch(0.715 0.190 148)` · `oklch(1 0 0 / 0.05)` 를 읽는다. 알파는 버린다. */
export function parseOklch(value: string): { l: number; c: number; h: number } {
  const match = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/i.exec(value);
  if (!match) throw new Error(`oklch 로 읽을 수 없다: ${value}`);
  return { l: Number(match[1]), c: Number(match[2]), h: Number(match[3]) };
}

/** 감마 이전의 선형 sRGB. **색역 밖이면 음수나 1 초과가 그대로 나온다** — 그게 판정 근거다. */
export function oklchToLinearRgb(l: number, c: number, h: number): Rgb {
  const rad = (h * Math.PI) / 180;
  const a = c * Math.cos(rad);
  const bb = c * Math.sin(rad);

  const l_ = (l + 0.3963377774 * a + 0.2158037573 * bb) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * bb) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * bb) ** 3;

  return {
    r: 4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    g: -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    b: -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  };
}

const encode = (v: number) =>
  v <= 0.0031308 ? 12.92 * v : 1.055 * Math.abs(v) ** (1 / 2.4) - 0.055;

/** sRGB 색역 안인가. 밖이면 브라우저가 잘라 내 **의도한 색이 아닌 것이 그려진다.** */
export function inGamut(l: number, c: number, h: number): boolean {
  const { r, g, b } = oklchToLinearRgb(l, c, h);
  return [r, g, b].every((v) => v >= -0.0005 && v <= 1.0005);
}

/** `#rrggbb`. satori 처럼 `oklch()` 를 못 읽는 곳에 넘길 값이다. */
export function oklchToHex(l: number, c: number, h: number): string {
  const linear = oklchToLinearRgb(l, c, h);
  const channel = (v: number) =>
    Math.round(Math.min(1, Math.max(0, encode(v))) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(linear.r)}${channel(linear.g)}${channel(linear.b)}`;
}

/** WCAG 상대 휘도. 선형 sRGB 가 이미 그 정의라 계수만 곱한다. */
export function luminance(l: number, c: number, h: number): number {
  const { r, g, b } = oklchToLinearRgb(l, c, h);
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return 0.2126 * clamp(r) + 0.7152 * clamp(g) + 0.0722 * clamp(b);
}

/** WCAG 대비비 (1~21). 본문은 4.5:1, 큰 글자·비텍스트는 3:1 이 기준이다. */
export function contrast(a: string, b: string): number {
  const lum = (value: string) => {
    const { l, c, h } = parseOklch(value);
    return luminance(l, c, h);
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
