import { render } from "@testing-library/react";
import { createElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { renderMdx } from "./mdx";

/**
 * renderMdx 는 서버에서 await 되는 엘리먼트를 돌려준다.
 * 테스트에는 RSC 런타임이 없으므로 컴포넌트를 직접 호출해 컴파일 결과를 얻는다.
 */
async function compile(element: ReactElement) {
  const component = element.type as (props: unknown) => Promise<ReactElement>;
  return render(await component(element.props));
}

/** 코드 블록 안 토큰들의 라이트 테마 색 집합. plaintext 면 기본 글자색 하나뿐이다. */
function tokenColors(container: HTMLElement): Set<string> {
  const colors = new Set<string>();
  container.querySelectorAll("pre[data-theme] span[style]").forEach((span) => {
    const match = span.getAttribute("style")?.match(/--shiki-light:\s*([^;]+)/);
    if (match) colors.add(match[1].trim().toLowerCase());
  });
  return colors;
}

const SOURCE = `# 제목

| a | b |
|:--|--:|
| 1 | 2 |

\`\`\`ts
const answer: number = 42;
\`\`\`
`;

describe("renderMdx", () => {
  it("표와 코드블록이 있는 MDX 를 컴파일한다", async () => {
    const { container } = await compile(renderMdx(SOURCE));

    expect(container.querySelector("table")).not.toBeNull();
    // 이중 테마여야 색이 인라인이 아닌 CSS 변수로 심긴다.
    const pre = container.querySelector("pre[data-theme]");
    expect(pre).not.toBeNull();
    expect(pre?.getAttribute("style")).toContain("--shiki-light");
  });

  it.each(["python", "bash", "ts", "json", "yaml"])(
    "싣는 언어(%s)는 색칠한다",
    async (lang) => {
      const { container } = await compile(
        renderMdx(`\`\`\`${lang}\nx = "a" # 1\n\`\`\`\n`),
      );

      expect(tokenColors(container).size).toBeGreaterThan(1);
    },
  );

  // 야간 봇이 매일 main 에 직접 커밋한다. 낯선 언어 하나로 빌드가 깨지면 그날 발행이 0편이 된다.
  it.each(["haskell", "no-such-lang-xyz"])(
    "싣지 않은 언어(%s)는 빌드를 깨지 않고 plaintext 로 떨어진다",
    async (lang) => {
      const { container } = await compile(
        renderMdx(`\`\`\`${lang}\nmain = putStrLn "hi"\n\`\`\`\n`),
      );

      const plain = await compile(
        renderMdx("```plaintext\nmain = putStrLn \"hi\"\n```\n"),
      );

      // 토큰 마크업이 명시적 plaintext 와 똑같다 = 색칠하지 않고 글자만 남겼다.
      const code = container.querySelector("pre[data-theme] code");
      expect(code?.textContent).toContain('main = putStrLn "hi"');
      expect(code?.innerHTML).toBe(
        plain.container.querySelector("pre[data-theme] code")?.innerHTML,
      );
    },
  );

  it("인라인 수식과 별행 수식을 조판한다", async () => {
    const { container } = await compile(
      renderMdx("질량-에너지 등가는 $E=mc^2$ 이다.\n\n$$\n\\sum_{i=1}^{n} x_i\n$$\n"),
    );

    // .katex 가 없으면 수식이 날것의 텍스트로 남았다는 뜻이다.
    expect(container.querySelector(".katex")).not.toBeNull();
    expect(container.querySelector(".katex-display")).not.toBeNull();
  });

  it("mermaid 코드펜스를 Diagram 으로 넘긴다", async () => {
    const charts: string[] = [];
    const Diagram = ({ chart }: { chart?: string }) => {
      charts.push(chart ?? "");
      return createElement("div");
    };

    const { container } = await compile(
      renderMdx("```mermaid\ngraph LR\n  A --> B\n```\n", {
        components: { Diagram },
      }),
    );

    // 하이라이터가 아니라 Diagram 이 받아야 한다.
    expect(charts).toEqual(["graph LR\n  A --> B"]);
    expect(container.querySelector("pre")).toBeNull();
  });

  it("options.components 가 기본 매핑을 덮어쓴다", async () => {
    const h2 = ({ children }: { children?: ReactNode }) =>
      createElement("h2", { "data-custom": "yes" }, children);

    const { container } = await compile(
      renderMdx("## 제목\n", { components: { h2 } }),
    );

    expect(container.querySelector("h2[data-custom]")).not.toBeNull();
  });
});
