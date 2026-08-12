import { ExternalIcon } from "@/components/mdx/Anchor";
import { formatDate } from "@/lib/format";
import type { PaperMeta, PostSource } from "@/types/content";

export interface SourceNoteProps {
  source?: PostSource;
  /** papers 카테고리 전용. source 와 함께 있을 때만 의미가 있다. */
  paper?: PaperMeta;
}

const LINK_CLASS =
  "text-accent underline underline-offset-2 transition-colors hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-accent";

/**
 * 출처 표기 — CLAUDE.md CRITICAL 의 구현체다.
 * 외부 원문을 요약·인용한 글은 원문 URL 이 화면에 반드시 드러나야 하고,
 * 번역 전재로 오해되지 않도록 이 글의 성격을 함께 밝힌다.
 */
export function SourceNote({ source, paper }: SourceNoteProps) {
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
      className="my-8 max-w-[68ch] border border-border border-l-[3px] border-l-accent bg-surface p-5 font-sans"
    >
      <p className="text-sm font-medium text-heading">원문 출처</p>

      <p className="mt-1 text-sm leading-relaxed text-muted">
        이 글은 아래 원문을 한글로 요약·정리한 것입니다. 원문을 그대로 옮긴
        번역문이 아니며, 정확한 내용은 원문을 확인해 주세요.
      </p>

      <p className="mt-3 text-[0.9375rem] leading-relaxed">
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
        <p className="mt-1 text-sm text-muted">{meta.join(" · ")}</p>
      ) : null}

      {paper ? (
        <p className="mt-3 border-t border-border pt-3 text-sm text-muted">
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
    </aside>
  );
}
