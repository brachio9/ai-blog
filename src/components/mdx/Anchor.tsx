import Link from "next/link";
import type { ComponentProps } from "react";

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

function ExternalIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="ml-0.5 inline-block align-baseline"
    >
      <path d="M14 4h6v6M20 4l-8.5 8.5M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" />
    </svg>
  );
}
