"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";

import { DARK_CLASS } from "@/lib/theme";

/**
 * 런타임 색 조회는 **원시 변수**(`--surface` 등)로만 한다.
 * Tailwind v4 는 마크업에서 안 쓰인 `@theme` 변수(`--color-*`)를 빌드에서 지우므로
 * 그쪽을 읽으면 빈 문자열이 오고, 다이어그램이 검정/투명으로 나오는데 빌드는 통과한다.
 */
function readThemeColors() {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string) => style.getPropertyValue(name).trim();

  return {
    surface: read("--surface"),
    border: read("--border"),
    body: read("--body"),
    heading: read("--heading"),
    accent: read("--accent"),
    sans: read("--sans"),
  };
}

/**
 * `<html>` 의 다크 클래스 구독. 한 번 만든 SVG 는 색이 박혀 있어 테마가 바뀌면
 * 그대로 두었을 때 글자가 배경에 묻는다 — 클래스 변화를 보고 다시 그린다.
 */
function subscribeToTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function isDark() {
  return document.documentElement.classList.contains(DARK_CLASS);
}

/**
 * Mermaid 다이어그램. 글에서는 ` ```mermaid ` 코드펜스로 쓰고,
 * src/lib/mdx.ts 의 remark 변환이 그 펜스를 이 컴포넌트로 바꾼다.
 *
 * mermaid 는 무겁고 다이어그램이 없는 글이 대부분이라 모듈 최상단에서 import 하지 않는다 —
 * 실제로 화면에 붙었을 때만 `import("mermaid")` 로 내려받는다.
 */
export default function Diagram({ chart }: { chart: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  // mermaid 는 이 id 로 DOM 노드를 만든다 — useId 의 콜론은 CSS 선택자를 깨뜨리므로 턴다.
  const id = `mermaid-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;

  // 서버에는 클래스가 없으므로 라이트로 시작하고, 마운트 후 실제 값으로 맞춰진다.
  const dark = useSyncExternalStore(subscribeToTheme, isDark, () => false);

  useEffect(() => {
    let cancelled = false;

    async function draw() {
      try {
        const mermaid = (await import("mermaid")).default;
        const color = readThemeColors();

        mermaid.initialize({
          startOnLoad: false,
          // 문법 오류 시 mermaid 가 자기 에러 그림을 DOM 에 꽂는 것을 막는다.
          suppressErrorRendering: true,
          theme: "base",
          fontFamily: color.sans,
          themeVariables: {
            background: color.surface,
            primaryColor: color.surface,
            primaryTextColor: color.body,
            primaryBorderColor: color.border,
            secondaryColor: color.surface,
            secondaryTextColor: color.body,
            secondaryBorderColor: color.border,
            tertiaryColor: color.surface,
            tertiaryTextColor: color.body,
            tertiaryBorderColor: color.border,
            mainBkg: color.surface,
            nodeBorder: color.border,
            nodeTextColor: color.body,
            lineColor: color.accent,
            textColor: color.body,
            titleColor: color.heading,
            edgeLabelBackground: color.surface,
            clusterBkg: color.surface,
            clusterBorder: color.border,
            fontSize: "14px",
          },
        });

        const rendered = await mermaid.render(id, chart);
        if (!cancelled) {
          setSvg(rendered.svg);
          setFailed(false);
        }
      } catch (error) {
        // 글 하나의 오타가 사이트를 죽이면 안 된다 — 원본을 그대로 보여주고 경고만 남긴다.
        console.warn("[Diagram] mermaid 렌더 실패", error);
        document.getElementById(id)?.remove();
        document.getElementById(`d${id}`)?.remove();
        if (!cancelled) {
          setSvg(null);
          setFailed(true);
        }
      }
    }

    void draw();
    return () => {
      cancelled = true;
    };
  }, [chart, dark, id]);

  if (failed) {
    return (
      <pre className="my-6 overflow-x-auto rounded-md border border-border bg-surface p-4 font-mono text-sm text-muted">
        {chart}
      </pre>
    );
  }

  return (
    <figure
      className="mdx-diagram my-6 overflow-x-auto rounded-md border border-border bg-surface p-4"
      // svg 가 준비되기 전에는 빈 자리로 둔다 (SSR 결과도 이쪽이다).
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
}
