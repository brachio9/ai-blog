import Link from "next/link";
import type { ComponentProps } from "react";

import { ExternalLinkIcon } from "@/components/ui/icons";

const EXTERNAL_PATTERN = /^https?:\/\//;

const LINK_CLASS =
  "text-accent underline decoration-border underline-offset-2 transition-colors hover:text-accent-hover hover:decoration-current focus-visible:outline-2 focus-visible:outline-accent";

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
