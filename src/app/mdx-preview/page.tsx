import type { Metadata } from "next";

import { Container } from "@/components/layout/Container";
import { MdxBody } from "@/components/mdx";
import { getCategory } from "@/lib/categories";
import { getAllPosts } from "@/lib/content/posts";
import { renderMdx } from "@/lib/mdx";
import type { Post } from "@/types/content";

export const metadata: Metadata = {
  title: "MDX 렌더 검증",
  robots: { index: false, follow: false },
};

/**
 * 렌더 파이프라인 검증 전용 라우트. 사이트 내비게이션에 링크하지 않는다.
 * 인라인 문자열이 아니라 **실제 `content/**` 파일**을 로더로 읽어 렌더한다 —
 * 파일 경로를 통과하는 진짜 글이 깨지지 않는지 보는 것이 이 라우트의 용도다.
 * 목록·상세 페이지는 blog-2 의 몫이고, 이 라우트는 그때 삭제된다.
 */
function PostPreview({ post }: { post: Post }) {
  const { frontmatter } = post;
  const category = getCategory(post.category);

  return (
    <article className="border-t border-border pt-10">
      <p className="font-sans text-sm text-muted">
        {category?.name} · {post.filePath}
      </p>
      <h1 className="mt-3 font-serif text-3xl font-semibold text-heading md:text-4xl">
        {frontmatter.title}
      </h1>
      <p className="mt-3 max-w-[68ch] font-sans text-sm text-muted">
        {frontmatter.summary}
      </p>
      <p className="mt-2 font-sans text-sm text-muted">
        {frontmatter.publishedAt} · 읽는 데 {post.readingMinutes}분
        {frontmatter.draft ? " · 초안" : ""}
        {frontmatter.tags.length > 0 ? ` · ${frontmatter.tags.join(" · ")}` : ""}
      </p>
      {frontmatter.source ? (
        <p className="mt-2 max-w-[68ch] font-sans text-sm text-muted">
          출처:{" "}
          <a
            href={frontmatter.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline decoration-border underline-offset-2"
          >
            {frontmatter.source.title}
          </a>
          {frontmatter.source.license ? ` (${frontmatter.source.license})` : ""}
        </p>
      ) : null}

      <div className="mt-8">
        <MdxBody>{renderMdx(post.body)}</MdxBody>
      </div>
    </article>
  );
}

export default function MdxPreviewPage() {
  const posts = getAllPosts();

  return (
    <Container>
      <div className="space-y-16 py-12">
        <p className="font-sans text-sm text-muted">
          content/ 의 샘플 글 {posts.length}건을 renderMdx 로 렌더한 검증
          페이지다.
        </p>
        {posts.map((post) => (
          <PostPreview key={post.filePath} post={post} />
        ))}
      </div>
    </Container>
  );
}
