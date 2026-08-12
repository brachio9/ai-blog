import type { MDXComponents } from "mdx/types";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypeKatex from "rehype-katex";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { createElement, type ReactElement } from "react";

import { MDX_COMPONENTS } from "@/components/mdx";

/** 없으면 수식이 조판되지 않고 날것의 문자 더미로 보인다. 진입점에 묶어 두어 빠뜨릴 수 없게 한다. */
import "katex/dist/katex.min.css";

/**
 * 프로젝트에서 MDX 를 컴파일하는 **유일한** 진입점 (ADR-003).
 * 파일 기반 글도, 나중의 관리자 프리뷰도 이 함수를 그대로 쓴다 —
 * 파이프라인이 갈라지면 "프리뷰는 되는데 발행하면 깨진다" 가 반드시 생긴다.
 */
export interface RenderMdxOptions {
  /** 추가로 주입할 컴포넌트. 같은 키는 기본 매핑을 덮어쓴다. */
  components?: MDXComponents;
}

/**
 * 단일 테마를 주면 shiki 가 색을 인라인 style 로 박아 다크모드에서 못 바꾼다.
 * 이중 테마여야 --shiki-light / --shiki-dark 변수로 심긴다 (globals.css 가 골라 쓴다).
 */
const PRETTY_CODE_OPTIONS = {
  theme: { light: "github-light", dark: "github-dark" },
  defaultLang: "plaintext",
};

/** 다룰 필드만 추린 mdast 노드. 트리를 직접 걷는 데 필요한 만큼만 정의한다. */
interface MdastNode {
  type: string;
  lang?: string | null;
  value?: string;
  children?: MdastNode[];
}

/**
 * ` ```mermaid ` 코드펜스를 `<Diagram chart="..." />` 로 바꾼다.
 *
 * MDX 표현식 속성(`chart={...}`)으로는 넘길 수 없다 — next-mdx-remote v6 는 기본값
 * `blockJS` 로 **모든 JS 표현식을 조용히 제거**해서 프롭이 사라진다. 문자열 속성은 남으므로
 * 펜스 본문을 문자열 속성에 실어 보낸다. remark 단계라 하이라이터는 이 블록을 보지 못한다.
 */
function remarkMermaid() {
  return function transform(tree: MdastNode): undefined {
    if (!tree.children) return;

    tree.children = tree.children.map((child) => {
      if (child.type === "code" && child.lang === "mermaid") {
        return {
          type: "mdxJsxFlowElement",
          name: "Diagram",
          attributes: [
            { type: "mdxJsxAttribute", name: "chart", value: child.value ?? "" },
          ],
          children: [],
        } satisfies MdastNode & Record<string, unknown>;
      }

      transform(child);
      return child;
    });
  };
}

/** MDX 문자열을 React 엘리먼트로 컴파일한다. Server Component 에서 호출한다. */
export function renderMdx(
  source: string,
  options?: RenderMdxOptions,
): ReactElement {
  return createElement(MDXRemote, {
    source,
    components: { ...MDX_COMPONENTS, ...options?.components },
    options: {
      mdxOptions: {
        remarkPlugins: [remarkGfm, remarkMath, remarkMermaid],
        // rehypeKatex 가 rehypePrettyCode 보다 앞이어야 한다 —
        // 뒤에 두면 하이라이터가 수식 안의 문자를 먼저 건드린다.
        rehypePlugins: [
          rehypeSlug,
          rehypeKatex,
          [rehypePrettyCode, PRETTY_CODE_OPTIONS],
        ],
      },
    },
  });
}
