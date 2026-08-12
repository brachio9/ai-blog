"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ChartKind = "bar" | "line" | "scatter";

export interface ChartSeries {
  /** data 항목의 필드명 */
  key: string;
  /** 범례·수치 표에 쓰는 표기 */
  label: string;
}

export type ChartDatum = Record<string, string | number>;

export interface ChartProps {
  kind: ChartKind;
  /**
   * 배열, 또는 같은 모양의 JSON 문자열.
   * MDX 에서는 문자열만 쓸 수 있다 — next-mdx-remote v6 가 `{...}` 표현식 속성을
   * 조용히 제거하므로 배열을 그대로 넘기면 프롭이 사라진다 (Diagram 의 chart 와 같은 사정).
   */
  data: ChartDatum[] | string;
  /** 가로축으로 쓸 필드명 */
  xKey: string;
  /** 1개 이상. 배열 또는 JSON 문자열 */
  series: ChartSeries[] | string;
  yLabel?: string;
  /** 기본 280 */
  height?: number | string;
  caption?: string;
}

/**
 * 계열 색은 **원시 변수**로 넘긴다 (UI_GUIDE 차트 카테고리 색 순서).
 * Tailwind 가 노출하는 `--color-*` 쪽은 마크업에서 그 유틸리티를 실제로 쓸 때만 살아남고,
 * 없는 변수를 받은 Recharts 는 경고도 빌드 실패도 없이 그냥 검정으로 칠한다.
 */
const SERIES_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/** 축·눈금 — 값이 아니라 변수를 넘기므로 테마 전환 시 브라우저가 알아서 다시 칠한다. */
const AXIS_PROPS = {
  stroke: "var(--border)",
  tick: { fill: "var(--muted)", fontSize: 12 },
} as const;

const MARGIN = { top: 8, right: 8, bottom: 0, left: 0 };

function colorOf(index: number) {
  return SERIES_COLORS[index % SERIES_COLORS.length];
}

/** 배열이면 그대로, JSON 문자열이면 파싱해서. 어느 쪽도 아니면 빈 배열 → 안내 문구로 간다. */
function parseList<T>(value: T[] | string | undefined): T[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    // 글 하나의 JSON 오타가 페이지를 죽이면 안 된다 — 안내 문구로 떨어뜨린다.
    console.warn("[Chart] data/series JSON 파싱 실패", value);
    return [];
  }
}

