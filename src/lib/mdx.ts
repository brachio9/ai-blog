import type { MDXComponents } from "mdx/types";
import { MDXRemote, type MDXRemoteProps } from "next-mdx-remote/rsc";
import rehypeKatex from "rehype-katex";
import rehypePrettyCode, {
  type Options as RehypePrettyCodeOptions,
} from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
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
const PRETTY_CODE_OPTIONS: RehypePrettyCodeOptions = {
  theme: { light: "github-light", dark: "github-dark" },
  defaultLang: "plaintext",
  // 타입은 전체 번들의 Highlighter 를 요구하지만 rehype-pretty-code 는 core 의 메서드만 쓴다.
  getHighlighter: () =>
    (highlighter ??= createHighlighter()) as ReturnType<
      NonNullable<RehypePrettyCodeOptions["getHighlighter"]>
    >,
};

/**
 * **싣는 언어를 고른다.** 기본(shiki 전체 번들)은 언어 문법만 gzip 1 MiB 가 넘어
 * Cloudflare Workers 무료 한도(3 MiB)를 혼자 깎아 먹는다. 2026-11 기준 글 885편에
 * 코드 펜스는 한 개도 없다 — 흔한 언어만 싣는다.
 *
 * 목록에 없는 언어가 와도 빌드는 깨지지 않는다: rehype-pretty-code 가 언어를 못 찾으면
 * plaintext 로 칠한다 (mdx.test.ts 가 고정한다). 야간 봇이 낯선 언어를 들고 와도
 * 그날 발행이 0편이 되지 않는다. 별칭(`bash`·`sh`·`ts`·`py`·`yml`)은 문법이 함께 등록한다.
 *
 * 엔진은 JS 정규식이다. oniguruma 는 WASM 이라 번들이 더 크고, Workers 는 런타임 WASM 컴파일도 막는다.
 * `forgiving` 은 JS 로 못 옮기는 정규식이 있어도 던지지 않고 그 규칙만 건너뛴다.
 */
let highlighter: ReturnType<typeof createHighlighterCore> | undefined;

function createHighlighter() {
  return createHighlighterCore({
    themes: [
      import("shiki/themes/github-light.mjs"),
      import("shiki/themes/github-dark.mjs"),
    ],
    langs: [
      import("shiki/langs/typescript.mjs"),
      import("shiki/langs/javascript.mjs"),
      import("shiki/langs/json.mjs"),
      import("shiki/langs/shellscript.mjs"),
      import("shiki/langs/python.mjs"),
      import("shiki/langs/yaml.mjs"),
      import("shiki/langs/toml.mjs"),
      import("shiki/langs/diff.mjs"),
      import("shiki/langs/sql.mjs"),
    ],
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  });
}

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

type MdxCompilerOptions = NonNullable<
  NonNullable<MDXRemoteProps["options"]>["mdxOptions"]
>;

/**
 * 플러그인 설정은 **이 객체 하나**다 (ADR-003).
 * 관리자 프리뷰는 없앴다 — Cloudflare Workers 가 런타임 MDX 실행(`new Function`)을 막는다.
 */
const MDX_OPTIONS: MdxCompilerOptions = {
  remarkPlugins: [remarkGfm, remarkMath, remarkMermaid],
  // rehypeKatex 가 rehypePrettyCode 보다 앞이어야 한다 —
  // 뒤에 두면 하이라이터가 수식 안의 문자를 먼저 건드린다.
  rehypePlugins: [
    rehypeSlug,
    rehypeKatex,
    [rehypePrettyCode, PRETTY_CODE_OPTIONS],
  ],
};

/** MDX 문자열을 React 엘리먼트로 컴파일한다. Server Component 에서 호출한다. */
export function renderMdx(
  source: string,
  options?: RenderMdxOptions,
): ReactElement {
  return createElement(MDXRemote, {
    source,
    components: { ...MDX_COMPONENTS, ...options?.components },
    options: { mdxOptions: MDX_OPTIONS },
  });
}
