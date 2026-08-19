import Link from "next/link";

import { CAT_CLASS, getCategory } from "@/lib/categories";
import { postHref } from "@/lib/pagination";
import type { ReleaseGroup } from "@/lib/releases";

export interface ReleaseDigestProps {
  groups: ReleaseGroup[];
  /** 훑는 면에서는 닫아 둔다. 출처 목록에서는 펼쳐 둔다 */
  defaultOpen?: boolean;
}

/**
 * 그날의 **정기 릴리즈 묶음** — 일자 구획의 침전물이다.
 *
 * 닫힌 줄 하나가 이 지면에서 가장 값어치 있는 줄이다: 「오늘 27건 중 8건은 버전만 올라갔다」를
 * 한 문장으로 말한다. 2026-08-18 기준으로 27행이 20줄이 되고, 훑는 데 읽을 글자가
 * 약 3,460자에서 약 900자로 준다.
 *
 * 세 가지가 의도한 결정이다:
 *
 * 1. **축 번호 칸을 비운다.** 다른 행은 레일 첫 줄이 `01`~`06` 인데 이 묶음은 축을 가로지른다.
 *    그 **빈칸 자체가 「다른 종류의 행」이라는 표시**다. `07` 같은 것을 넣으면 일곱 번째 축으로 읽힌다.
 * 2. **여기서만 번호가 없고 안료가 있다.** 이 한 블록은 카테고리가 실제 조직 원리라서,
 *    지면의 나머지와 반대로 선다. 뒤집힘이 곧 「여긴 다르다」는 신호다.
 * 3. **접힌 줄에 한글이 없다.** `owner/repo` 와 버전 태그는 둘 다 식별자라 전부 mono 다 —
 *    두 목소리를 섞지 않는 것이 아니라 애초에 한 목소리만 쓴다. 한글 제목은 줄당 20자가 넘어
 *    여기 넣으면 접은 뜻이 사라진다.
 *
 * `<details>`/`<summary>` 는 아카이브가 쓰는 것과 같은 장치다 — 여는 표식은 브라우저 기본을
 * 그대로 쓰고 JS 도 아이콘도 애니메이션도 없다.
 */
export function ReleaseDigest({
  groups,
  defaultOpen = false,
}: ReleaseDigestProps) {
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);
  if (total === 0) {
    return null;
  }

  const category = getCategory("releases");

  return (
    <li className={`entry ${category ? CAT_CLASS[category.accent] : ""}`}>
      {/* 레일 첫 줄(축 번호)이 비어 있는 것이 이 행의 표시다 — 채우지 마라. */}
      <div className="entry-rail">
        <span className="cat-label">{category?.shortName}</span>
      </div>

      <div className="min-w-0">
        <details open={defaultOpen}>
          <summary className="voice-ui cursor-pointer text-muted marker:text-muted">
            정기 릴리즈 <span className="voice-source">{total}</span>건 · 저장소{" "}
            <span className="voice-source">{groups.length}</span>곳
          </summary>

          <ul role="list" className="mt-[var(--space-2)] space-y-[var(--space-1)]">
            {groups.map((group) => (
              <li
                key={group.repoKey}
                className="voice-source flex flex-wrap items-baseline gap-x-[var(--space-3)] text-muted"
              >
                <span className="min-w-0 break-all">{group.repoKey}</span>
                <span className="flex flex-wrap gap-x-[var(--space-2)]">
                  {group.items.map((item) => (
                    // 태그마다 제 글로 간다 — 같은 날 두 판이 합쳐져도 둘 다 도달할 수 있다.
                    <Link
                      key={item.slug}
                      href={postHref(item.slug)}
                      className="underline-offset-[0.2em] transition-colors hover:text-heading hover:underline focus-visible:outline-2 focus-visible:outline-focus"
                    >
                      {item.tag}
                    </Link>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </li>
  );
}
