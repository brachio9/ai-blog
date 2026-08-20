import { ImageResponse } from "next/og";

import { getAxis } from "@/lib/axes";
import { getCategory } from "@/lib/categories";
import { getAllPosts, getPostBySlug } from "@/lib/content/posts";
import { OG_ACCENT, OG_GROUND } from "@/lib/og-colors";
import { SITE_NAME } from "@/lib/site";

export const alt = SITE_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** 글별 OG 도 빌드 타임에 굽는다. 페이지의 generateStaticParams 는 여기까지 오지 않는다. */
export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

/** 1200×630 에 두 줄 남짓 들어간다. 넘치면 잘라야 카테고리·사이트 이름이 밀려나지 않는다. */
const MAX_TITLE_LENGTH = 48;

/**
 * ImageResponse 는 앱 CSS 가 닿지 않는 별도 렌더러라 --cat-* 을 읽을 수 없고,
 * 번들된 satori 의 색 파서에 oklch 가 없다 (hsl·rgb 만 있다).
 *
 * **그래서 색은 `src/lib/og-colors.ts` 가 정본과 같은 OKLCH 값에서 빌드 시점에 굽는다.**
 * 예전에는 이 자리에 hex 다섯 개를 손으로 계산해 적어 뒀는데, 팔레트가 바뀌면
 * 아무도 모르게 옛 색으로 남았다. 이 파일에 hex 를 다시 적지 마라.
 */

export default async function OpengraphImage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const post = getPostBySlug(slug);
  const found = post ? getCategory(post.category) : undefined;

  const title = post?.frontmatter.title ?? SITE_NAME;
  // 카테고리를 못 찾은 카드에는 부호를 붙일 수 없다 — 중성으로 떨어뜨린다.
  const accent = found ? OG_ACCENT[found.accent] : OG_GROUND.heading;
  // 축은 이름만 — 카드가 작아 번호까지 넣으면 카테고리 줄과 다투기만 한다.
  const axis = post ? getAxis(post.frontmatter.axis) : undefined;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: OG_GROUND.bg,
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
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", fontSize: 30, color: accent }}>
              {found?.name ?? SITE_NAME}
            </div>
            {axis ? (
              // 축에 안료를 주지 않는다 — 안료 3색은 카테고리 전용이다 (UI_GUIDE).
              <div style={{ display: "flex", fontSize: 24, color: OG_GROUND.muted }}>
                {axis.name}
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 64,
              fontWeight: 600,
              lineHeight: 1.3,
              color: OG_GROUND.heading,
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
              borderTop: `1px solid ${OG_GROUND.border}`,
              paddingTop: 28,
              fontSize: 28,
              color: OG_GROUND.muted,
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
