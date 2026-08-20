/**
 * 요약을 부제와 리드로 가른다. 첫 문장이 부제, 나머지가 리드다 —
 * 리드까지 읽으면 본문을 안 읽어도 무슨 얘긴지 알아야 한다 (design/brief.md).
 * 한 문장뿐이면 부제만 남는다. **없는 리드를 지어내지 않는다.**
 *
 * 쓰는 곳은 이제 글 상세 하나뿐이다 (머리기사가 죽었다). 그래도 컴포넌트가 아니라
 * 여기 두는 이유는, 목록이 같은 요약을 **한 줄로 자르는** 쪽을 쓰기 때문이다 —
 * 두 규칙이 한 파일에 나란히 있어야 「목록과 상세에서 같은 문장이 다르게 잘린다」를
 * 눈치챌 수 있다.
 */
export function splitSummary(summary: string): {
  deck: string;
  lede: string | null;
} {
  const end = summary.indexOf(". ");
  if (end === -1) {
    return { deck: summary, lede: null };
  }

  return { deck: summary.slice(0, end + 1), lede: summary.slice(end + 2) };
}
