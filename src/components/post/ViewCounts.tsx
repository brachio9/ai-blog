"use client";

import Link from "next/link";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { formatCount } from "@/lib/format";

/**
 * 목록의 조회수 — 목록은 SSG 이고 조회수는 런타임 값이다.
 *
 * 빌드 타임에 Turso 를 읽으면 (1) 숫자가 다음 배포까지 고정되고 (2) Turso 장애가 빌드를
 * 깨뜨린다 (docs/ARCHITECTURE.md: 부가 기능이 본문을 인질로 잡으면 안 된다).
 * 그래서 표는 조회수 없이 정적으로 렌더되고 여기서 한 번의 배치 호출로 채운다.
 * 실패하면 그 열만 빈 채로 남는다.
 *
 * 글 상세의 ViewCount 와 역할이 다르다 — 여기서는 **절대 증가시키지 않는다.**
 * 목록을 보는 것은 조회가 아니다.
 */
const ViewsContext = createContext<Record<string, number> | null>(null);

export interface ViewCountsProps {
  /** 채울 글 id (`{category}/{slug}`) 목록. 한 페이지의 표 전부를 모아서 넘긴다. */
  ids: string[];
  children: ReactNode;
}

/**
 * 넘겨받은 id 를 한 번에 물어보고 그 결과를 아래 트리에 흘린다.
 * 표가 여럿이어도 감싸는 쪽에서 id 를 모아 넘기면 호출은 한 번이다.
 */
export function ViewCounts({ ids, children }: ViewCountsProps) {
  const [views, setViews] = useState<Record<string, number> | null>(null);

  // 배열은 렌더마다 새로 만들어지므로 effect 는 문자열로 비교한다 (같은 목록이면 다시 부르지 않는다).
  const query = [...new Set(ids)].join(",");

  useEffect(() => {
    if (query === "") {
      return;
    }

    let active = true;
    request(query)
      .then((next) => {
        if (active) setViews(next);
      })
      // 실패는 조용히 사라진다 — 독자에게 보일 것이 없다. 값이 없으면 아무것도 그리지 않는다.
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [query]);

  return <ViewsContext value={views}>{children}</ViewsContext>;
}

/**
 * 표의 조회수 칸 내용. 자리(열 폭)는 PostTable 의 머리글이 잡아 두므로
 * 값이 늦게 들어와도 표가 흔들리지 않는다.
 */
export function ViewCell({ postId }: { postId: string }) {
  const views = useContext(ViewsContext);
  const count = views?.[postId] ?? 0;

  // 0 은 그리지 않는다 — 기록이 없는 글과 실제로 0회인 글을 구분할 수 없다.
  return count > 0 ? formatCount(count) : null;
}

export interface RankedPost {
  /** `{category}/{slug}` — 글 상세 URL 과 같다 */
  postId: string;
  title: string;
}

/**
 * 조회수 순위. 데이터가 클라이언트에 있으므로 정렬도 여기서 한다.
 * 동률은 postId 코드포인트순 — localeCompare 는 실행 환경의 ICU 에 따라 결과가 갈린다.
 */
export function rankByViews(
  posts: RankedPost[],
  views: Record<string, number> | null,
  limit: number,
): (RankedPost & { count: number })[] {
  if (!views) {
    return [];
  }

  return posts
    .map((post) => ({ ...post, count: views[post.postId] ?? 0 }))
    // 기록이 없는 글은 순위에 넣지 않는다. 0 을 보여 줄 자리가 아니다.
    .filter((post) => post.count > 0)
    .sort(
      (a, b) =>
        b.count - a.count ||
        (a.postId < b.postId ? -1 : a.postId > b.postId ? 1 : 0),
    )
    .slice(0, limit);
}

/**
 * 많이 읽힌 글 — 표를 하나 더 붙이지 않는다 (docs/UI_GUIDE.md "균일함을 피하라").
 * 순위·제목·조회수 세 조각만 남긴 줄 목록이다.
 *
 * 조회수를 못 받았거나 아무 글도 읽히지 않았으면 **구역 자체를 그리지 않는다.**
 * 빈 상자가 남는 쪽이 없는 것보다 나쁘다.
 */
export function PopularPosts({
  posts,
  limit = 3,
}: {
  posts: RankedPost[];
  limit?: number;
}) {
  const views = useContext(ViewsContext);
  const ranked = rankByViews(posts, views, limit);

  if (ranked.length === 0) {
    return null;
  }

  return (
    <section className="mt-14 border-t border-border pt-5">
      <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
        많이 읽힌 글
      </h2>

      <ol className="mt-1">
        {ranked.map((post, index) => (
          <li key={post.postId} className="flex items-baseline gap-3 py-1.5">
            {/* 순서는 <ol> 이 이미 알린다 — 이 숫자는 눈으로 읽는 쪽에만 필요하다.
                다만 읽는 숫자이므로 대비가 모자란 faint 를 쓰지 않는다. */}
            <span
              aria-hidden="true"
              className="w-3 shrink-0 font-mono text-xs text-muted tabular-nums"
            >
              {index + 1}
            </span>
            <Link
              href={`/${post.postId}`}
              className="min-w-0 flex-1 truncate text-[0.9375rem] text-heading underline-offset-[0.2em] transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-focus"
            >
              {post.title}
            </Link>
            <span className="shrink-0 font-mono text-xs text-muted tabular-nums">
              조회 {formatCount(post.count)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** 배치 조회. 증가는 여기서 일어나지 않는다 (GET 뿐이다). */
async function request(query: string): Promise<Record<string, number>> {
  const response = await fetch(`/api/views?ids=${encodeURIComponent(query)}`);
  if (!response.ok) {
    throw new Error(`조회수 응답 ${response.status}`);
  }

  const data: unknown = await response.json();
  const views = (data as { views?: unknown })?.views;
  if (typeof views !== "object" || views === null) {
    throw new Error("조회수 응답 형식이 다르다");
  }

  return views as Record<string, number>;
}
