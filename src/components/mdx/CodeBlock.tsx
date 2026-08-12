import { isValidElement, type ComponentProps, type ReactNode } from "react";

import { CopyButton } from "./CopyButton";

/** 복사할 원문. 하이라이팅된 트리에서 텍스트만 모은다 (줄바꿈은 텍스트 노드로 남아 있다). */
function textOf(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return textOf(node.props.children);
  }

  return "";
}

/**
 * `pre` 매핑. rehype-pretty-code 가 붙인 data-* 와 style(--shiki-*) 은 그대로 넘겨야
 * globals.css 의 이중 테마 규칙이 걸린다.
 */
export function MdxCodeBlock({
  children,
  ...props
}: ComponentProps<"pre"> & { "data-language"?: string }) {
  const language = props["data-language"];

  return (
    <div className="group relative my-6 overflow-hidden rounded-md border border-border">
      <div className="pointer-events-none absolute right-2 top-2 flex items-center gap-2">
        {language ? (
          <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-xs text-muted">
            {language}
          </span>
        ) : null}
        <CopyButton text={textOf(children).trimEnd()} />
      </div>
      <pre
        {...props}
        className={`overflow-x-auto pb-4 font-mono text-sm leading-[1.7] [&_[data-line]]:px-4 ${
          // 라벨·복사 버튼이 첫 줄을 가리지 않도록 자리를 비운다.
          language ? "pt-10" : "pt-4"
        }`}
      >
        {children}
      </pre>
    </div>
  );
}
