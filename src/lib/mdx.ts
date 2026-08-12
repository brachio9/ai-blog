import type { MDXComponents } from "mdx/types";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { createElement, type ReactElement } from "react";

import { MDX_COMPONENTS } from "@/components/mdx";

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
        remarkPlugins: [remarkGfm],
        rehypePlugins: [rehypeSlug, [rehypePrettyCode, PRETTY_CODE_OPTIONS]],
      },
    },
  });
}
