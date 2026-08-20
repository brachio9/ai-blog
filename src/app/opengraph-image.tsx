import { ImageResponse } from "next/og";

import { OG_GROUND } from "@/lib/og-colors";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export const alt = SITE_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * 사이트 기본 OG. 루트에 두면 하위 라우트가 자기 것을 갖기 전까지 이걸 물려받는다.
 * ImageResponse 는 앱 CSS 가 닿지 않는 별도 렌더러라 색을 hex 로 받아야 한다 —
 * 그 hex 는 src/lib/og-colors.ts 가 정본 OKLCH 에서 굽는다. 여기 hex 를 적지 마라.
 */
export default function OpengraphImage() {
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
        {/* 사이트 전체를 대표하는 카드라 카테고리 색을 쓰지 않는다 — 중성 heading 으로 긋는다. */}
        <div style={{ width: 16, height: "100%", backgroundColor: OG_GROUND.heading }} />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 80px",
          }}
        >
          <div style={{ fontSize: 76, fontWeight: 600, color: OG_GROUND.heading }}>
            {SITE_NAME}
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 34,
              lineHeight: 1.5,
              color: OG_GROUND.muted,
            }}
          >
            {SITE_DESCRIPTION}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
