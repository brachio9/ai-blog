import GithubSlugger from "github-slugger";

/**
 * 목차 추출 — 본문 렌더와 같은 id 를 만들어야 한다.
 *
 * 본문의 id 는 `src/lib/mdx.ts` 의 rehype-slug 가 붙이고, rehype-slug 는 내부적으로
 * github-slugger 를 쓴다. 그래서 여기서도 **같은 패키지**로 slug 를 만든다.
 * 정규식으로 직접 만들면 한글·특수문자에서 어긋나 목차 링크가 전부 죽는다.
 */
export interface TocHeading {
  id: string;
  text: string;
  depth: 2 | 3;
}

/** ``` 또는 ~~~ 펜스. 코드블록 안의 `#` 은 제목이 아니다 (bash 주석). */
const FENCE_PATTERN = /^\s{0,3}(`{3,}|~{3,})/;

const HEADING_PATTERN = /^(#{1,6})\s+(.+?)\s*$/;

/**
 * rehype-slug 는 렌더된 **텍스트**로 id 를 만든다. 마크다운 기호를 남긴 채 slug 를 뜨면
 * 인라인 코드·링크가 든 제목에서 id 가 어긋난다.
 */
function toPlainText(markdown: string): string {
  return markdown
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*|\*([^*]+)\*/g, "$1$2")
    .trim();
}

/** MDX 본문에서 목차에 실을 제목(##·###)을 문서 순서대로 뽑는다. */
export function extractHeadings(mdx: string): TocHeading[] {
  const slugger = new GithubSlugger();
  const headings: TocHeading[] = [];
  /** 열려 있는 펜스의 마커 문자. 같은 종류로만 닫힌다. */
  let openFence: string | undefined;

  for (const line of mdx.split("\n")) {
    const fence = FENCE_PATTERN.exec(line);
    if (fence) {
      const marker = fence[1][0];
      if (!openFence) {
        openFence = marker;
      } else if (openFence === marker) {
        openFence = undefined;
      }
      continue;
    }
    if (openFence) {
      continue;
    }

    const heading = HEADING_PATTERN.exec(line);
    if (!heading) {
      continue;
    }

    const depth = heading[1].length;
    const text = toPlainText(heading[2]);
    // rehype-slug 는 h1~h6 전부를 같은 slugger 에 통과시킨다. 목차에 싣지 않는 깊이를
    // 건너뛰면 중복 제목의 번호가 밀려 링크가 어긋난다.
    const id = slugger.slug(text);

    if (depth === 2 || depth === 3) {
      headings.push({ id, text, depth });
    }
  }

  return headings;
}
