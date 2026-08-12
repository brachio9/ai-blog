"use client";

import { useEffect, useState } from "react";

/** 코드블록의 복사 버튼. 클라이언트가 필요한 부분은 여기 하나뿐이다. */
export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "복사됨" : "코드 복사"}
      title={copied ? "복사됨" : "코드 복사"}
      className="pointer-events-auto rounded border border-border bg-surface p-1.5 text-muted opacity-0 transition-opacity hover:text-heading focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-accent group-hover:opacity-100"
    >
      {copied ? <CheckIcon /> : <ClipboardIcon />}
    </button>
  );
}

function ClipboardIcon() {
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
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M6 15H5.5A1.5 1.5 0 0 1 4 13.5v-8A1.5 1.5 0 0 1 5.5 4h8A1.5 1.5 0 0 1 15 5.5V6" />
    </svg>
  );
}

function CheckIcon() {
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
    >
      <path d="M4.5 12.5 9 17l10.5-10.5" />
    </svg>
  );
}
