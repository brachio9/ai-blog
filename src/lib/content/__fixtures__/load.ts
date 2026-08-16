import path from "node:path";

import { vi } from "vitest";

/**
 * 픽스처 콘텐츠로 로더를 다시 읽어 온다.
 *
 * **왜 실제 `content/` 를 쓰지 않는가**: 이제 그 디렉토리는 봇이 매일 밤 채운다.
 * 「초안이 프로덕션에서 빠지는가」·「태그를 몇 개 세는가」처럼 **콘텐츠의 모양에
 * 기대는 검사**를 거기에 걸어 두면, 검사가 재는 것은 로더가 아니라 그날의 수집 결과가
 * 된다. 실제로 세 번 깨졌다 — 봇 초안이 머지될 때 · 초안이 발행으로 바뀔 때 ·
 * 표본 글을 걷어낼 때.
 *
 * **실제 `content/` 를 읽는 검사는 그대로 남는다.** 다만 그쪽은 개수가 아니라
 * **불변식**만 본다 — 모든 글이 스키마를 지키는가 · 파일명과 `publishedAt` 이 맞는가.
 *
 * `CONTENT_DIR` 이 모듈 로드 시점의 `process.cwd()` 로 굳으므로 `resetModules()` 로
 * 다시 읽는다. 그래서 **반드시 `await` 로 받아 쓴다.**
 */
export const FIXTURE_ROOT = path.join(import.meta.dirname);

export async function loadPosts() {
  vi.resetModules();
  vi.spyOn(process, "cwd").mockReturnValue(FIXTURE_ROOT);
  return import("../posts");
}

export async function loadStats() {
  vi.resetModules();
  vi.spyOn(process, "cwd").mockReturnValue(FIXTURE_ROOT);
  return import("@/lib/stats");
}

/**
 * 통계와 로더를 **같은 모듈 그래프에서** 받는다. 따로 부르면 사이에 `resetModules()` 가
 * 끼어 서로 다른 인스턴스가 되고, 「통계가 센 것」과 「로더가 준 것」을 맞대 볼 수 없다.
 */
export async function loadStatsAndPosts() {
  vi.resetModules();
  vi.spyOn(process, "cwd").mockReturnValue(FIXTURE_ROOT);
  return { ...(await import("@/lib/stats")), ...(await import("../posts")) };
}
