import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { PostCard } from "@/components/post/PostCard";
import { CATEGORIES, categoryHref } from "@/lib/categories";
import { getPostsByCategory } from "@/lib/content/posts";
import { SITE_NAME } from "@/lib/site";

const POSTS_PER_CATEGORY = 3;

export default function Home() {
  const sections = CATEGORIES.map((category) => ({
    category,
    posts: getPostsByCategory(category.slug).slice(0, POSTS_PER_CATEGORY),
  }));

  return (
    <Container>
      <div className="space-y-16 py-12 md:py-16">
        {/* 히어로만 중앙 정렬 예외다 (docs/UI_GUIDE.md 레이아웃). */}
        <section className="mx-auto max-w-[42ch] text-center md:py-8">
          <h1 className="text-5xl font-semibold tracking-tight text-heading md:text-6xl">
            {SITE_NAME}
          </h1>
          <p className="mt-6 text-[1.0625rem] leading-[1.75] text-body">
            HuggingFace 블로그와 arXiv 논문을 읽고 한글로 추려 적습니다. 논문 맨
            앞의 초록(抄錄)이 그렇듯 전문 번역이 아니라 요점만 남긴 요약이고,
            원문 링크는 모든 글에 답니다.
          </p>
        </section>

        {sections.map(({ category, posts }) => (
          <section key={category.slug} className="space-y-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-border pb-3">
              <div>
                <h2 className="text-2xl font-semibold text-heading">
                  {category.name}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {category.description}
                </p>
              </div>
              <Link
                href={categoryHref(category)}
                className="text-sm text-muted transition-colors hover:text-heading focus-visible:outline-2 focus-visible:outline-accent"
              >
                전체 보기
              </Link>
            </div>

            {posts.length > 0 ? (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {posts.map((post) => (
                  <li key={post.filePath}>
                    <PostCard post={post} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">아직 올라온 글이 없습니다.</p>
            )}
          </section>
        ))}
      </div>
    </Container>
  );
}
