/**
 * 봇이 글을 고른 경위 — 단일 진실 공급원. `axes.ts`·`categories.ts`·`formats.ts` 와 같은 자리다.
 *
 * **분류 축이 아니다.** 라우팅도 집계도 하지 않는다 — 분류 축은 셋뿐이다 (docs/PRD.md).
 * 여기 있는 값은 「이 글이 왜 올라왔나」를 말할 뿐이고, 그 답이 필요한 자리는 글 상세와
 * 목록의 강약뿐이다.
 *
 * 사람이 고른 글(`notes`)에는 이 칸이 아예 없다 — 고른 주체가 사람이라 기계의 경위가 없다.
 */

import type { CategorySlug } from "@/lib/categories";
import type { PostSelection } from "@/types/content";

/** 축을 누가 정했나. 수집기 `items.axis_by` 를 그대로 옮긴 값이다. */
export type AxisBySlug = "source" | "keyword" | "llm";

/** 그 판정이 다른 경로와 만났는가. 수집기 `items.axis_confidence` 다. */
export type AxisConfidence = "high" | "low";

/**
 * 선별 등급 3단. **원점수가 아니다.**
 *
 * 수집기의 원점수는 440건이 서로 다른 값 25가지뿐이고 한 값이 40%라 순위를 못 매긴다.
 * 게다가 그 값에서 소스 신뢰도가 역산되는데, 그것은 수집기를 private 으로 두는 이유 중 하나다.
 * 그래서 수집기가 신뢰도를 뺀 값으로 3단만 접어서 넘긴다.
 *
 * **목록 뱃지로 쓰지 마라.** 발행분의 59% 가 `high` 다 — 열에 여섯이 다는 표시는 아무것도
 * 가르지 못한다. 쓸 자리는 두 곳뿐이다: 그날 머리기사를 고르는 것과, 그날 어느 행에
 * 요약을 펴 줄지 정하는 것. 숫자로 찍지도 마라 — 남의 논문에 매긴 점수처럼 읽힌다.
 */
export type SelectionBand = "high" | "mid" | "low";

/**
 * 원문 매체의 반응 종류. **오늘은 하나뿐이다.**
 *
 * 수집 1,862건 실측에서 인기 수치가 있는 것은 HuggingFace 논문 업보트뿐이다.
 * GitHub 의 신호는 릴리즈 메타데이터라 인기가 아니고, 국내·블로그·포럼·유튜브 소스는
 * 아예 없다. 그래서 **종류를 지우고 숫자만 남기지 않는다** — 별과 업보트를 한 축에
 * 세우면 그 순위는 아무 뜻이 없다.
 */
export type PopularityKind = "hf-upvotes";

/** 축을 얼마나 믿을 수 있는가. 화면이 이 값으로 표시를 정한다. */
export type AxisTrust = "high" | "normal" | "weak";

export interface AxisByMeta {
  slug: AxisBySlug;
  /** 글 상세에서 사람에게 보여 줄 말 */
  label: string;
}

export const AXIS_BY: readonly AxisByMeta[] = [
  { slug: "source", label: "원문이 실린 곳" },
  { slug: "keyword", label: "본문의 용어" },
  { slug: "llm", label: "자동 분류" },
];

export const AXIS_BY_SLUGS = AXIS_BY.map((entry) => entry.slug);
export const AXIS_CONFIDENCES: readonly AxisConfidence[] = ["high", "low"];
export const SELECTION_BANDS: readonly SelectionBand[] = ["high", "mid", "low"];
export const POPULARITY_KINDS: readonly PopularityKind[] = ["hf-upvotes"];

/** 축을 누가 정했나 — 글 상세의 「어떻게 골랐나」가 쓴다. */
export const AXIS_BY_LABEL: Record<AxisBySlug, string> = {
  source: "원문이 실린 곳을 보고 정했습니다",
  keyword: "본문의 용어를 보고 정했습니다",
  llm: "본문을 읽고 정했습니다",
};

/**
 * 선별 등급의 표기. **숫자로 찍지 않는다** — 1~10 을 행에 적으면 남의 논문에 매긴
 * 품질 점수처럼 읽히는데, 실제로는 「왜 골랐나」의 거친 3단이다.
 */
export const SELECTION_BAND_LABEL: Record<SelectionBand, string> = {
  high: "셀 만한 글로 봤습니다",
  mid: "볼 만한 글로 봤습니다",
  low: "약하지만 실었습니다",
};

/** 인기 수치 옆에 붙는 단위 — **이것이 출처를 말한다.** 그래서 정렬 키로 쓰지 않는다. */
export const POPULARITY_LABEL: Record<PopularityKind, string> = {
  "hf-upvotes": "HF 추천",
};

/**
 * 축을 얼마나 믿을 수 있나. **`axisBy` 만으로는 정할 수 없다.**
 *
 * `source` 는 릴리즈에서 「저장소가 곧 주제」다 — `vllm-project/vllm` 의 릴리즈는 전부
 * 서빙 얘기다. 그런데 논문에서 같은 값은 「피드 하나에 붙은 축을 논문 한 편에 씌운 것」이다.
 * 같은 값, 반대의 뜻. 그것을 가르는 것이 `category` 라 둘을 함께 받는다.
 *
 * 실측(2026-08-19, 발행 49편): `source` 19건 중 12건이 GitHub 릴리즈(믿을 만함),
 * 7건이 논문(못 믿음)이었다. 수집기 자기 문서가 경고한 바로 그 경우다.
 *
 * **약한 축이라고 목록에서 빼지 않는다** — 6축 편수의 합이 전체와 같아야 `/topics` 가
 * 지도 노릇을 한다 (docs/PRD.md). 감추는 대신 표시한다.
 */
export function axisTrust(
  category: CategorySlug,
  selection: PostSelection | undefined,
): AxisTrust {
  // 사람이 고른 글이다 — 기계의 확신을 말할 자리가 아니다.
  if (selection === undefined) return "normal";

  if (selection.axisBy === "source") {
    return category === "releases" ? "high" : "weak";
  }
  return selection.axisConfidence === "low" ? "weak" : "normal";
}

/**
 * 교차 등장을 화면에 적을 것인가. **1곳은 적지 않는다** — 90% 가 1곳이라
 * 그 표시는 아무것도 가르지 못하고, 드물다는 것이 이 신호의 값어치다.
 */
export const CROSS_SOURCES_MIN = 2;

export function showsCrossSources(selection: PostSelection | undefined): boolean {
  return selection !== undefined && selection.crossSources >= CROSS_SOURCES_MIN;
}
