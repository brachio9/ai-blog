import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import matter from "gray-matter";

import type { AxisSlug } from "@/lib/axes";
import { CATEGORIES, getCategory, type CategorySlug } from "@/lib/categories";
import type { Post } from "@/types/content";

import { compressionRatio, countBodyChars } from "./compression";
import { parseFrontmatter } from "./schema";

/** 글 원본은 오직 이 디렉토리의 파일 — CLAUDE.md CRITICAL. */
const CONTENT_DIR = path.join(process.cwd(), "content");

/** 파일 규약: content/{category}/YYYY-MM-DD-{slug}.mdx */
const FILE_NAME_PATTERN = /^(\d{4}-\d{2}-\d{2})-(.+)\.mdx$/;

/** 한글은 분당 약 500자. */
const CHARS_PER_MINUTE = 500;

function readingMinutesOf(body: string): number {
  const characters = body.replace(/\s/g, "").length;
  return Math.max(1, Math.ceil(characters / CHARS_PER_MINUTE));
}

function readPost(category: CategorySlug, fileName: string): Post {
  const filePath = `content/${category}/${fileName}`;

  const match = FILE_NAME_PATTERN.exec(fileName);
  if (!match) {
    throw new Error(
      `콘텐츠 파일명 규약 위반: ${filePath} — YYYY-MM-DD-slug.mdx 형식이어야 한다`,
    );
  }
  const slug = match[2];

  const raw = readFileSync(path.join(CONTENT_DIR, category, fileName), "utf8");
  const { data, content } = matter(raw);
  const frontmatter = parseFrontmatter(data, filePath);

  if (frontmatter.category !== category) {
    throw new Error(
      `frontmatter 검증 실패: ${filePath}\n  - category: 디렉토리는 ${category} 인데 frontmatter 는 ${frontmatter.category} 다`,
    );
  }

  return {
    frontmatter,
    slug,
    category,
    body: content,
    filePath,
    readingMinutes: readingMinutesOf(content),
    // 여기서 한 번만 잰다 — 목록이 본문을 들고 다니지 않아도 비율을 그릴 수 있게 된다.
    ratio:
      compressionRatio(frontmatter.source?.words, countBodyChars(content))
        ?.ratio ?? null,
  };
}

function readCategory(category: CategorySlug): Post[] {
  const directory = path.join(CONTENT_DIR, category);
  if (!existsSync(directory)) {
    return [];
  }

  const posts = readdirSync(directory)
    // .gitkeep 같은 dotfile 은 글이 아니다.
    .filter((fileName) => !fileName.startsWith("."))
    .map((fileName) => readPost(category, fileName));

  const seen = new Set<string>();
  for (const post of posts) {
    if (seen.has(post.slug)) {
      throw new Error(
        `slug 중복: ${category}/${post.slug} — 같은 카테고리 안에서 slug 는 유일해야 한다`,
      );
    }
    seen.add(post.slug);
  }

  return posts;
}

/** draft 는 개발에서만 보인다. 프로덕션 빌드에서는 제외한다. */
function isVisible(post: Post): boolean {
  return !post.frontmatter.draft || process.env.NODE_ENV !== "production";
}

/** publishedAt 내림차순. 형식이 고정(+0900)이라 문자열 비교로 충분하다. */
function byPublishedAtDesc(a: Post, b: Post): number {
  const byDate = b.frontmatter.publishedAt.localeCompare(
    a.frontmatter.publishedAt,
  );
  return byDate !== 0 ? byDate : a.slug.localeCompare(b.slug);
}

export function getAllPosts(): Post[] {
  if (existsSync(CONTENT_DIR)) {
    for (const entry of readdirSync(CONTENT_DIR, { withFileTypes: true })) {
      if (entry.isDirectory() && !getCategory(entry.name)) {
        throw new Error(
          `알 수 없는 콘텐츠 카테고리 디렉토리: content/${entry.name} — src/lib/categories.ts 에 없다`,
        );
      }
    }
  }

  const posts = CATEGORIES.flatMap((category) => readCategory(category.slug))
    .filter(isVisible)
    .sort(byPublishedAtDesc);
  assertUniqueSlugs(posts);
  return posts;
}

/**
 * slug 은 이제 **전역으로** 유일해야 한다 — 글 주소가 `/posts/{slug}` 라 카테고리가 없다.
 * 옛 주소(`/{category}/{slug}`)에서는 카테고리별 유일성으로 충분했고 `readCategory` 가 그것을 본다.
 *
 * 실제로 겹칠 일은 없다 — 수집기가 slug 뒤에 arXiv ID 나 해시 8자를 붙인다. 그래도 조용히
 * 404 가 되게 두지 않는다. **한쪽 글이 영영 안 보이는 것보다 빌드가 깨지는 것이 낫다.**
 */
function assertUniqueSlugs(posts: Post[]): void {
  const seen = new Map<string, string>();
  for (const post of posts) {
    const previous = seen.get(post.slug);
    if (previous !== undefined) {
      throw new Error(
        `slug 이 겹친다: '${post.slug}' — ${previous} 와 ${post.filePath}. ` +
          "글 주소가 /posts/{slug} 라 카테고리가 달라도 같은 주소가 된다.",
      );
    }
    seen.set(post.slug, post.filePath);
  }
}

/** slug 하나로 글을 찾는다. 주소에 카테고리가 없으므로 이것이 상세 페이지의 창구다. */
export function getPostBySlug(slug: string): Post | undefined {
  return getAllPosts().find((post) => post.slug === slug);
}

export function getPostsByCategory(slug: CategorySlug): Post[] {
  return readCategory(slug).filter(isVisible).sort(byPublishedAtDesc);
}

/**
 * 축별 글. 축은 디렉토리가 아니라 frontmatter 라서 카테고리 하나가 아니라 전부를 훑는다 —
 * 한 축이 세 카테고리에 걸쳐 있는 것이 정상이다.
 * 초안 제외·최신순은 getAllPosts() 가 이미 끝냈다.
 */
export function getPostsByAxis(slug: AxisSlug): Post[] {
  return getAllPosts().filter((post) => post.frontmatter.axis === slug);
}

export function getPost(
  category: CategorySlug,
  slug: string,
): Post | undefined {
  return getPostsByCategory(category).find((post) => post.slug === slug);
}

/** 태그 목록. 글 수 내림차순, 같으면 이름 오름차순. */
export function getAllTags(): { tag: string; count: number }[] {
  const counts = new Map<string, number>();

  for (const post of getAllPosts()) {
    for (const tag of post.frontmatter.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
