# Step 0: categories

카테고리를 **3칸에서 5칸으로** 늘린다. 이 step 은 **데이터와 색만** 바꾼다 — 화면 배치·문구는 step 2 가 한다.

## 읽어야 할 파일

- `docs/PRD.md` 의 「카테고리 (소스 축, 5개)」 절 — **이 표가 정본이다**
- `docs/UI_GUIDE.md` 의 「분류 축은 셋이고…」 절 — 부호 표
- `src/lib/categories.ts` — 이 step 의 주 대상
- `src/app/globals.css` 의 `--cat-*`(174행 근처) · `--color-cat-*`(236행 근처) · `.cat-*`(358행 근처)
- `src/components/post/PostTable.tsx` · `src/app/(public)/[category]/page.tsx` · `src/app/(public)/[category]/[slug]/opengraph-image.tsx` — `Record<CategoryAccent, …>` 가 있는 곳
- `design/styles.css` 의 먹(neutral) 계단 — **색 값의 정본**

## 왜 바꾸는가 (배경 — 지어내지 말 것)

수집 파이프라인(별도 레포 `chorok-collect`)이 실제로 모으는 소스 59곳의 분포에 맞춘다.
옛 `hf-blog` 한 칸에 **GitHub 릴리즈 28곳**과 **기업 블로그·뉴스레터 17곳**이 함께 들어 있었다.
"버전이 나왔다"와 "이런 걸 만들었다"는 성격이 다르므로 두 칸으로 가른다.

사이트가 아직 오픈 전이라 **끊길 외부 링크가 없다** — 그래서 지금 slug 을 바꿀 수 있다.

## 작업

### 1) `src/lib/categories.ts`

```ts
export type CategorySlug = "papers" | "releases" | "news" | "community" | "notes";
export type CategoryAccent = "paper" | "release" | "news" | "community" | "note";
```

`CATEGORIES` 배열을 **이 순서 그대로** 5항목으로 다시 쓴다 (화면 순서가 된다):

| slug | name | shortName | accent |
|---|---|---|---|
| `papers` | 논문 | 논문 | `paper` |
| `releases` | 릴리즈 | 릴리즈 | `release` |
| `news` | 소식 | 소식 | `news` |
| `community` | 커뮤니티 | 커뮤니티 | `community` |
| `notes` | 기록 | 기록 | `note` |

`description` 은 `docs/PRD.md` 의 카테고리 표 「성격」 열을 바탕으로 한 문장씩 새로 쓴다.
`notes` 의 description 에는 **「직접 재 보고 직접 만들어 본 것」과 「옮길 원문이 없다」** 가 들어가야 한다 —
이 카테고리만 봇이 채울 수 없고, 그것이 이 사이트의 차별점이다.

`CAT_CLASS` 를 5키로 확장한다. **클래스 이름을 `cat-{slug}` 규칙으로 통일하라**:

```ts
export const CAT_CLASS: Record<CategoryAccent, string> = {
  paper: "cat-papers",
  release: "cat-releases",
  news: "cat-news",
  community: "cat-community",
  note: "cat-notes",
};
```

> ⚠ **`.cat-news` 는 지금 옛 `hf-blog`(朱土)에 쓰이고 있다.** 새 구조에서 `news` 는 **소식(藍)** 이다.
> 같은 클래스 이름의 의미가 바뀌므로, globals.css 쪽도 반드시 함께 고쳐라. 안 고치면 색이 조용히 어긋난다.

`RESERVED_SEGMENTS` 는 그대로 둔다 — 새 slug 3개(`releases`·`news`·`community`)와 충돌하지 않는 것을 확인했다.
`categoryHref`·`getCategory` 는 무수정.

### 2) `src/app/globals.css` — 안료 3 + 먹 2

```css
/* 카테고리 (정보 부호) — src/lib/categories.ts 의 accent 키와 짝이다. */
--cat-paper: var(--color-accent);         /* 논문 — 草綠 */
--cat-release: var(--color-accent-2);     /* 릴리즈 — 朱土 */
--cat-news: var(--color-accent-3);        /* 소식 — 藍 */
--cat-community: var(--color-neutral-600);/* 커뮤니티 — 먹 中 */
--cat-note: var(--color-neutral-800);     /* 기록 — 먹 濃 */
```

`--color-cat-*` 5줄과 `.cat-*` 5줄도 같은 짝으로 맞춘다.

**먹 2칸이 부호다.** `community` 는 원문이 여럿이라 하나를 가리킬 수 없고, `notes` 는 옮길 원문이 아예 없다.
색을 안 쓰는 것이 그 사실을 말한다 — 주석으로 근거를 남겨라.

**밤(`.dark`) 처리를 확인하라.** 안료는 `--color-accent*` 가 `.dark` 에서 600→300 으로 이미 갈리지만,
**먹은 그렇지 않다** — 어두운 바탕에서 `neutral-600`·`neutral-800` 은 배경에 묻힌다.
`.dark` 에서 두 먹을 밝은 단계(예: 400·200)로 뒤집어야 한다. 대비를 실제로 계산해 주석에 남겨라.

