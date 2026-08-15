import { ImageResponse } from "next/og";

import { getAxis } from "@/lib/axes";
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
 * 게다가 번들된 satori 의 색 파서에 oklch 가 없어(hsl·rgb 만 있다) 안료를 hex 로 굳혀야 한다.
 *
 * **이 값의 정본은 `design/styles.css` 의 안료 ramp 와 먹 계단이다. 팔레트가 바뀌면 여기도 고쳐야 한다.**
 * 카드 배경이 라이트이므로 낮 값 — globals.css 의 --cat-* 매핑과 같은 짝이다.
 *
 *   paper     草綠  --color-accent-600    oklch(0.500 0.095 140) → #44703b
 *   release   朱土  --color-accent-2-600  oklch(0.500 0.100  40) → #924d35
 *   news      藍    --color-accent-3-600  oklch(0.500 0.075 250) → #41668d
 *   community 먹 中 --color-neutral-600   oklch(0.520 0.008  78) → #6b6864
 *   note      먹 濃 --color-neutral-800   oklch(0.300 0.008  72) → #302d29
 *
 * 변환은 OKLab → 선형 sRGB → 감마 인코딩. 다섯 다 sRGB 색역 안이라 클리핑이 없고,
 * 카드 바탕(#fafafa) 대비 5.55·6.03·5.73·5.31·13.12:1 로 본문 기준 4.5:1 을 넘는다.
 * 먹 2칸은 색이 아니라 **색을 안 쓰는 것**이 부호다 — 여기서도 안료를 새로 만들지 마라.
 */
const ACCENT_COLOR: Record<CategoryAccent, string> = {
  paper: "#44703b",
  release: "#924d35",
  news: "#41668d",
  community: "#6b6864",
  note: "#302d29",
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
  // 축은 이름만 — 카드가 작아 번호까지 넣으면 카테고리 줄과 다투기만 한다.
  const axis = post ? getAxis(post.frontmatter.axis) : undefined;

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
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", fontSize: 30, color: accent }}>
              {found?.name ?? SITE_NAME}
            </div>
            {axis ? (
              // 축에 안료를 주지 않는다 — 안료 3색은 카테고리 전용이다 (UI_GUIDE).
              <div style={{ display: "flex", fontSize: 24, color: "#737373" }}>
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
