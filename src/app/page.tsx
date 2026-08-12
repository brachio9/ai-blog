import Link from "next/link";

const surfaceTokens = [
  { name: "bg", swatch: "bg-bg" },
  { name: "surface", swatch: "bg-surface" },
  { name: "border", swatch: "bg-border" },
  { name: "heading", swatch: "bg-heading" },
  { name: "body", swatch: "bg-body" },
  { name: "muted", swatch: "bg-muted" },
  { name: "faint", swatch: "bg-faint" },
  { name: "accent", swatch: "bg-accent" },
  { name: "accent-hover", swatch: "bg-accent-hover" },
];

const semanticTokens = [
  { name: "success", swatch: "bg-success" },
  { name: "warning", swatch: "bg-warning" },
  { name: "danger", swatch: "bg-danger" },
  { name: "info", swatch: "bg-info" },
];

const chartTokens = [
  { name: "chart-1", swatch: "bg-chart-1" },
  { name: "chart-2", swatch: "bg-chart-2" },
  { name: "chart-3", swatch: "bg-chart-3" },
  { name: "chart-4", swatch: "bg-chart-4" },
  { name: "chart-5", swatch: "bg-chart-5" },
];

function Swatches({
  title,
  tokens,
}: {
  title: string;
  tokens: { name: string; swatch: string }[];
}) {
  return (
    <section>
      <h2 className="text-2xl font-semibold text-heading mb-4">{title}</h2>
      <ul className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {tokens.map((token) => (
          <li key={token.name}>
            <div
              className={`h-14 rounded-sm border border-border ${token.swatch}`}
            />
            <p className="mt-2 font-mono text-xs text-muted">{token.name}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Home() {
  return (
    <main className="max-w-6xl mx-auto px-5 md:px-8 py-12 space-y-12">
      <div className="space-y-2">
        <h1 className="text-5xl md:text-6xl font-semibold tracking-tight text-heading">
          디자인 토큰
        </h1>
        <p className="text-sm text-muted">
          현재 테마:{" "}
          <span className="dark:hidden">라이트</span>
          <span className="hidden dark:inline">다크</span> · step 2 에서 실제
          Intro 로 교체된다.
        </p>
      </div>

      <Swatches title="표면·텍스트" tokens={surfaceTokens} />
      <Swatches title="시맨틱" tokens={semanticTokens} />
      <Swatches title="차트 카테고리" tokens={chartTokens} />

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-heading">타이포그래피</h2>
        <div className="rounded-md border border-border bg-surface p-5 space-y-4">
          <p className="font-sans text-heading">
            산세리프 (Inter) — UI·목록·내비 · 한글 폴백 확인 · 0123456789
          </p>
          <p className="font-serif text-body">
            세리프 (Source Serif 4) — 글 본문 · 한글 폴백 확인 · 0123456789
          </p>
          <p className="font-mono text-sm text-body">
            모노 (JetBrains Mono) — const theme = resolveTheme(); // 0123456789
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-heading">
          본문 단폭 (max-w-[68ch])
        </h2>
        <p className="max-w-[68ch] font-serif text-[1.0625rem] leading-[1.75] text-body">
          본문은 이 폭을 넘지 않는다. HuggingFace 블로그와 arXiv 논문의 영문
          내용을 한글로 옮길 때 한 줄이 지나치게 길면 눈이 다음 줄의 시작점을
          잃는다. 표·차트·코드블록만 이 폭을 넘어 확장할 수 있고, 그 외의 본문
          텍스트는 좌측 정렬로 이 단폭 안에 머문다. 링크는{" "}
          <Link
            className="text-accent hover:text-accent-hover underline underline-offset-2"
            href="/"
          >
            accent 토큰
          </Link>
          을 쓴다.
        </p>
      </section>
    </main>
  );
}
