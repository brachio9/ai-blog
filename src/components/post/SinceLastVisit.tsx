"use client";

import { useEffect, useSyncExternalStore } from "react";

import type { Post } from "@/types/content";

/** 마지막 방문 시각을 적어 두는 자리. 값은 KST ISO-8601 문자열 그대로다. */
const STORAGE_KEY = "chorok:last-visit";

/**
 * 「지난 방문 이후 N편」.
 *
 * `design/brief.md` 의 「아직 안 정한 것」 첫 줄이 이것이었다 —
 * *"단골 독자에게 가장 중요한데 지금 아무 장치가 없다."* 하루 스무 편이 들어오는 지면에서
 * 「어디까지 봤더라」를 사람이 날짜로 세게 두면 그 사람은 곧 안 온다.
 *
 * **서버는 이 값을 모른다.** 브라우저에만 있고 `useEffect` 뒤에만 그린다 —
 * 첫 렌더가 비어 있어야 정적 HTML 과 어긋나지 않는다 (하이드레이션 불일치는
 * 조용히 틀리는 쪽이라 더 나쁘다). 그래서 SSG 도 그대로다.
 *
 * 방문 시각은 **그릴 때 갱신하지 않는다.** 지금 세션 안에서 새로고침할 때마다 숫자가
 * 0으로 떨어지면 「내가 못 본 것」이 아니라 「방금 눌렀나」를 세게 된다.
 * 대신 페이지를 떠날 때 적는다.
 */
export function SinceLastVisit({ posts }: { posts: Post[] }) {
  // 서버 스냅샷이 `null` 이라 정적 HTML 에는 이 자리가 없다 — 하이드레이션이 갈리지 않는다.
  const previous = useSyncExternalStore(subscribe, readLastVisit, () => null);

  useEffect(() => {
    // 떠날 때 지금을 적는다. 이 세션 동안 숫자가 흔들리지 않게 하려는 것이다.
    const stamp = () => {
      try {
        window.localStorage.setItem(STORAGE_KEY, nowInKst());
      } catch {
        // 사생활 보호 모드 등에서 막힌다 — 이 표시가 없다고 지면이 망가지지는 않는다.
      }
    };
    window.addEventListener("pagehide", stamp);
    return () => {
      window.removeEventListener("pagehide", stamp);
      stamp();
    };
  }, []);

  if (previous === null) {
    return null;
  }

  const count = posts.filter(
    (post) => post.frontmatter.publishedAt > previous,
  ).length;
  if (count === 0) {
    return null;
  }

  return (
    <span className="voice-ui text-heading">
      지난 방문 이후 <span className="voice-source">{count}</span>편
    </span>
  );
}

/** 세션 중에 바뀌지 않는 값이라 구독할 것이 없다 — 형식만 갖춘다. */
function subscribe(): () => void {
  return () => {};
}

function readLastVisit(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * 지금을 KST ISO-8601 로. **글의 `publishedAt` 과 같은 꼴이어야 문자열 비교가 성립한다** —
 * 그 값은 스키마가 `+0900` 으로 고정하므로 여기서도 오프셋을 고정한다.
 */
function nowInKst(): string {
  const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const shifted = new Date(Date.now() + KST_OFFSET_MS);
  return `${shifted.toISOString().slice(0, 19)}+0900`;
}
