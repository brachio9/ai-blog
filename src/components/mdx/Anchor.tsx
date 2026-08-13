import Link from "next/link";
import type { ComponentProps } from "react";

import { ExternalLinkIcon } from "@/components/ui/icons";

const EXTERNAL_PATTERN = /^https?:\/\//;

/**
 * 본문 링크는 색을 쓰지 않는다 — 카테고리 3색이 이미 색을 정보로 쓰고 있어
 * 링크까지 색을 가지면 화면이 산만해진다. 구분은 밑줄이 맡는다 (UI_GUIDE 링크 절).
 */
const LINK_CLASS =
  "text-heading underline decoration-border underline-offset-[0.2em] transition-colors hover:decoration-heading focus-visible:outline-2 focus-visible:outline-focus";

/** 본문 링크. 내부는 next/link, 외부는 새 탭 + 외부 표시. */
export function MdxAnchor({ href, children, ...props }: ComponentProps<"a">) {
  if (!href) {
    return <span {...props}>{children}</span>;
  }

  if (EXTERNAL_PATTERN.test(href)) {
    return (
      <a
        {...props}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={LINK_CLASS}
      >
        {children}
        <ExternalIcon />
      </a>
    );
  }

  return (
    <Link {...props} href={href} className={LINK_CLASS}>
      {children}
    </Link>
  );
}

/**
 * 링크 글자 뒤에 붙는 외부 표식 — 아이콘 자체는 icons.tsx 가 그리고 여기서는 붙는 자리만 정한다.
 * 출처 표기(SourceNote)도 같은 표식을 쓴다.
 */
export function ExternalIcon() {
  return (
    <ExternalLinkIcon size={16} className="ml-0.5 inline-block align-baseline" />
  );
}
