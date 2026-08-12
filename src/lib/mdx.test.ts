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

  it("options.components 가 기본 매핑을 덮어쓴다", async () => {
    const h2 = ({ children }: { children?: ReactNode }) =>
      createElement("h2", { "data-custom": "yes" }, children);

    const { container } = await compile(
      renderMdx("## 제목\n", { components: { h2 } }),
    );

    expect(container.querySelector("h2[data-custom]")).not.toBeNull();
  });
});
