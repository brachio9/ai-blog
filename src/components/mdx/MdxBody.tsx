import type { ReactNode } from "react";

/**
 * 글 본문 래퍼 — 세리프·단폭·넉넉한 행간 (docs/UI_GUIDE.md).
 * 매핑 컴포넌트가 없는 요소(단락·목록·인용 등)의 스타일은 globals.css 의 `.mdx-body` 가 맡는다.
 */
export function MdxBody({ children }: { children: ReactNode }) {
  return (
    <div className="mdx-body max-w-[68ch] font-serif text-[1.0625rem] leading-[1.8] text-body">
      {children}
    </div>
  );
}
