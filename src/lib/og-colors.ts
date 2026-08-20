import type { CategoryAccent } from "./categories";
import { oklchToHex } from "./color";

/**
 * 소셜 카드(`opengraph-image.tsx`)가 쓰는 색. **여기가 유일한 예외 지대다.**
 *
 * satori 는 `oklch()` 도 CSS 변수도 읽지 못한다. 그래서 카드만 hex 를 필요로 한다.
 * 예전에는 그 hex 를 손으로 계산해 주석과 함께 적어 뒀는데, 팔레트가 바뀌면
 * **아무도 모르게 옛 색으로 남는다** — 실제로 이번 개편에서 그렇게 될 뻔했다.
 *
 * 이제는 정본과 같은 OKLCH 값에서 빌드 시점에 굽는다. 남은 위험은 「여기 적힌 OKLCH 가
 * 정본과 갈리는 것」 하나뿐이고, 그건 `design-tokens.test.ts` 가 두 파일을 비교해 잡는다.
 *
 * 카드는 늘 **낮 지면**이다 — 남의 서비스 안에서 뜨는 그림이라 우리 테마를 따라올 수 없다.
 */
export const OG_GROUND = {
  /** 흰 바탕 채팅창 안에서 카드 경계가 보이도록 순백이 아니라 --surface 를 쓴다. */
  bg: oklchToHex(0.985, 0.002, 255),
  border: oklchToHex(0.905, 0.005, 255),
  heading: oklchToHex(0.215, 0.014, 255),
  muted: oklchToHex(0.48, 0.012, 255),
} as const;

/** 카테고리 부호 — 정본 `:root` 의 `--cat-*` (낮) 과 같은 값. */
export const OG_ACCENT: Record<CategoryAccent, string> = {
  paper: oklchToHex(0.5, 0.07, 148),
  release: oklchToHex(0.5, 0.07, 40),
  news: oklchToHex(0.5, 0.07, 250),
  community: oklchToHex(0.48, 0.012, 255),
  note: oklchToHex(0.285, 0.014, 255),
};
