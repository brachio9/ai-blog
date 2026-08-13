"use client";

import { useEffect, useState } from "react";

import { CheckIcon, ClipboardIcon } from "@/components/ui/icons";

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
      {copied ? <CheckIcon size={16} /> : <ClipboardIcon size={16} />}
    </button>
  );
}
