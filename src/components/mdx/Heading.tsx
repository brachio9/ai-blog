import type { ComponentProps } from "react";

/** id 는 rehype-slug 가 붙인다. 없으면 앵커를 걸 곳이 없으므로 표식도 생략한다. */
function heading(Tag: "h2" | "h3" | "h4", className: string) {
  function MdxHeading({ id, children, ...props }: ComponentProps<"h2">) {
    return (
      <Tag {...props} id={id} className={`group text-heading ${className}`}>
        {children}
        {id ? (
          <a
            href={`#${id}`}
            aria-label="이 절로 가는 링크"
            className="ml-2 text-faint no-underline opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-focus hover:text-heading"
          >
            #
          </a>
        ) : null}
      </Tag>
    );
  }

  MdxHeading.displayName = `Mdx${Tag.toUpperCase()}`;
  return MdxHeading;
}

export const MdxH2 = heading("h2", "text-2xl font-semibold mt-12 mb-4");
export const MdxH3 = heading("h3", "text-xl font-semibold mt-8 mb-3");
export const MdxH4 = heading("h4", "text-lg font-medium mt-6 mb-2");
