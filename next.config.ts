import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `next dev` 는 기본으로 CLAUDE.md 에 자기 안내 블록을 덧붙인다.
  // CLAUDE.md 는 매 step 프롬프트에 주입되는 가드레일이라 생성 도구가 건드리면 안 된다.
  agentRules: false,

  images: {
    // 본문 도식은 사진이 아니라 직접 그린 SVG 다 (public/sample/*.svg).
    // 이미지 최적화기는 SVG 를 기본으로 거부하므로(400) 열어 주되,
    // SVG 안에 실행 가능한 내용이 섞여도 돌지 못하도록 공식 권장 CSP 로 묶는다.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