### 3) `Record<CategoryAccent, …>` 4곳에 값 채우기

유니온을 늘리면 아래 4곳이 **컴파일 에러**가 난다. **값만 채우고 로직·레이아웃은 건드리지 마라.**

| 파일 | 상수 | 새 키에 넣을 값 |
|---|---|---|
| `PostTable.tsx` | `ACCENT_TEXT` | 기존 3키와 같은 형식의 Tailwind 클래스 |
| `PostTable.tsx` | `ACCENT_RULE` | 〃 |
| `[category]/page.tsx` | `KICKER_ACCENT` | 〃 |
| `[slug]/opengraph-image.tsx` | `ACCENT_COLOR` | **hex** — satori 가 oklch 를 못 읽는다 |

> ⚠ `ACCENT_COLOR` 는 **hex 문자열이어야 한다.** 번들된 satori 의 색 파서에 oklch 가 없어
> 못 읽는 색은 **경고 없이 검정**으로 떨어진다 (blog-8 step 5 실측).
> 먹 2색은 `--color-neutral-600`·`-800` 의 oklch 를 sRGB hex 로 변환해 넣고, 변환값을 주석에 남겨라.

## Acceptance Criteria

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

```bash
node -e "const s=require('fs').readFileSync('src/lib/categories.ts','utf8'); const slugs=['papers','releases','news','community','notes']; const accents=['paper','release','news','community','note']; if(!slugs.every(x=>s.includes('\"'+x+'\"'))) throw new Error('CategorySlug 5개 누락'); if(!accents.every(x=>s.includes(x+':'))) throw new Error('CAT_CLASS 키 누락'); if(s.includes('hf-blog')) throw new Error('hf-blog 잔존'); console.log('categories.ts OK')"
```

```bash
node -e "const c=require('fs').readFileSync('src/app/globals.css','utf8'); for(const k of ['--cat-paper','--cat-release','--cat-news','--cat-community','--cat-note']) if(!c.includes(k)) throw new Error('누락: '+k); if(!/--cat-community:\s*var\(--color-neutral/.test(c)) throw new Error('community 가 먹이 아니다'); if(!/--cat-note:\s*var\(--color-neutral/.test(c)) throw new Error('note 가 먹이 아니다'); console.log('globals.css OK')"
```

```bash
node -e "const t=require('fs').readFileSync('src/app/(public)/[category]/[slug]/opengraph-image.tsx','utf8'); const m=t.match(/ACCENT_COLOR[^}]+}/s); if(!m) throw new Error('ACCENT_COLOR 없음'); if(/oklch/.test(m[0])) throw new Error('satori 는 oklch 를 못 읽는다 — hex 로 적어라'); const hex=m[0].match(/#[0-9a-fA-F]{6}/g)||[]; if(hex.length!==5) throw new Error('hex 5개가 아니다: '+hex.length); console.log('OG 색 OK')"
```

## 검증 절차

1. 위 AC 커맨드를 전부 실행한다.
2. 아키텍처 체크리스트:
   - `docs/PRD.md` 카테고리 표와 `categories.ts` 가 **정확히 일치**하는가 (slug·이름·짧은 이름·부호)
   - `docs/UI_GUIDE.md` 의 부호 표와 `globals.css` 값이 일치하는가
   - 안료는 여전히 **3색**인가 (먹은 안료가 아니다 — `design/theme.json` 의 `pigment-3` 을 바꾸지 않았는가)
   - 화면 파일(`PostTable`·`page.tsx`·`opengraph-image`)에서 **값 추가 외의 변경이 없는가** (`git diff` 로 눈으로 확인)
3. `phases/blog-9-recategorize/index.json` 의 step 0 을 갱신한다.
   `summary` 에는 **새 유니온·CATEGORIES 항목·색 매핑(먹 hex 포함)** 을 남겨라 — step 1~3 이 이 값을 그대로 쓴다.

## 금지사항

- **콘텐츠 파일을 옮기거나 고치지 마라.** 이유: step 1 의 범위다. 지금 옮기면 빌드가 깨진 채로 step 이 끝난다.
- **화면 배치·문구를 바꾸지 마라** (헤더 nav·홈 구역·about). 이유: step 2 의 범위이고, 지금 손대면 무엇이 색 문제이고 무엇이 배치 문제인지 분리할 수 없다.
- **`design/` 을 수정하지 마라.** 먹 계단은 이미 거기 정의돼 있다 — 읽어서 쓰되 고치지 마라.
- **`design/theme.json` 의 `"scheme": "pigment-3"` 을 바꾸지 마라.** 안료는 여전히 3색이고 먹은 안료가 아니다.
- **새 안료(4·5번째 색)를 만들지 마라.** 이유: 남은 hue 는 종이에 묻히는 황토와 UI_GUIDE 가 금지한 보라뿐이고, 먹 2칸은 타협이 아니라 의도된 부호다.
- 기존 테스트를 깨뜨리지 마라. `src/lib/categories.test.ts` 가 3-slug 정확일치를 검사하고 있다면 **5-slug 로 갱신**하되, 검사의 성격(정확일치·예약어 충돌)은 유지하라.
