import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `next dev` 는 기본으로 CLAUDE.md 에 자기 안내 블록을 덧붙인다.
  // CLAUDE.md 는 매 step 프롬프트에 주입되는 가드레일이라 생성 도구가 건드리면 안 된다.
  agentRules: false,
};

export default nextConfig;
