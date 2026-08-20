import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `next dev` 는 기본으로 CLAUDE.md 에 자기 안내 블록을 덧붙인다.
  // CLAUDE.md 는 매 step 프롬프트에 주입되는 가드레일이라 생성 도구가 건드리면 안 된다.
  agentRules: false,

  images: {
    // **`remotePatterns` 를 열지 마라.** 목록 썸네일은 남의 그림을 원본 주소 그대로
    // 임베드한다 (`components/post/PostThumb.tsx`). 최적화기를 태우면 Vercel 이 원본을
    // 받아 변환해 **우리 인프라에 파생 사본을 캐시하고 우리 도메인에서 재배포**하는데,
    // 그러면 「복제가 아니라 임베드」라는 근거가 그 자리에서 사라진다.
    // 게다가 `"**"` 는 `/_next/image?url=` 을 공개 이미지 프록시로 만들고, 호스트를
    // 열거하는 방식은 목록에 없는 호스트가 발행되는 순간 프로덕션 500 이다.
    // 안 열면 이 질문 자체가 사라진다.

    // 본문 도식은 사진이 아니라 직접 그린 SVG 다 (public/sample/*.svg).
    // 이미지 최적화기는 SVG 를 기본으로 거부하므로(400) 열어 주되,
    // SVG 안에 실행 가능한 내용이 섞여도 돌지 못하도록 공식 권장 CSP 로 묶는다.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
