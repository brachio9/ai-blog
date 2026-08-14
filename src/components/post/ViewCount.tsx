"use client";

import { useEffect, useState } from "react";

import { formatCount } from "@/lib/format";

/**
 * 조회수 — 글 상세는 정적 생성(SSG) 이라 서버에서 읽지 않고 여기서 API 를 부른다.
 * 실패하거나 추적이 꺼져 있으면 아무것도 그리지 않는다 (독자에게 에러를 보이지 않는다).
 */
export function ViewCount({ postId }: { postId: string }) {
  const [count, setCount] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    request(postId)
      .then((next) => {
        if (active) setCount(next);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
    };
  }, [postId]);

  // 실패는 조용히 사라진다. 추적이 꺼져 있으면 API 가 0 을 주므로 이때도 그리지 않는다.
  if (failed || count === 0) {
    return null;
  }

  return (
    /* 데이트라인의 한 조각이다 — 구분 기호는 그쪽의 gap 이 맡으므로 여기서 달지 않는다.
       숫자가 늦게 들어와도 뒤따르는 조각이 밀리지 않도록 폭을 먼저 예약한다. */
    <span className="voice-ui inline-block min-w-[7ch] text-muted">
      {count === null ? (
        ""
      ) : (
        <>
          조회 <span className="voice-source">{formatCount(count)}</span>
        </>
      )}
    </span>
  );
}

async function request(postId: string): Promise<number> {
  // 세션당 한 번만 증가시킨다. StrictMode 로 effect 가 두 번 돌아도 표시를 먼저 남기므로 두 번 오르지 않는다.
  const response = firstVisit(postId)
    ? await fetch("/api/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      })
    : await fetch(`/api/views?id=${encodeURIComponent(postId)}`);

  if (!response.ok) {
    throw new Error(`조회수 응답 ${response.status}`);
  }

  const data: unknown = await response.json();
  const count = (data as { count?: unknown })?.count;
  if (typeof count !== "number") {
    throw new Error("조회수 응답 형식이 다르다");
  }

  return count;
}

/** 이 세션에서 처음 보는 글인지. 표시를 남기는 것까지 여기서 끝낸다. */
function firstVisit(postId: string): boolean {
  const key = `viewed:${postId}`;
  try {
    if (sessionStorage.getItem(key) !== null) {
      return false;
    }
    sessionStorage.setItem(key, "1");
    return true;
  } catch {
    // sessionStorage 를 못 쓰면 증가시키지 않는다 — 새로고침마다 오르는 쪽이 더 나쁘다.
    return false;
  }
}
