/**
 * 날짜 표기 단일 진입점 — CLAUDE.md CRITICAL: 모든 시각은 KST.
 * 컴포넌트마다 Intl 을 따로 부르면 서버·브라우저 타임존이 갈릴 때 날짜가 어긋난다.
 */
const KST = "Asia/Seoul";

/** en-CA 는 YYYY-MM-DD 라 파트 이름만 쓰면 로케일 표기 차이에 걸리지 않는다. */
const KST_PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: KST,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function kstParts(iso: string): { year: string; month: string; day: string } {
  const parts = KST_PARTS.formatToParts(new Date(iso));
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return { year: pick("year"), month: pick("month"), day: pick("day") };
}

/** "2026년 8월 9일" */
export function formatDate(iso: string): string {
  const { year, month, day } = kstParts(iso);
  return `${Number(year)}년 ${Number(month)}월 ${Number(day)}일`;
}

/** "2026.08.09" */
export function formatDateShort(iso: string): string {
  const { year, month, day } = kstParts(iso);
  return `${year}.${month}.${day}`;
}

/** "08.09" — 단신 묶음처럼 연도가 문맥에서 이미 정해진 자리 */
export function formatDateMonthDay(iso: string): string {
  const { month, day } = kstParts(iso);
  return `${month}.${day}`;
}

const COUNT_FORMAT = new Intl.NumberFormat("ko-KR");

/** "1,234" — 조회수 같은 정수 표기 */
export function formatCount(value: number): string {
  return COUNT_FORMAT.format(value);
}
