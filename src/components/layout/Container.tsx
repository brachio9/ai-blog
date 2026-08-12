import type { ReactNode } from "react";

/** 페이지 컨테이너 — docs/UI_GUIDE.md 의 레이아웃 규격. */
export function Container({ children }: { children: ReactNode }) {
  return <div className="max-w-6xl mx-auto px-5 md:px-8">{children}</div>;
}
