"use client";

import { useEffect, useState } from "react";

import { ChevronDownIcon, ChevronUpIcon } from "@/components/ui/icons";
import type { TocHeading } from "@/lib/toc";

/** 제목이 하나뿐인 글에서 목차는 본문을 한 번 더 적는 것뿐이다. */
const MIN_HEADINGS = 2;

/**
 * 현재 위치로 볼 영역 — 화면 위쪽 35%.
 * 아래를 잘라내지 않으면 화면에 걸친 제목이 전부 "현재" 가 되어 표시가 널뛴다.
 */
const ACTIVE_ZONE = "0px 0px -65% 0px";

export interface TableOfContentsProps {
  headings: TocHeading[];
}

/**
 * 데스크톱은 본문 오른쪽 sticky, 모바일은 본문 위 접이식.
 * id 는 `src/lib/toc.ts` 가 rehype-slug 와 같은 방식으로 만든다 — 링크가 어긋나면 그쪽이 원인이다.
 */
export function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const elements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element) => element !== null);

    if (elements.length === 0) {
      return;
    }

    // 콜백은 바뀐 항목만 준다. 문서 순서로 첫 번째 보이는 제목을 고르려면 상태를 들고 있어야 한다.
    const visibility = new Map<string, boolean>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visibility.set(entry.target.id, entry.isIntersecting);
        }

        const current = elements.find((element) => visibility.get(element.id));
        if (current) {
          setActiveId(current.id);
        }
      },
      { rootMargin: ACTIVE_ZONE },
    );

    for (const element of elements) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < MIN_HEADINGS) {
    return null;
  }

  return (
    <aside className="lg:sticky lg:top-8 lg:order-2 lg:w-56 lg:shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls="table-of-contents"
        className="flex w-full items-center justify-between rounded border border-border px-4 py-2 text-sm text-heading transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent lg:hidden"
      >
        <span>목차</span>
        {isOpen ? (
          <ChevronUpIcon size={16} className="text-muted" />
        ) : (
          <ChevronDownIcon size={16} className="text-muted" />
        )}
      </button>

      <p className="hidden text-sm font-medium text-heading lg:block">목차</p>

      <nav
        id="table-of-contents"
        aria-label="목차"
        className={`mt-3 border-l border-border pl-3 ${isOpen ? "block" : "hidden"} lg:block`}
      >
        <ol className="space-y-1.5 text-sm">
          {headings.map((heading) => (
            <li key={heading.id} className={heading.depth === 3 ? "pl-3" : ""}>
              <a
                href={`#${heading.id}`}
                // 모바일에서는 펼친 목차가 본문을 가린다. 고르면 접는다.
                onClick={() => setIsOpen(false)}
                aria-current={activeId === heading.id ? "location" : undefined}
                className={`block leading-snug transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                  activeId === heading.id
                    ? "text-accent"
                    : "text-muted hover:text-heading"
                }`}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </aside>
  );
}
