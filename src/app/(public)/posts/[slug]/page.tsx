import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { MdxBody } from "@/components/mdx";
import { ExternalIcon } from "@/components/mdx/Anchor";
import { Comments } from "@/components/post/Comments";
import { Correction } from "@/components/post/Correction";
import { PostHeader } from "@/components/post/PostHeader";
import { PostNav } from "@/components/post/PostNav";
import { SourceNote } from "@/components/post/SourceNote";
import { TableOfContents } from "@/components/post/TableOfContents";
import { ViewCount } from "@/components/post/ViewCount";
import {
  CAT_CLASS,
  categoryHref,
  getCategory,
  type Category,
} from "@/lib/categories";
import { postHref } from "@/lib/pagination";
import { compressionRatio, countBodyChars } from "@/lib/content/compression";
import { getAllPosts, getPostBySlug, getPostsByCategory } from "@/lib/content/posts";
import { getFormat } from "@/lib/formats";
import { getGiscusConfig } from "@/lib/giscus";
import { renderMdx } from "@/lib/mdx";
import { extractHeadings } from "@/lib/toc";
import type { Post } from "@/types/content";

/** 모든 글을 빌드 타임에 정적 생성한다. */
export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata(
  props: PageProps<"/posts/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const post = getPostBySlug(slug);
  if (!post) {
    return {};
  }

  const { frontmatter } = post;
  const url = postHref(post.slug);

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

const LINK_CLASS =
  "text-heading underline decoration-border underline-offset-[0.2em] transition-colors hover:decoration-heading focus-visible:outline-2 focus-visible:outline-focus";

/** 레일은 좁다 — URL 전체를 넣으면 줄이 깨진다. 출처는 도메인만으로도 알아본다. */
function sourceDomain(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}

/**
 * 우측 레일의 글 정보 — 목차가 두세 줄뿐이라 레일이 길게 비는 것을 이 블록이 채운다.
 * 태그·출처는 글 머리에 다시 적지 않는다 (같은 것을 두 번 적지 않는다).
 * 데스크톱에서는 레일이 sticky 라 본문을 한참 내려가도 이 글이 어디에 걸려 있는지가 남는다.
 */
function PostAside({ post, category }: { post: Post; category: Category }) {
  const { tags, source } = post.frontmatter;
  // 포맷은 선택이다 — 없는 글에는 이 줄을 만들지 않는다. 라우트도 없어 링크로 걸지 않는다.
  const format = getFormat(post.frontmatter.format ?? "");

  if (!format && tags.length === 0 && !source) {
    return null;
  }

  return (
    <dl className="space-y-4 border-t border-border pt-5">
      {format ? (
        <div>
          <dt className="kicker">포맷</dt>
          <dd className="voice-ui mt-[var(--space-1)] text-heading">
            {format.name}
          </dd>
        </div>
      ) : null}

      {tags.length > 0 ? (
        <div>
          <dt className="kicker">태그</dt>
          <dd className="dateline mt-[var(--space-2)]">
            {tags.map((tag) => (
              // 목록의 태그 필터 규약을 그대로 쓴다 — 같은 카테고리 안에서 걸러 보여준다.
              <Link
                key={tag}
                href={`${categoryHref(category)}?tag=${encodeURIComponent(tag)}`}
                className="tag focus-visible:outline-2 focus-visible:outline-focus"
              >
                {tag}
              </Link>
            ))}
          </dd>
        </div>
      ) : null}

      {source ? (
        /* 표기의 정본은 본문 위 출처 블록이다. 여기는 sticky 레일에 남는 이정표라
           레일이 접히는 좁은 화면에서는 뺀다 — 안 그러면 바로 아래 블록과 같은 말을 두 번 한다. */
        <div className="hidden lg:block">
          <dt className="kicker">출처</dt>
          <dd className="mt-[var(--space-1)]">
            {/* 도메인은 남겨 둔 원문이다 — mono. */}
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`voice-source ${LINK_CLASS}`}
            >
              {sourceDomain(source.url)}
              <ExternalIcon />
            </a>
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

/**
 * 글 상세 — `/{category}/{slug}`.
 * 쿼리 파라미터는 읽지 않는다. 서버에서 읽는 순간 페이지가 동적이 되어 정적 생성이 사라진다.
 */
export default async function PostPage(props: PageProps<"/posts/[slug]">) {
  const { slug } = await props.params;
  const post = getPostBySlug(slug);
  if (!post) {
    notFound();
  }

  // 카테고리는 이제 주소가 아니라 글이 말한다 — 그래도 안료·라벨은 그대로 쓴다.
  const found = getCategory(post.category);
  if (!found) {
    notFound();
  }

  const { frontmatter } = post;

  // publishedAt 내림차순이라 뒤가 더 오래된 글, 앞이 더 최신 글이다.
  const siblings = getPostsByCategory(found.slug);
  const index = siblings.findIndex((sibling) => sibling.slug === post.slug);
  const older = index < siblings.length - 1 ? siblings[index + 1] : undefined;
  const newer = index > 0 ? siblings[index - 1] : undefined;

  // 한 번만 구해 머리(한 조각)와 출처 표기(확장형)에 나눠 준다 — 같은 글의 비율이 갈리면 안 된다.
  const ratio = compressionRatio(
    frontmatter.source?.words,
    countBodyChars(post.body),
  );

  return (
    <Container>
      {/* 안료는 여기서 한 번 정해지고 아래로 상속된다 (--cat) — 출처 표기의 막대까지 따라온다. */}
      <article className={`py-12 md:py-16 ${CAT_CLASS[found.accent]}`}>
        <PostHeader
          post={post}
          category={found}
          ratio={ratio}
          /* 조회수는 클라이언트가 API 로 가져온다 — 서버에서 읽으면 이 페이지가 동적이 된다. */
          views={<ViewCount postId={post.slug} />}
        />

        <div className="mt-[var(--space-4)] flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
          {/* DOM 순서상 본문보다 앞이라 모바일에서는 본문 위, 데스크톱에서는 order 로 오른쪽. */}
          <aside
            aria-label="글 정보"
            className="space-y-6 lg:sticky lg:top-8 lg:order-2 lg:w-56 lg:shrink-0"
          >
            <TableOfContents headings={extractHeadings(post.body)} />
            <PostAside post={post} category={found} />
          </aside>

          <div className="min-w-0 lg:flex-1">
            <SourceNote
              source={frontmatter.source}
              paper={frontmatter.paper}
              ratio={ratio}
            />

            {/* 본문 컴파일은 renderMdx 하나뿐이다 (ADR-003). 타이포그래피는 MdxBody 가 맡는다. */}
            <MdxBody>{renderMdx(post.body)}</MdxBody>

            {/* 고쳐 실은 글은 고쳤다고 적는다. 경고가 아니라 기록이라 기사 끝에 선다. */}
            <Correction
              publishedAt={frontmatter.publishedAt}
              updatedAt={frontmatter.updatedAt}
            />

            {/* 이전/다음은 같은 카테고리 안에서만 이어진다 (siblings) — 그 이름을 화면에도 적는다. */}
            <PostNav previous={older} next={newer} categoryName={found.name} />

            {/* Giscus 설정이 없으면 댓글 영역째 없앤다 — 빈 제목만 남기지 않는다. */}
            {getGiscusConfig() ? (
              <section
                aria-label="댓글"
                className="mt-12 max-w-[var(--measure)] border-t border-border pt-6"
              >
                <h2 className="text-xl font-semibold text-heading">댓글</h2>
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
