/**
 * 시그니처 「추린 비율」 (design/brief.md) 의 계산부.
 * 비율 규칙은 여기 한 곳에만 있다 — 화면은 이 함수들만 부르고 계산을 다시 적지 마라.
 */

/**
 * 영문 1 단어를 한글 몇 자로 칠 것인가.
 * 근거: 영문 단어는 평균 5자 안팎에 공백까지 6자를 쓰지만, 같은 내용을 한글로 옮기면
 * 조사를 붙이고도 2~3자에 들어간다 (한글은 음절 하나가 자모 2~3개를 담는다).
 * 두 언어의 글자 수를 직접 비교하면 초록이 실제보다 길어 보이므로 이 상수로 환산한다.
 */
const CHARS_PER_SOURCE_WORD = 2.5;

/** 1/1 은 "추렸다"는 말이 아니다. 이 아래로는 비율을 내보이지 않는다. */
const MIN_RATIO = 2;

/** 원본 파일을 통째로 넘겨도 본문만 세도록 — posts.ts 는 이미 떼어 낸 뒤다. */
const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n/;
const FENCED_CODE = /^[ \t]*(`{3,}|~{3,})[\s\S]*?^[ \t]*\1[ \t]*$/gm;
const BLOCK_MATH = /\$\$[\s\S]*?\$\$/g;
const INLINE_MATH = /\$[^$\n]+\$/g;
const INLINE_CODE = /`[^`\n]+`/g;
/** 태그만 지운다 — <Callout> 안의 한글은 독자가 실제로 읽는 문장이다. */
const JSX_TAG = /<\/?[A-Za-z][^>]*>/g;
/** alt 텍스트는 읽는 문장이 아니다. 링크는 반대로 표시 문자열만 남긴다. */
const IMAGE = /!\[[^\]]*\]\([^)]*\)/g;
const LINK = /\[([^\]]*)\]\([^)]*\)/g;
const BARE_URL = /https?:\/\/\S+/g;
/** 남은 것 중 글자와 숫자만 센다 — 마크다운 기호를 하나씩 지우는 것보다 새 문법에 안 뚫린다. */
const NOT_TEXT = /[^\p{L}\p{N}]/gu;

/** MDX 본문에서 사람이 읽는 글자 수를 센다. 코드블록·수식·JSX·frontmatter 는 제외한다. */
export function countBodyChars(mdxBody: string): number {
  const prose = mdxBody
    .replace(FRONTMATTER, "")
    .replace(FENCED_CODE, "")
    .replace(BLOCK_MATH, "")
    .replace(INLINE_MATH, "")
    .replace(INLINE_CODE, "")
    .replace(JSX_TAG, "")
    .replace(IMAGE, "")
    .replace(LINK, "$1")
    .replace(BARE_URL, "");

  return prose.replace(NOT_TEXT, "").length;
}

/** 시그니처 「추린 비율」의 계산 결과. 규칙은 이 파일 하나에만 있다. */
export type RatioInfo = NonNullable<ReturnType<typeof compressionRatio>>;

/**
 * 원문 대비 몇 분의 일로 줄였는지. 정수 비율로 반올림한다.
 * sourceWords 가 없으면 null — 호출부는 이때 비율을 그리지 않는다.
 */
export function compressionRatio(
  sourceWords: number | undefined,
  bodyChars: number,
): { ratio: number; bodyChars: number; sourceWords: number } | null {
  if (
    sourceWords === undefined ||
    !Number.isFinite(sourceWords) ||
    sourceWords <= 0
  ) {
    return null;
  }
  if (!Number.isFinite(bodyChars) || bodyChars <= 0) {
    return null;
  }

  // 반올림 전에 자른다 — 1.5 를 "1/2 로 추렸다"고 내보이면 없는 편집을 주장하게 된다.
  const raw = (sourceWords * CHARS_PER_SOURCE_WORD) / bodyChars;
  if (raw < MIN_RATIO) {
    return null;
  }

  return { ratio: Math.round(raw), bodyChars, sourceWords };
}
