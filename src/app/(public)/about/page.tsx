import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { ACCENT_TEXT } from "@/components/post/PostTable";
import { ExternalLinkIcon } from "@/components/ui/icons";
import { CATEGORIES, categoryHref } from "@/lib/categories";
import { SITE_NAME } from "@/lib/site";
import { countByCategory } from "@/lib/stats";

/**
 * 글도 이미지도 이 레포에 커밋된다 (ADR-001·ADR-005). 오류 제보를 여기로 받는 이유이기도 하다.
 * 공개 레포 주소라 비밀값이 아니다 — 토큰·계정 정보는 환경변수에만 둔다 (CLAUDE.md CRITICAL).
 */
const REPO_URL = "https://github.com/brachio9/ai-blog";

// 루트 레이아웃의 title.template 이 " | {SITE_NAME}" 을 붙인다.
export const metadata: Metadata = {
  title: "소개",
  description:
    "무엇을 어떻게 추려 적는지, 출처를 어떻게 밝히는지, 잘못된 곳을 어디로 알리면 되는지.",
  alternates: { canonical: "/about" },
};

const PROSE = "max-w-[68ch] font-serif text-[1.0625rem] leading-[1.75] text-body";
const SECTION_TITLE = "text-xl font-semibold text-heading";
const LINK =
  "text-heading underline decoration-border underline-offset-[0.2em] transition-colors hover:decoration-heading focus-visible:outline-2 focus-visible:outline-focus";

/** 원칙은 셋뿐이다. 늘어놓기보다 각각을 한 문단으로 설명한다. */
const PRINCIPLES = [
  {
    title: "번역이 아니라 요약입니다",
    body: "원문의 문장과 이 글의 문장은 일대일로 대응하지 않습니다. 논지에 필요 없는 절반은 통째로 덜어내고, 한국어로 읽을 때 걸리는 대목에는 원문에 없던 배경을 한 줄 보태기도 합니다. 원문 표현을 그대로 옮겨야 할 때만 인용으로 따로 표시합니다.",
  },
  {
    title: "출처를 먼저 적습니다",
    body: "외부 글을 요약하거나 인용한 글에는 원문 제목과 링크를, 확인되는 경우 저자와 라이선스까지 본문 안에 적습니다. 논문 글에는 arXiv 식별자를 함께 답니다. 출처를 적을 수 없는 글은 올리지 않습니다.",
  },
  {
    title: "고른 사람의 오해가 남습니다",
    body: "무엇을 남기고 무엇을 버릴지 정하는 순간 판단이 들어가고, 그 판단은 틀릴 수 있습니다. 수치와 핵심 주장은 원문에서 다시 확인하시길 권합니다.",
  },
];

/**
 * 소개 — 이 사이트가 무엇을 하는 곳인지 한 화면에서 알 수 있어야 한다.
 * 구역마다 다루는 방식을 달리한다: 이름의 유래는 산문으로, 원칙은 번호를 붙여,
 * 다루는 출처는 카테고리 목록으로, 제보 경로는 링크 하나로.
 */
export default function AboutPage() {
  const counts = new Map(
    countByCategory().map((entry) => [entry.slug, entry.count]),
  );

  return (
    <Container>
      <div className="py-12 md:py-16">
        <header className="border-b border-border pb-4">
          <h1 className="text-3xl font-semibold tracking-tight text-heading md:text-4xl">
            소개
          </h1>
          <p className="mt-2 max-w-[68ch] text-[1.0625rem] leading-[1.75] text-muted">
            영문 AI 자료를 한글로 추려 적는 곳입니다. 혼자 읽고 혼자 씁니다.
          </p>
        </header>

        <section className="mt-10">
          <h2 className={SECTION_TITLE}>왜 「{SITE_NAME}」인가</h2>
          <div className={`mt-3 space-y-4 ${PROSE}`}>
            <p>
              초록(抄錄)은 논문 첫 장에 붙는 abstract 의 한국어 이름입니다. 이
              사이트가 하는 일도 그와 같습니다. 원문을 처음부터 끝까지 옮기는
              대신, 무엇을 주장했고 근거가 무엇인지만 남깁니다.
            </p>
            <p>
              그래서 여기 글은 원문보다 짧습니다. 실험 설정표와 부록, 참고문헌
              목록은 대개 빠지고, 저자가 조심스럽게 단 조건도 한 문장으로
              줄어듭니다. 세부가 필요해지는 지점은 결국 옵니다. 그때 갈 곳이
              있어야 하므로 원문 링크를 뺄 수 없습니다.
            </p>
          </div>
        </section>

        <section className="mt-12">
          <h2 className={SECTION_TITLE}>세 가지 원칙</h2>
          <ol className="mt-4 max-w-[68ch] space-y-6">
            {PRINCIPLES.map((principle, index) => (
              <li key={principle.title} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="pt-1 font-mono text-xs text-muted tabular-nums"
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="text-[0.9375rem] font-semibold text-heading">
                    {principle.title}
                  </h3>
                  <p className={`mt-1 ${PROSE}`}>{principle.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12">
          <h2 className={SECTION_TITLE}>무엇을 읽는가</h2>
          <ul className="mt-4 max-w-[68ch]">
            {CATEGORIES.map((category) => (
              <li key={category.slug} className="border-b border-border py-3">
                <div className="flex items-baseline gap-3">
                  {/* 카테고리 색은 작은 라벨에만 쓴다 — 링크를 이 색으로 칠하지 않는다. */}
                  <span
                    className={`w-8 shrink-0 text-xs ${ACCENT_TEXT[category.accent]}`}
                  >
                    {category.shortName}
                  </span>
                  <Link
                    href={categoryHref(category)}
                    className={`min-w-0 flex-1 text-[0.9375rem] ${LINK}`}
                  >
                    {category.name}
                  </Link>
                  <span className="shrink-0 font-mono text-xs text-muted tabular-nums">
                    {counts.get(category.slug) ?? 0}편
                  </span>
                </div>
                <p className="mt-1 pl-11 text-sm leading-[1.7] text-muted">
                  {category.description}
                </p>
              </li>
            ))}
          </ul>
          <p className={`mt-4 ${PROSE}`}>
            주제로 훑고 싶으면{" "}
            <Link href="/tags" className={LINK}>
              태그 색인
            </Link>
            , 언제 무엇을 올렸는지 보고 싶으면{" "}
            <Link href="/archive" className={LINK}>
              아카이브
            </Link>
            가 있습니다. 발행 간격도 아카이브에 그대로 드러납니다 — 정해진
            연재 주기는 없습니다.
          </p>
        </section>

        <section className="mt-12">
          <h2 className={SECTION_TITLE}>잘못된 곳을 발견했다면</h2>
          <div className={`mt-3 space-y-4 ${PROSE}`}>
            <p>
              잘못 읽은 대목, 빠뜨린 전제, 깨진 링크를 발견하면 알려주세요.
              고칠 곳이 확인되면 글을 수정합니다.
            </p>
            <p>
              <a
                href={`${REPO_URL}/issues`}
                target="_blank"
                rel="noopener noreferrer"
                className={LINK}
              >
                GitHub Issues 로 제보하기
                <ExternalLinkIcon
                  size={16}
                  className="ml-0.5 inline-block align-baseline"
                />
              </a>
            </p>
            <p>
              글은 이 사이트의 레포 안에 MDX 파일로 들어 있습니다. 화면에 보이는
              문장은 전부 그 파일에서 나오고, 무엇을 언제 고쳤는지는 커밋으로
              남습니다.
            </p>
          </div>
        </section>
      </div>
    </Container>
  );
}