/** 차트를 못 읽는 독자를 위한 원본 수치 (UI_GUIDE 접근성 — 차트에 원본 표 병기). */
function DataTable({
  rows,
  xKey,
  seriesList,
  caption,
}: {
  rows: ChartDatum[];
  xKey: string;
  seriesList: ChartSeries[];
  caption?: string;
}) {
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-sm text-muted hover:text-heading">
        수치 표 보기
      </summary>
      <div className="mdx-scroll-x mt-2 rounded-md border border-border">
        <table
          className="w-max min-w-full border-collapse text-left"
          aria-label={caption ?? "차트 원본 수치"}
        >
          <thead>
            <tr>
              <th className="border-b border-border bg-surface px-3 py-2 text-sm font-medium text-heading">
                {xKey}
              </th>
              {seriesList.map((s) => (
                <th
                  key={s.key}
                  className="border-b border-border bg-surface px-3 py-2 text-sm font-medium text-heading"
                >
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${String(row[xKey])}-${index}`}>
                <td className="border-b border-border px-3 py-2 text-sm">
                  {row[xKey]}
                </td>
                {seriesList.map((s) => (
                  <td
                    key={s.key}
                    className="border-b border-border px-3 py-2 text-sm"
                  >
                    {row[s.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function ChartFigure({
  kind,
  rows,
  xKey,
  seriesList,
  yLabel,
}: {
  kind: ChartKind;
  rows: ChartDatum[];
  xKey: string;
  seriesList: ChartSeries[];
  yLabel?: string;
}) {
  const grid = (
    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
  );

  const yAxisLabel = yLabel
    ? {
        value: yLabel,
        angle: -90 as const,
        position: "insideLeft" as const,
        fill: "var(--muted)",
        fontSize: 12,
      }
    : undefined;

  // Recharts 기본 툴팁은 흰 배경이라 다크모드에서 혼자 튄다 — 표면 토큰으로 맞춘다.
  const tooltip = (
    <Tooltip
      contentStyle={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "0.375rem",
        fontSize: 12,
      }}
      labelStyle={{ color: "var(--heading)" }}
      itemStyle={{ color: "var(--body)" }}
      cursor={{ fill: "var(--border)", fillOpacity: 0.35, stroke: "var(--border)" }}
    />
  );

  const legend = <Legend wrapperStyle={{ fontSize: 12 }} />;

  if (kind === "scatter") {
    return (
      <ScatterChart margin={MARGIN}>
        {grid}
        <XAxis dataKey={xKey} type="number" {...AXIS_PROPS} />
        <YAxis dataKey="value" type="number" {...AXIS_PROPS} label={yAxisLabel} />
        {tooltip}
        {legend}
        {seriesList.map((s, index) => (
          <Scatter
            key={s.key}
            name={s.label}
            // 계열마다 y 필드가 다르므로 축이 읽을 수 있는 모양으로 맞춰 준다.
            data={rows.map((row) => ({ [xKey]: row[xKey], value: row[s.key] }))}
            fill={colorOf(index)}
          />
        ))}
      </ScatterChart>
    );
  }

  if (kind === "line") {
    return (
      <LineChart data={rows} margin={MARGIN}>
        {grid}
        <XAxis dataKey={xKey} {...AXIS_PROPS} />
        <YAxis {...AXIS_PROPS} label={yAxisLabel} />
        {tooltip}
        {legend}
        {seriesList.map((s, index) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={colorOf(index)}
            strokeWidth={2}
            dot={{ fill: colorOf(index), r: 3 }}
          />
        ))}
      </LineChart>
    );
  }

  return (
    <BarChart data={rows} margin={MARGIN}>
      {grid}
      <XAxis dataKey={xKey} {...AXIS_PROPS} />
      <YAxis {...AXIS_PROPS} label={yAxisLabel} />
      {tooltip}
      {legend}
      {seriesList.map((s, index) => (
        <Bar key={s.key} dataKey={s.key} name={s.label} fill={colorOf(index)} />
      ))}
    </BarChart>
  );
}

/**
 * 본문 차트. 글에서는 `<Chart kind="bar" xKey="model" data='[...]' series='[...]' />` 로 쓴다.
 *
 * recharts 는 무겁고 차트가 있는 글이 소수이므로 모듈 최상단에서 부르지 않는다 —
 * src/components/mdx/index.ts 가 next/dynamic 으로 감싸 이 파일이 필요할 때만 내려온다.
 */
export default function Chart({
  kind,
  data,
  xKey,
  series,
  yLabel,
  height,
  caption,
}: ChartProps) {
  const rows = parseList<ChartDatum>(data);
  const seriesList = parseList<ChartSeries>(series);
  // MDX 속성으로 오면 숫자도 문자열이다 ("320").
  const chartHeight = Number(height) || 280;

  const empty = rows.length === 0 || seriesList.length === 0;

  return (
    <figure className="my-6">
      <div className="rounded-md border border-border p-4">
        {empty ? (
          <p className="py-8 text-center text-sm text-muted">
            표시할 차트 데이터가 없다 (data · series 를 확인하라).
          </p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ChartFigure
                kind={kind}
                rows={rows}
                xKey={xKey}
                seriesList={seriesList}
                yLabel={yLabel}
              />
            </ResponsiveContainer>
            <DataTable
              rows={rows}
              xKey={xKey}
              seriesList={seriesList}
              caption={caption}
            />
          </>
        )}
      </div>
      {caption ? (
        <figcaption className="mt-2 text-sm text-muted">{caption}</figcaption>
      ) : null}
    </figure>
  );
}
