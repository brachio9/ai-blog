import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { MdxBody } from "@/components/mdx";
import { Comments } from "@/components/post/Comments";
import { PostNav } from "@/components/post/PostNav";
import { SourceNote } from "@/components/post/SourceNote";
import { TableOfContents } from "@/components/post/TableOfContents";
import { ViewCount } from "@/components/post/ViewCount";
import { categoryHref, getCategory } from "@/lib/categories";
import { getAllPosts, getPost, getPostsByCategory } from "@/lib/content/posts";
import { formatDate } from "@/lib/format";
import { getGiscusConfig } from "@/lib/giscus";
import { renderMdx } from "@/lib/mdx";
import { extractHeadings } from "@/lib/toc";
import type { Post } from "@/types/content";

/** 모든 글을 빌드 타임에 정적 생성한다. */
export function generateStaticParams() {
  return getAllPosts().map((post) => ({
    category: post.category,
    slug: post.slug,
  }));
}

/** 경로에서 글을 찾는다. 카테고리가 CATEGORIES 에 없으면 글도 없다. */
function findPost(category: string, slug: string): Post | undefined {
  const found = getCategory(category);
  return found ? getPost(found.slug, slug) : undefined;
}

export async function generateMetadata(
  props: PageProps<"/[category]/[slug]">,
): Promise<Metadata> {
  const { category, slug } = await props.params;
  const post = findPost(category, slug);
  if (!post) {
    return {};
  }

  const { frontmatter } = post;
  const url = `/${post.category}/${post.slug}`;

  // 루트 레이아웃의 title.template 이 " | {SITE_NAME}" 을 붙인다.
  return {
    title: frontmatter.title,
    description: frontmatter.summary,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: frontmatter.title,
      description: frontmatter.summary,
      url,
      publishedTime: frontmatter.publishedAt,
      tags: frontmatter.tags,
    },
  };
}

/**
 * 글 상세 — `/{category}/{slug}`.
 * 쿼리 파라미터는 읽지 않는다. 서버에서 읽는 순간 페이지가 동적이 되어 정적 생성이 사라진다.
 */
export default async function PostPage(props: PageProps<"/[category]/[slug]">) {
  const { category, slug } = await props.params;
  const found = getCategory(category);
  const post = findPost(category, slug);
  if (!found || !post) {
    notFound();
  }

  const { frontmatter } = post;

  // publishedAt 내림차순이라 뒤가 더 오래된 글, 앞이 더 최신 글이다.
  const siblings = getPostsByCategory(found.slug);
  const index = siblings.findIndex((sibling) => sibling.slug === post.slug);
  const older = index < siblings.length - 1 ? siblings[index + 1] : undefined;
  const newer = index > 0 ? siblings[index - 1] : undefined;

  return (
    <Container>
      <article className="py-12 md:py-16">
        <header className="max-w-[68ch] border-b border-border pb-6">
          <Link
            href={categoryHref(found)}
            className="inline-block rounded-full border border-border px-2.5 py-0.5 text-xs text-muted transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
          >
            {found.name}
          </Link>

          <h1 className="mt-4 font-serif text-3xl font-semibold text-heading md:text-4xl">
            {frontmatter.title}
          </h1>

          <p className="mt-3 text-[1.0625rem] leading-[1.75] text-muted">
            {frontmatter.summary}
          </p>

          <p className="mt-4 flex flex-wrap items-center gap-x-2 text-sm text-muted">
            <time dateTime={frontmatter.publishedAt}>
              {formatDate(frontmatter.publishedAt)}
            </time>
            <span aria-hidden="true">·</span>
            <span>{post.readingMinutes}분</span>
            {/* 조회수는 클라이언트가 API 로 가져온다 — 서버에서 읽으면 이 페이지가 동적이 된다. */}
            <ViewCount postId={`${post.category}/${post.slug}`} />
          </p>

          {frontmatter.tags.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {frontmatter.tags.map((tag) => (
                <li key={tag}>
                  {/* 목록의 태그 필터 규약(step 1)을 그대로 쓴다. */}
                  <Link
                    href={`${categoryHref(found)}?tag=${encodeURIComponent(tag)}`}
                    className="inline-block rounded-full border border-border px-2.5 py-0.5 text-xs text-muted transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    {tag}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </header>

        <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
          {/* DOM 순서상 본문보다 앞이라 모바일에서는 본문 위, 데스크톱에서는 order 로 오른쪽. */}
          <TableOfContents headings={extractHeadings(post.body)} />

          <div className="min-w-0 lg:flex-1">
            <SourceNote source={frontmatter.source} paper={frontmatter.paper} />

            {/* 본문 컴파일은 renderMdx 하나뿐이다 (ADR-003). 타이포그래피는 MdxBody 가 맡는다. */}
            <MdxBody>{renderMdx(post.body)}</MdxBody>

            <PostNav previous={older} next={newer} />

            {/* Giscus 설정이 없으면 댓글 영역째 없앤다 — 빈 제목만 남기지 않는다. */}
            {getGiscusConfig() ? (
              <section
                aria-label="댓글"
                className="mt-12 max-w-[68ch] border-t border-border pt-6"
              >
                <h2 className="text-2xl font-semibold text-heading">댓글</h2>
                {/* 댓글은 클라이언트가 iframe 으로 붙인다 — 서버에서 그리면 정적 생성이 무너진다. */}
                <Comments />
              </section>
            ) : null}
          </div>
        </div>
      </article>
    </Container>
  );
}
