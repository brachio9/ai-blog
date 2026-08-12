import type { ComponentProps } from "react";

/**
 * 표는 좁은 화면에서 **표만** 가로 스크롤되어야 한다 — 페이지 본문이 밀리면 안 된다.
 * 그래서 스크롤 컨테이너로 감싸고, 표 자신은 max-content 폭을 갖는다.
 * 우측 페이드는 globals.css 의 .mdx-scroll-x 가 담당한다 (스크롤 가능할 때만 보인다).
 */
export function MdxTable({ children, ...props }: ComponentProps<"table">) {
  return (
    <div className="mdx-scroll-x my-6 rounded-md border border-border">
      <table {...props} className="w-max min-w-full border-collapse text-left">
        {children}
      </table>
    </div>
  );
}

export function MdxTh({ children, ...props }: ComponentProps<"th">) {
  return (
    <th
      {...props}
      className="border-b border-border bg-surface px-3 py-2 text-sm font-medium text-heading"
    >
      {children}
    </th>
  );
}

export function MdxTd({ children, ...props }: ComponentProps<"td">) {
  return (
    <td {...props} className="border-b border-border px-3 py-2 text-sm">
      {children}
    </td>
  );
}
