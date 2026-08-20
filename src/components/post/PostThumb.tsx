import type { Post } from "@/types/content";

/**
 * 목록 행의 왼쪽 고정폭 그림 자리 — 16:9, 80×45.
 *
 * **지금은 표지만 그린다.** 원문 그림 주소(`source.image`)를 채우는 것은 수집기 쪽 일이라
 * 뒤 step 에서 `<img>` 가 이 상자 안에 얹힌다. 그때 열 폭이 바뀌지 않도록 상자를 먼저 세운다.
 *
 * 표지는 **카테고리 안료를 지면에 아주 옅게 섞은 판**이다 (globals.css `.thumb`).
 * 안료를 그대로 칠하면 스무 행에 큰 색판 스무 개가 서서 부호가 아니라 벽지가 된다 —
 * 안료의 명도는 원래 작은 글자용이다.
 *
 * **축 번호를 여기 적지 않는다.** 바로 오른쪽 열이 이미 그 번호다. 굽지 않으므로 요청도
 * 빌드도 0 이고, `opengraph-image.tsx` 가 경고한 satori 의 oklch 수동 동기화를
 * 한 곳 더 만들지도 않는다 — 1200×630 카드를 80×45 로 줄여 봐야 제목은 안 읽힌다.
 *
 * `aria-hidden` 인 것은 순수 장식이기 때문이다 — 같은 행의 제목 링크가 이미 그 글을 말한다.
 * 안료는 행(`.row`)의 `.cat-*` 가 정한 `--cat` 을 물려받는다.
 */
export function PostThumb({ post }: { post: Post }) {
  // 지금은 상자만 그리지만 곧 이 글의 그림 주소를 읽는다 — 계약을 미리 세워 둔다.
  void post;

  return <div aria-hidden className="thumb" />;
}
