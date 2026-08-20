import { ExternalIcon } from "@/components/mdx/Anchor";
import type { RatioInfo } from "@/lib/content/compression";
import { formatCount, formatDate } from "@/lib/format";
import type { AxisTrust } from "@/lib/selection";
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
  /**
   * 축을 얼마나 믿을 수 있나. `"weak"` 이면 데이트라인의 단검(†)에 대한 각주를 여기 단다 —
   * 표시는 눈에 걸리는 자리에, 설명은 출처를 밝히는 자리에 둔다.
   */
  axisTrust?: AxisTrust;
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
export function SourceNote({
  source,
  paper,
  ratio,
  axisTrust,
}: SourceNoteProps) {
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

      {/* 데이트라인의 † 각주. **감추지 않고 적는다** — 축이 이 사이트의 1급 차원이 된 이상,
          그 축을 자동으로 정했다는 사실을 숨기면 지도가 거짓말을 한다. 발행분의 3분의 1이 그렇다.
          **어떻게 정했는지까지는 여기서 말하지 않는다** — 경우가 둘이라(피드를 보고 찍은 것과
          판단이 엇갈린 것) 한 문장으로 적으면 반은 틀린 말이 된다. 그 답은 「어떻게 골랐나」가 한다. */}
      {axisTrust === "weak" ? (
        <p className="voice-ui mt-[var(--space-1)] text-muted">
          <span className="voice-source">†</span> 이 글의 주제 갈래는 사람이
          아니라 수집 과정이 정한 것이라 확실하지 않습니다 — 어떻게 정했는지는 옆의
          「어떻게 골랐나」에 적었습니다.
        </p>
      ) : null}

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

          {/* **분모가 무엇인지 밝힌다.** 논문의 단어 수는 본문 전체를 받아 센 값인데,
              이 요약이 실제로 읽고 줄인 것은 그 앞머리의 abstract 다. 밝히지 않으면
              「우리가 8천 단어를 편집했다」는, 하지 않은 주장을 하게 된다.
              (독자가 아낀 분량으로는 여전히 참이라 비율 자체는 그대로 둔다.)
              여기서 abstract 를 한글로 「초록」이라 적지 않는 것은 그것이 이 사이트의
              이름이라 같은 블록 안에서 두 가지를 뜻하게 되기 때문이다. */}
          {paper ? (
            <p className="voice-ui mt-[var(--space-2)] text-muted">
              원문 분량은 논문 전체 기준입니다. 이 글이 바탕으로 삼은 것은 그중{" "}
              <span className="voice-source">abstract</span> 입니다.
            </p>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
