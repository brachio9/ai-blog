import type { MDXComponents } from "mdx/types";
import dynamic from "next/dynamic";

import { MdxAnchor } from "./Anchor";
import { Callout } from "./Callout";
import { MdxCodeBlock } from "./CodeBlock";
import { MdxH2, MdxH3, MdxH4 } from "./Heading";
import { MdxImage } from "./Image";
import { MdxParagraph } from "./Paragraph";
import { MdxTable, MdxTd, MdxTh } from "./Table";

/** 다이어그램이 있는 글에서만 청크를 내려받게 한다 (mermaid 는 무겁다). */
const Diagram = dynamic(() => import("./Diagram"));

/** MDX 스코프에 주입하는 기본 컴포넌트. 컴파일은 src/lib/mdx.ts 하나가 담당한다. */
export const MDX_COMPONENTS: MDXComponents = {
  a: MdxAnchor,
  h2: MdxH2,
  h3: MdxH3,
  h4: MdxH4,
  img: MdxImage,
  p: MdxParagraph,
  pre: MdxCodeBlock,
  table: MdxTable,
  th: MdxTh,
  td: MdxTd,
  Callout,
  Diagram,
};

export { MdxBody } from "./MdxBody";
