import { ImageResponse } from "next/og";

import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export const alt = SITE_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * 사이트 기본 OG. 루트에 두면 하위 라우트가 자기 것을 갖기 전까지 이걸 물려받는다.
 * ImageResponse 는 앱 CSS 가 닿지 않는 별도 렌더러라 UI_GUIDE 의 색을 hex 로 직접 적는다 (예외 허용).
 */
export default function OpengraphImage() {
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
            justifyContent: "center",
            padding: "0 80px",
          }}
        >
          <div style={{ fontSize: 76, fontWeight: 600, color: "#1c1917" }}>
            {SITE_NAME}
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 34,
              lineHeight: 1.5,
              color: "#78716c",
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
