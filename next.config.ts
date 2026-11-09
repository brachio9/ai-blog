import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `next dev` 는 기본으로 CLAUDE.md 에 자기 안내 블록을 덧붙인다.
  // CLAUDE.md 는 매 step 프롬프트에 주입되는 가드레일이라 생성 도구가 건드리면 안 된다.
  agentRules: false,

  // ── Cloudflare Workers 무료 한도(워커 번들 gzip 3 MiB) 맞추기 ──────────────────────────
  // 공개 페이지는 전부 빌드 때 굽고 런타임에는 정적 캐시에서 나간다. 아래는 런타임에 쓰지 않는
  // 덩어리를 워커 번들에서 빼는 설정이다. 하나라도 지우면 한도를 넘는다 — docs/DEPLOY.md.

  // Turbopack 은 서버 청크를 라우트마다 따로 굽는다 — 글 로더(gray-matter·zod)가 든 같은 청크가
  // 11벌 복제되어 gzip ~1.3 MiB 를 먹었다. 외부 패키지로 두면 node_modules 의 한 벌을 함께 쓴다.
  serverExternalPackages: ["gray-matter", "zod"],

  // OG 이미지는 전부 빌드 때 굽는다 (opengraph-image.tsx 의 generateStaticParams·dynamicParams).
  // 추적에서 @vercel/og 를 빼면 OpenNext 가 런타임 OG 를 던지는 shim 으로 바꿔
  // resvg·yoga WASM 과 폰트(gzip ~0.75 MiB)를 싣지 않는다.
  outputFileTracingExcludes: {
    "/**": ["node_modules/next/dist/compiled/@vercel/og/**"],
  },

  // rehype-pretty-code 가 기본값용으로 import 하는 shiki 전체 번들(모든 언어 문법)을 stub 으로
  // 돌린다 — src/lib/shiki-stub.ts. 키는 정확히 `shiki` 만 잡고 `shiki/core` 등 하위 경로는 그대로다.
  // transpilePackages 는 shiki(기본 외부 패키지)를 Turbopack 이 직접 번들하게 해 쓰는 부분만 남긴다 — 빼면 +31 KiB.
  transpilePackages: ["shiki"],
  turbopack: {
    resolveAlias: { shiki: "./src/lib/shiki-stub.ts" },
  },

  images: {
    // **`remotePatterns` 를 열지 마라.** 목록 썸네일은 남의 그림을 원본 주소 그대로
    // 임베드한다 (`components/post/PostThumb.tsx`). 최적화기를 태우면 Vercel 이 원본을
    // 받아 변환해 **우리 인프라에 파생 사본을 캐시하고 우리 도메인에서 재배포**하는데,
    // 그러면 「복제가 아니라 임베드」라는 근거가 그 자리에서 사라진다.
    // 게다가 `"**"` 는 `/_next/image?url=` 을 공개 이미지 프록시로 만들고, 호스트를
    // 열거하는 방식은 목록에 없는 호스트가 발행되는 순간 프로덕션 500 이다.
    // 안 열면 이 질문 자체가 사라진다.

    // **최적화기 자체를 끈다.** Cloudflare Workers(OpenNext) 에는 Vercel 의 내장 최적화기가
    // 없다 — 켜 두면 `/_next/image` 가 Cloudflare Images 바인딩(유료 변환)을 요구한다.
    // 본문 도식은 직접 그린 SVG 이고(public/sample/*.svg) 최적화기는 SVG 를 변환하지 않고
    // 그대로 넘기므로 잃는 것이 없다. `/sample/x.svg` 를 정적 파일로 바로 낸다.
    unoptimized: true,
  },
};

export default nextConfig;
