import { ExternalIcon } from "@/components/mdx/Anchor";
import type { RatioInfo } from "@/components/post/PostLead";
import { formatCount, formatDate } from "@/lib/format";
import type { PaperMeta, PostSource } from "@/types/content";

export interface SourceNoteProps {
  source?: PostSource;
  /** papers 카테고리 전용. source 와 함께 있을 때만 의미가 있다. */
  paper?: PaperMeta;
  /**
   * 추린 비율. 있으면 확장형(.ratio-scale)을 그린다 — **한 화면에 한 번뿐인 자리다.**
   * `null` 이면 막대를 그리지 않는다. 출처 표기 자체는 그대로 남는다.
   */
  ratio?: RatioInfo | null;
}

const LINK_CLASS =
  "text-heading underline decoration-border underline-offset-[0.2em] transition-colors hover:decoration-heading focus-visible:outline-2 focus-visible:outline-focus";

/**
 * 출처 표기 — CLAUDE.md CRITICAL 의 구현체다.
 * 외부 원문을 요약·인용한 글은 원문 URL 이 화면에 반드시 드러나야 하고,
 * 번역 전재로 오해되지 않도록 이 글의 성격을 함께 밝힌다.
 *
 * 정본(design/components/article.html)을 따라 상자 대신 안료 괘선 한 줄로 세운다.
 * 상자를 걷어내면서 원문 링크는 이 블록에서 가장 큰 글자가 됐다 —
 * 원문 링크를 못 찾으면 실패라는 것이 이 화면의 첫 번째 기준이다 (design/brief.md).
 *
 * 시그니처 「추린 비율」의 확장형도 여기 산다. 이 글이 원문의 몇 분의 일인지는
 * 원문 링크 바로 옆에서 말해야 뜻이 산다 — 무엇을 얼마나 추렸는지가 한 덩이다.
 */
export function SourceNote({ source, paper, ratio }: SourceNoteProps) {
  if (!source) {
    return null;
  }

  const meta = [
    source.author ? `저자 ${source.author}` : undefined,
    source.license ? `라이선스 ${source.license}` : undefined,
    source.publishedAt ? `원문 발행 ${formatDate(source.publishedAt)}` : undefined,
  ].filter((item) => item !== undefined);

  return (
    <aside
      aria-label="원문 출처"
      // 안료는 감싼 지면의 --cat 에서 온다 (없으면 기본 안료). 색 값을 여기 적지 않는다.
      className="mb-[var(--space-6)] max-w-[var(--measure)] border-l-2 pl-[var(--space-3)] [border-left-color:var(--cat,var(--color-accent))]"
    >
      <p className="voice-ui font-semibold text-heading">원문 출처</p>

      <p className="voice-ui mt-[2px] text-muted">
        이 글은 아래 원문을 한글로 요약·정리한 것입니다. 원문을 그대로 옮긴
        번역문이 아니며, 정확한 내용은 원문을 확인해 주세요.
      </p>

      <p className="mt-[var(--space-2)] text-[length:var(--text-h4)] leading-tight">
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className={LINK_CLASS}
        >
          {source.title}
          <ExternalIcon />
        </a>
      </p>

      {meta.length > 0 ? (
        <p className="voice-ui mt-[var(--space-1)] text-muted">
          {meta.join(" · ")}
        </p>
      ) : null}

      {paper ? (
        <p className="voice-ui mt-[var(--space-2)] text-muted">
          <a
            href={`https://arxiv.org/abs/${paper.arxivId}`}
            target="_blank"
            rel="noopener noreferrer"
            className={LINK_CLASS}
          >
            arXiv:{paper.arxivId}
            <ExternalIcon />
          </a>
          {paper.authors.length > 0 ? (
            <span className="block">저자 {paper.authors.join(", ")}</span>
          ) : null}
        </p>
      ) : null}

      {/* 시그니처 「추린 비율」 확장형 — 원문과 초록의 길이를 나란히 놓는다.
          채움 폭은 rounded 비율의 역수라 막대와 '1/N' 표기가 정확히 같은 말을 한다.
          비율 계산은 src/lib/content/compression.ts 한 곳뿐이고 여기서 다시 세지 않는다. */}
      {ratio ? (
        <div className="ratio-scale mt-[var(--space-3)]">
          <div className="ratio-row">
            <span className="ratio-key voice-ui text-muted">원문</span>
            <div className="ratio-track" aria-hidden="true">
              <div className="ratio-fill" style={{ width: "100%" }} />
            </div>
            <span className="voice-source">
              {formatCount(ratio.sourceWords)} words
            </span>
          </div>

          <div className="ratio-row">
            <span className="ratio-key voice-ui text-muted">초록</span>
            <div className="ratio-track" aria-hidden="true">
              <div
                className="ratio-fill"
                style={{ width: `${(100 / ratio.ratio).toFixed(1)}%` }}
              />
            </div>
            <span className="voice-source">
              {formatCount(ratio.bodyChars)}
              <span className="voice-ui">자</span>
              {` · 1/${ratio.ratio}`}
            </span>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
