import type { MetadataRoute } from "next";

import { CATEGORIES, categoryHref } from "@/lib/categories";
import { getAllPosts } from "@/lib/content/posts";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  // 초안은 getAllPosts() 가 프로덕션 빌드에서 이미 걸러낸다.
  const posts = getAllPosts();

  // 목록 페이지의 최종 수정일 = 가장 최신 글. 빌드 시각을 쓰면 내용이 같아도 매번 달라진다.
  const latest = new Date(
    posts[0]?.frontmatter.publishedAt ?? "2026-01-01T00:00:00+0900",
  );

  return [
    {
      url: SITE_URL,
      lastModified: latest,
      changeFrequency: "daily",
      priority: 1,
    },
    ...CATEGORIES.map((category) => ({
      url: `${SITE_URL}${categoryHref(category)}`,
      lastModified: latest,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...posts.map((post) => ({
      url: `${SITE_URL}/${post.category}/${post.slug}`,
      lastModified: new Date(
        post.frontmatter.updatedAt ?? post.frontmatter.publishedAt,
      ),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    {
      url: `${SITE_URL}/search`,
      lastModified: latest,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}
