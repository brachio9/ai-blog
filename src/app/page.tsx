import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { CATEGORIES, categoryHref } from "@/lib/categories";

export default function Home() {
  return (
    <Container>
      <div className="py-12 md:py-16 space-y-12">
        <section className="max-w-[68ch] space-y-4">
          <h1 className="text-5xl md:text-6xl font-semibold tracking-tight text-heading">
            AI 동향 블로그
          </h1>
          <p className="text-[1.0625rem] leading-[1.75] text-body">
            HuggingFace 블로그와 arXiv 논문 등 영문 AI 최신 동향을 한글 요약으로
            정리합니다.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-heading">카테고리</h2>
          <ul className="grid gap-4 sm:grid-cols-3">
            {CATEGORIES.map((category) => (
              <li key={category.slug}>
                <Link
                  href={categoryHref(category)}
                  className="block h-full rounded-md border border-border bg-surface p-5 transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <span className="block text-base font-medium text-heading">
                    {category.name}
                  </span>
                  <span className="mt-2 block text-sm text-muted">
                    {category.description}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Container>
  );
}
