import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

/**
 * jsdom 에는 레이아웃이 없어 ResponsiveContainer 가 크기 0 을 재고 아무것도 그리지 않는다.
 * 고정 크기를 준 진짜 컨테이너로 감싸면 recharts 가 ResizeObserver 없이 그 값을 그대로 쓴다.
 */
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
      <actual.ResponsiveContainer width={480} height={280}>
        {children as never}
      </actual.ResponsiveContainer>
    ),
  };
});

const { default: Chart } = await import("./Chart");

const DATA = [
  { model: "A", mmlu: 84, gsm8k: 91 },
  { model: "B", mmlu: 79, gsm8k: 88 },
];

const SERIES = [
  { key: "mmlu", label: "MMLU" },
  { key: "gsm8k", label: "GSM8K" },
];

describe("Chart", () => {
  it("계열 라벨을 범례와 수치 표에 모두 보여준다", () => {
    const { container } = render(
      <Chart kind="bar" xKey="model" data={DATA} series={SERIES} />,
    );

    // 범례에 한 번, 표 머리글에 한 번.
    expect(screen.getAllByText("MMLU")).toHaveLength(2);
    expect(screen.getAllByText("GSM8K")).toHaveLength(2);

    // 계열 색은 원시 변수를 순서대로 순환해야 한다 (그래야 다크모드에서 같이 바뀐다).
    const legendColors = [...container.querySelectorAll<HTMLElement>(".recharts-legend-item-text")]
      .map((node) => node.style.color)
      .sort();
    expect(legendColors).toEqual(["var(--chart-1)", "var(--chart-2)"]);
  });

  it("접근성용 원본 수치 표를 함께 둔다", () => {
    render(
      <Chart
        kind="line"
        xKey="model"
        data={DATA}
        series={SERIES}
        caption="벤치마크 점수"
      />,
    );

    // 차트를 못 읽는 독자도 값 자체는 확인할 수 있어야 한다.
    const table = screen.getByRole("table", { name: "벤치마크 점수" });
    expect(table.textContent).toContain("84");
    expect(table.textContent).toContain("91");
  });

  it("MDX 에서 넘어온 JSON 문자열 프롭을 그대로 받는다", () => {
    // next-mdx-remote 가 표현식 속성을 지우므로 글에서는 문자열로만 넘어온다.
    render(
      <Chart
        kind="bar"
        xKey="model"
        data={JSON.stringify(DATA)}
        series={JSON.stringify(SERIES)}
        height="320"
      />,
    );

    expect(screen.getAllByText("MMLU")).toHaveLength(2);
  });

  it("data 나 series 가 비면 빈 차트 대신 안내 문구를 보여준다", () => {
    const noData = render(
      <Chart kind="bar" xKey="model" data={[]} series={SERIES} />,
    ).container;
    expect(noData.textContent).toContain("표시할 차트 데이터가 없다");
    expect(noData.querySelector("svg")).toBeNull();

    const noSeries = render(
      <Chart kind="bar" xKey="model" data={DATA} series={[]} />,
    ).container;
    expect(noSeries.textContent).toContain("표시할 차트 데이터가 없다");
    expect(noSeries.querySelector("svg")).toBeNull();
  });

  it("JSON 이 깨져 있어도 페이지를 죽이지 않는다", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(<Chart kind="bar" xKey="model" data="[{broken" series={SERIES} />);

    expect(screen.getByText(/표시할 차트 데이터가 없다/)).toBeDefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
