import { formatDateShort } from "@/lib/format";

export interface CorrectionProps {
  /** KST ISO-8601. 처음 실은 날 */
  publishedAt: string;
  /** KST ISO-8601. 고쳐 실은 날. 없으면 정정도 없다 */
  updatedAt?: string;
}

/**
 * 정정 — design/brief.md 와 design/components/article.html 이 빈칸으로 남겨 둔 자리다.
 *
 * 신문 계보를 택했으니 **고쳐 실은 것은 고쳤다고 적는다.** 형태를 이렇게 정했다:
 *
 * - **기사 끝에 둔다.** 정정은 경고가 아니라 기록이다. 머리에 붙이면 읽기 전에 사과부터
 *   하는 꼴이고, 신문도 정정은 기사에 딸린 기록으로 남기지 앞머리에 세우지 않는다.
 * - **안료를 쓰지 않는다.** 얇은 괘선과 muted 뿐이다. 색을 쓰면 카테고리 부호와 뜻이 섞인다.
 * - **두 날짜가 함께 남는다.** 고쳐 실은 날이 발행일을 덮어쓰지 않는다 — 덮어쓰면
 *   기록이 아니라 은폐다. 머리의 데이트라인에는 발행일이 그대로 서 있다.
 * - **날짜가 갈릴 때만 나타난다.** 같은 날 안의 손질은 발행 작업의 일부지 정정이 아니다.
 *   그래서 시각이 아니라 KST 날짜(formatDateShort)로 비교한다.
 */
export function Correction({ publishedAt, updatedAt }: CorrectionProps) {
  if (!updatedAt) {
    return null;
  }

  const published = formatDateShort(publishedAt);
  const updated = formatDateShort(updatedAt);
  if (published === updated) {
    return null;
  }

  return (
    <aside
      aria-label="정정"
      className="mt-[var(--space-6)] max-w-[var(--measure)] border-t border-border pt-[var(--space-2)]"
    >
      <p className="kicker">정정</p>
      <p className="voice-ui mt-[var(--space-2)] text-muted">
        <time dateTime={updatedAt} className="voice-source">
          {updated}
        </time>
        {/* 조사는 앞 낱말에 붙는다 — mono 와 한글 사이에 빈칸을 두면 맞춤법이 어긋난다. */}
        {"에 고쳐 실었습니다. 처음 실은 날은 "}
        <time dateTime={publishedAt} className="voice-source">
          {published}
        </time>
        {"입니다."}
      </p>
    </aside>
  );
}
