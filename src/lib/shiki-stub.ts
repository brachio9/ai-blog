/**
 * `next.config.ts` 의 `turbopack.resolveAlias` 가 서버 번들의 `import ... from "shiki"` 를 여기로 돌린다.
 *
 * rehype-pretty-code 는 기본 하이라이터용으로 `shiki` 의 전체 번들을 import 한다. 우리는
 * `getHighlighter` 를 직접 넘기므로(`src/lib/mdx.ts`) 그 import 는 쓰이지 않는데, 남겨 두면
 * 모든 언어 문법(gzip 1 MiB+)과 oniguruma WASM 이 Cloudflare Workers 번들에 실린다.
 * `shiki/core` 같은 하위 경로는 그대로 진짜 shiki 를 쓴다.
 */
export function getSingletonHighlighter(): never {
  throw new Error(
    "shiki 전체 번들은 빠져 있다 — rehype-pretty-code 에 getHighlighter 를 넘겨라 (src/lib/mdx.ts)",
  );
}
