import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // 관리자 화면은 blog-3 에서 생기지만, 색인 대상이 아닌 것은 처음부터 막아 둔다.
    rules: { userAgent: "*", allow: "/", disallow: "/admin/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
