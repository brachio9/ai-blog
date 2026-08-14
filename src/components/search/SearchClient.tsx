"use client";

import MiniSearch from "minisearch";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { PostList } from "@/components/post/PostList";
import { SearchIcon } from "@/components/ui/icons";
import type { SearchDoc } from "@/lib/feed";

/** 빌드 타임에 만들어진 정적 인덱스. 서버도 DB 도 쓰지 않는다 (ADR-007). */
const INDEX_URL = "/search-index.json";

/** 타이핑마다 URL 을 갈아치우지 않는다. */
const DEBOUNCE_MS = 200;

/** 본문은 인덱스에 없다 — 제목·요약·태그까지가 검색 범위다. */
const SEARCH_FIELDS = ["title", "summary", "tags"];

/**
 * 한글은 조사가 붙어 한 토큰이 된다("벤치마크를"). 기본 토크나이저는 공백·문장부호로만
 * 끊으므로 prefix 매칭이 있어야 "벤치마" 로 "벤치마크" 가 잡힌다.
 * 여러 단어를 넣으면 AND — 글이 수백 건 규모라 좁히는 쪽이 쓸모 있다.
 */
const SEARCH_OPTIONS = { prefix: true, combineWith: "AND" } as const;

export function SearchClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL 이 검색 상태의 단일 진실 공급원이다 — 그래야 링크를 그대로 공유할 수 있다.
  const query = (searchParams.get("q") ?? "").trim();

  const [docs, setDocs] = useState<SearchDoc[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [draft, setDraft] = useState(query);

  // 인덱스는 한 번만 받는다. 입력할 때마다 다시 받으면 검색이 네트워크에 묶인다.
  useEffect(() => {
    let alive = true;

    fetch(INDEX_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`검색 인덱스 응답 ${response.status}`);
        }
        return response.json();
      })
      .then((loaded: SearchDoc[]) => {
        if (alive) {
          setDocs(loaded);
        }
      })
      .catch(() => {
        if (alive) {
          setFailed(true);
        }
      });

    return () => {
      alive = false;
    };
  }, []);

  // 우리가 밀어 넣은 URL 변경으로 입력창을 되돌리면 타이핑이 씹힌다. 밖에서 온 변경만 반영한다.
  const pushed = useRef(query);
  useEffect(() => {
    if (query !== pushed.current) {
      pushed.current = query;
      setDraft(query);
    }
  }, [query]);

  useEffect(() => {
    const next = draft.trim();
    if (next === query) {
      return;
    }

    const timer = setTimeout(() => {
      pushed.current = next;
      // 검색어가 바뀌면 태그·페이지는 리셋한다 — 이전 필터가 남으면 결과가 비어 보인다.
      router.replace(
        next ? `/search?q=${encodeURIComponent(next)}` : "/search",
        { scroll: false },
      );
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [draft, query, router]);

  const engine = useMemo(() => {
    if (!docs) {
      return null;
    }

    const index = new MiniSearch<SearchDoc>({
      fields: SEARCH_FIELDS,
      idField: "id",
    });
    index.addAll(docs);
    return index;
  }, [docs]);

  /** SearchDoc 은 PostListItem 의 필드를 모두 갖는다 — 목록 UI 를 새로 만들지 않는다. */
  const results = useMemo(() => {
    if (!docs) {
      return [];
    }
    if (!query || !engine) {
      // 검색어가 없으면 전체를 보여준다 — PostList 안의 태그 필터로 훑을 수 있다.
      return docs;
    }

    const byId = new Map(docs.map((doc) => [doc.id, doc]));
    return engine
      .search(query, SEARCH_OPTIONS)
      .map((hit) => byId.get(String(hit.id)))
      .filter((doc): doc is SearchDoc => doc !== undefined);
  }, [docs, engine, query]);

  // 태그·페이지 링크가 검색어를 떨어뜨리지 않도록 basePath 에 실어 보낸다.
  const basePath = query ? `/search?q=${encodeURIComponent(query)}` : "/search";

  function status(): string {
    if (failed) {
      return "검색 인덱스를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
    }
    if (!docs) {
      return "검색 인덱스를 불러오는 중입니다.";
    }
    if (!query) {
      return "검색어를 입력하거나 아래 태그로 골라 보세요.";
    }
    return `'${query}' 검색 결과 ${results.length}건`;
  }

  return (
    <div className="space-y-6">
      <div className="max-w-[68ch]">
        <label htmlFor="search-query" className="sr-only">
          검색어
        </label>
        <div className="flex items-center gap-2 rounded border border-border bg-surface px-3 py-2 focus-within:outline-2 focus-within:outline-focus">
          <SearchIcon className="shrink-0 text-muted" />
          <input
            id="search-query"
            type="search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="제목·요약·태그에서 검색"
            autoComplete="off"
            className="w-full min-w-0 bg-transparent text-body outline-none placeholder:text-muted"
          />
        </div>
      </div>

      <p role="status" className="text-sm text-muted">
        {status()}
      </p>

      {docs && query && results.length === 0 ? (
        <div className="rounded-md border border-border bg-surface p-5">
          <p className="text-sm text-body">검색 결과가 없습니다.</p>
          <p className="mt-2 text-sm text-muted">
            다른 검색어를 써 보거나, 검색어를 지우고 태그로 훑어보세요.
          </p>
        </div>
      ) : (
        /* 검색 결과는 색인 성격이다 — 찾던 것을 골라내는 자리라 날짜·제목·구분 3열이면 된다.
           밀도는 기본값 그대로 둔다 (아카이브만큼 촘촘할 이유도, 카테고리만큼 벌릴 이유도 없다). */
        <PostList items={results} basePath={basePath} variant="index" />
      )}
    </div>
  );
}
