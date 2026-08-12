import { ImageResponse } from "next/og";

import { getCategory } from "@/lib/categories";
import { getAllPosts, getPost } from "@/lib/content/posts";
import { SITE_NAME } from "@/lib/site";

export const alt = SITE_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** 글별 OG 도 빌드 타임에 굽는다. 페이지의 generateStaticParams 는 여기까지 오지 않는다. */
export function generateStaticParams() {
  return getAllPosts().map((post) => ({
    category: post.category,
    slug: post.slug,
  }));
}

/** 1200×630 에 두 줄 남짓 들어간다. 넘치면 잘라야 카테고리·사이트 이름이 밀려나지 않는다. */
const MAX_TITLE_LENGTH = 48;

export default async function OpengraphImage(props: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await props.params;
  const found = getCategory(category);
  const post = found ? getPost(found.slug, slug) : undefined;

  const title = post?.frontmatter.title ?? SITE_NAME;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#fdfcfa",
        }}
      >
        <div style={{ width: 16, height: "100%", backgroundColor: "#a8442a" }} />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "72px 80px",
          }}
        >
          <div style={{ display: "flex", fontSize: 30, color: "#a8442a" }}>
            {found?.name ?? SITE_NAME}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 64,
              fontWeight: 600,
              lineHeight: 1.3,
              color: "#1c1917",
            }}
          >
            {title.length > MAX_TITLE_LENGTH
              ? `${title.slice(0, MAX_TITLE_LENGTH)}…`
              : title}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              borderTop: "1px solid #e7e2da",
              paddingTop: 28,
              fontSize: 28,
              color: "#78716c",
            }}
          >
            {SITE_NAME}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
