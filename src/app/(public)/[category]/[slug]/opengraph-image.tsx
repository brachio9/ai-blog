import { ImageResponse } from "next/og";

import { type CategoryAccent, getCategory } from "@/lib/categories";
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

/**
 * ImageResponse 는 앱 CSS 가 닿지 않는 별도 렌더러라 --cat-* 을 읽을 수 없다.
 * UI_GUIDE 의 라이트 값을 categories.ts 의 accent 키에 맞춰 그대로 적는다 (카드 배경이 라이트다).
 */
const ACCENT_COLOR: Record<CategoryAccent, string> = {
  hf: "#8a5a00",
  paper: "#0f6b63",
  note: "#a8442a",
};

export default async function OpengraphImage(props: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await props.params;
  const found = getCategory(category);
  const post = found ? getPost(found.slug, slug) : undefined;

  const title = post?.frontmatter.title ?? SITE_NAME;
  // 카테고리를 못 찾은 카드에는 부호를 붙일 수 없다 — 중성으로 떨어뜨린다.
  const accent = found ? ACCENT_COLOR[found.accent] : "#171717";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#fafafa",
        }}
      >
        <div style={{ width: 16, height: "100%", backgroundColor: accent }} />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "72px 80px",
          }}
        >
          <div style={{ display: "flex", fontSize: 30, color: accent }}>
            {found?.name ?? SITE_NAME}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 64,
              fontWeight: 600,
              lineHeight: 1.3,
              color: "#171717",
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
              borderTop: "1px solid #e5e5e5",
              paddingTop: 28,
              fontSize: 28,
              color: "#737373",
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
