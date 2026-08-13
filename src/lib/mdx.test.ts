import { render } from "@testing-library/react";
import { createElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { compileMdxChecked, renderMdx } from "./mdx";

/**
 * renderMdx 는 서버에서 await 되는 엘리먼트를 돌려준다.
 * 테스트에는 RSC 런타임이 없으므로 컴포넌트를 직접 호출해 컴파일 결과를 얻는다.
 */
async function compile(element: ReactElement) {
  const component = element.type as (props: unknown) => Promise<ReactElement>;
  return render(await component(element.props));
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

describe("compileMdxChecked", () => {
  it("정상 MDX 는 ok: true 와 렌더 가능한 트리를 준다", async () => {
    const result = await compileMdxChecked(SOURCE);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { container } = render(result.content);
    expect(container.querySelector("table")).not.toBeNull();
    expect(container.querySelector("pre[data-theme]")).not.toBeNull();
  });

  it("renderMdx 와 같은 플러그인 설정을 쓴다 (수식·mermaid)", async () => {
    const charts: string[] = [];
    const Diagram = ({ chart }: { chart?: string }) => {
      charts.push(chart ?? "");
      return createElement("div");
    };

    const result = await compileMdxChecked(
      "$E=mc^2$\n\n```mermaid\ngraph LR\n  A --> B\n```\n",
      { components: { Diagram } },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { container } = render(result.content);
    expect(container.querySelector(".katex")).not.toBeNull();
    expect(charts).toEqual(["graph LR\n  A --> B"]);
  });

  it("깨진 MDX 는 던지지 않고 읽을 수 있는 메시지를 준다", async () => {
    const result = await compileMdxChecked("<Broken **\n");

    expect(result.ok).toBe(false);
    if (result.ok) return;

    // 빈 메시지면 관리자는 무엇이 틀렸는지 알 수 없다.
    expect(result.message.length).toBeGreaterThan(0);
    expect(result.message).toContain("MDX");
  });
});
