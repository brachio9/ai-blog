# Step 0: tokens

디자인 시스템 「초록 Chorok」의 토큰 층을 앱으로 옮긴다. **이 step 이후 모든 화면의 색·활자·간격은 여기서 나온다.**

## 읽어야 할 파일

먼저 아래를 읽고 설계 의도를 파악하라:

- `design/readme.md` — 손잡이 표, 불변 넷, 이미 만들어져 있는 클래스
- `design/styles.css` — **토큰의 정본.** 이 파일의 `:root` 블록이 이번 step 의 원본이다
- `design/foundations/color.html` · `design/foundations/type.html` · `design/foundations/layout.html` — 실제 크기 프리뷰
- `src/app/globals.css` — 지금의 토큰 층 (교체 대상)
- `src/app/layout.tsx` — 폰트 로딩
- `src/components/mdx/Chart.tsx` — 런타임에 CSS 변수를 읽는 유일한 곳

## 작업

### 1) `src/app/globals.css` — 토큰 정본을 `--color-*` 로

`design/styles.css` 의 `:root` 블록에 있는 값을 **그대로** 옮겨 온다. 값을 새로 만들지 마라.

옮겨야 할 것:

- 안료 ramp 4종 — `--color-accent-100..900`(草綠) · `--color-accent-2-*`(朱土) · `--color-accent-3-*`(藍) · `--color-neutral-*`(먹). 전부 OKLCH 리터럴이다.
- 낮 ground 역할 — `--color-bg` · `--color-surface` · `--color-text` · `--color-muted` · `--color-line` · `--color-accent` · `--color-accent-2` · `--color-accent-3` · `--color-selection`
- 활자 — `--font-heading` · `--font-body` · `--font-ui` · `--font-mono`, `--text-h1..h6` · `--text-body` · `--text-small` · `--text-meta`, `--leading-*` · `--tracking-meta`
- 간격 — `--space-1..9` (5·9·14·18·28·37·55·74·110px)
- 치수·모서리·그림자 — `--radius-*` · `--shadow-*` · `--rule-hair` · `--measure` · `--rail` · `--page-max` · `--entry-pad`

### 2) 다크 모드는 `.dark` 클래스로 매핑한다

`design/styles.css` 는 `[data-theme]` + `prefers-color-scheme` 를 쓰지만 **앱은 `.dark` 클래스 방식이다**
(`@custom-variant dark (&:where(.dark, .dark *))` 와 `src/lib/theme.ts` 가 이미 그렇게 동작한다).

밤 ground 값(`design/styles.css` 의 `:root[data-theme="dark"]` 블록)을 **`.dark` 셀렉터 안에** 넣어라.
`[data-theme]` 셀렉터를 앱에 도입하지 마라. 이유: 토글·초기 스크립트·Tailwind variant 가 전부 `.dark` 를 전제로 이미 동작한다.

### 3) 기존 토큰 이름은 별칭으로 남긴다

`--bg` · `--surface` · `--border` · `--heading` · `--body` · `--muted` · `--faint` · `--focus` ·
`--cat-hf` · `--cat-paper` · `--cat-note` · `--sans` · `--serif` · `--mono` 는 **지우지 말고** 새 토큰을 가리키게 한다.

```css
--bg: var(--color-bg);
--border: var(--color-line);
--cat-paper: var(--color-accent);    /* 최신 논문 = 草綠 */
--cat-hf: var(--color-accent-2);     /* 허깅페이스 소식 = 朱土 */
--cat-note: var(--color-accent-3);   /* 수집 자료 = 藍 */
```

이유: 컴포넌트 40여 개를 이 step 에서 한꺼번에 고치면 리뷰가 불가능해진다. 별칭을 두면 화면이 즉시 새 팔레트로
바뀌고, 이후 step 들이 자기 담당 화면만 새 이름으로 이관한다.

`--heading` 과 `--body` 는 둘 다 `var(--color-text)` 를 가리킨다 — 새 시스템은 제목과 본문의 색을 나누지 않는다.

### 4) `--chart-1` … `--chart-5` 는 이름을 유지하고 값만 안료 계열로

`Chart.tsx` 가 이 이름을 런타임에 읽는다. **이름을 바꾸면 차트가 경고 없이 검정이 된다.**
값은 안료 3색 + 먹 계열에서 고른다 (예: 草綠·朱土·藍 의 500/600 단계와 중성 두 단계). 라이트/다크 각각 정의한다.

### 5) 활자 역할 교체 — 명조가 본문이다

`src/app/layout.tsx` 는 이미 `IBM_Plex_Sans_KR` · `Noto_Serif_KR` · `IBM_Plex_Mono` 셋을 불러온다. **폰트 로딩은 그대로 두고 역할만 바꾼다.**

- `--font-heading` · `--font-body` → **Noto Serif KR** (지금은 sans 가 본문이다)
- `--font-ui` → IBM Plex Sans KR (작은 한글 라벨 전용)
- `--font-mono` → IBM Plex Mono

`body` 의 기본 글꼴을 `var(--font-body)` 로, 기본 크기를 `var(--text-body)`, 행간을 `var(--leading-body)` 로 둔다.

### 6) 한글 조판 규칙과 `.voice-source`

`word-break: keep-all` · `overflow-wrap: break-word` 는 `body` 에 그대로 유지한다.
그리고 `design/styles.css` 의 `.voice-source` 클래스를 그대로 가져온다 — **`overflow-wrap: normal`·`word-break: normal` 이 반드시 들어가야 한다.**
이유: 이게 없으면 `arXiv:2608.01337` 이 `arXiv:2608.01` / `337` 로 쪼개진다. 실측으로 확인한 결함이다.

`.voice-ui` · `.kicker` 도 함께 가져온다.

### 7) Tailwind 노출

`@theme inline` 으로 노출하던 기존 매핑은 유지한다. 새 토큰 중 유틸리티로 쓸 것(`--color-accent` 등)만 추가한다.
**`@theme` 에 넣었다고 런타임 조회가 되는 게 아니다** — Tailwind v4 는 마크업에 안 쓰인 `@theme` 변수를 빌드에서 제거한다.
런타임 조회가 필요한 값은 `:root` 원시 변수로도 반드시 남겨 둔다.

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run typecheck
node -e "
const fs=require('fs');
const ds=fs.readFileSync('design/styles.css','utf8');
const app=fs.readFileSync('src/app/globals.css','utf8');
const pick=(css,n)=>{const m=css.match(new RegExp('--'+n.replace(/[-]/g,'\\\\-')+':\\\\s*([^;]+);'));return m&&m[1].trim();};
const must=['color-accent-100','color-accent-500','color-accent-900','color-accent-2-500','color-accent-3-500','color-neutral-100','color-neutral-900'];
for(const t of must){
  const a=pick(ds,t), b=pick(app,t);
  if(!b) throw new Error(t+' 이 globals.css 에 없다');
  if(a!==b) throw new Error(t+' 값이 design/styles.css 와 다르다 — 디자인이 정본이다. design='+a+' app='+b);
}
console.log('토큰 값이 design/styles.css 와 일치 ('+must.length+'건)');
"
node -e "
const fs=require('fs');
const css=fs.readFileSync('src/app/globals.css','utf8');
for(let i=1;i<=5;i++) if(!css.includes('--chart-'+i)) throw new Error('--chart-'+i+' 이 사라졌다 — Recharts 가 경고 없이 검정으로 칠한다');
for(const t of ['--bg','--surface','--border','--heading','--body','--muted','--focus','--cat-hf','--cat-paper','--cat-note','--sans','--serif','--mono'])
  if(!css.includes(t)) throw new Error('기존 토큰 '+t+' 이 사라졌다 — 별칭으로 남겨야 한다');
for(const s of ['--space-1','--space-5','--space-9','--measure','--rail','--page-max','--entry-pad','--radius-sm','--shadow-lg'])
  if(!css.includes(s)) throw new Error('토큰 '+s+' 이 없다');
if(!/--space-3:\s*14px/.test(css)) throw new Error('간격 척도가 design/styles.css 와 다르다 (--space-3 은 14px — 8의 배수가 아닌 것이 의도다)');
if(/\[data-theme/.test(css)) throw new Error('[data-theme] 셀렉터를 도입했다 — 앱은 .dark 클래스 방식이다');
if(!/\.dark\b/.test(css)) throw new Error('.dark 재정의가 없다 — 다크 모드가 죽는다');
if(!/word-break:\s*keep-all/.test(css)) throw new Error('word-break: keep-all 이 없다');
if(!/overflow-wrap:\s*break-word/.test(css)) throw new Error('overflow-wrap: break-word 가 없다');
console.log('토큰 구조·다크·조판 OK');
"
node -e "
const fs=require('fs');
const css=fs.readFileSync('src/app/globals.css','utf8');
const m=css.match(/\.voice-source\s*\{[^}]*\}/);
if(!m) throw new Error('.voice-source 클래스가 없다 — 원문의 목소리(mono 메타)를 그릴 수 없다');
if(!/overflow-wrap:\s*normal/.test(m[0])) throw new Error('.voice-source 에 overflow-wrap: normal 이 없다 — arXiv 식별자가 중간에서 쪼개진다');
for(const c of ['.voice-ui','.kicker']) if(!css.includes(c)) throw new Error(c+' 클래스가 없다');
console.log('두 목소리 클래스 OK');
"
node -e "
const fs=require('fs');
const css=fs.readFileSync('src/app/globals.css','utf8');
const heading=(css.match(/--font-heading:\s*([^;]+);/)||[])[1]||'';
const body=(css.match(/--font-body:\s*([^;]+);/)||[])[1]||'';
if(!/serif/i.test(heading)) throw new Error('--font-heading 이 명조가 아니다 — 새 시스템은 제목·본문 모두 Noto Serif KR 이다');
if(!/serif/i.test(body)) throw new Error('--font-body 가 명조가 아니다');
if(!css.includes('--font-ui')) throw new Error('--font-ui 가 없다 — 작은 한글 라벨용 산세리프');
console.log('활자 역할 OK');
"
node -e "
const fs=require('fs'), path=require('path');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const css=walk('.next/static').filter(f=>f.endsWith('.css')).map(f=>fs.readFileSync(f,'utf8')).join('');
if(!/oklch\(/.test(css)) throw new Error('빌드 산출 CSS 에 oklch 가 없다 — 안료 팔레트가 적용되지 않았다');
if(!/word-break:\s*keep-all/.test(css)) throw new Error('빌드 산출 CSS 에 keep-all 이 없다');
const ko=(css.match(/u\+ac00/gi)||[]).length;
if(!ko) throw new Error('빌드 산출 CSS 에 한글 유니코드 범위가 없다 — 한글이 웹폰트로 안 그려진다');
console.log('빌드 산출 CSS OK (한글 범위 '+ko+'건)');
"
pytest scripts/test_execute.py -q
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - `docs/ARCHITECTURE.md` 디렉토리 구조를 따르는가?
   - `docs/ADR.md` 결정 사항(Tailwind v4 CSS-first, `tailwind.config.js` 없음)을 벗어나지 않았는가?
   - `CLAUDE.md` CRITICAL 규칙을 위반하지 않았는가?
   - **토큰 값을 새로 만들지 않고 `design/styles.css` 에서 옮겨 왔는가?** (디자인이 정본이다)
   - **`--chart-1..5` 이름이 그대로인가?**
3. 결과에 따라 `phases/blog-7-design-system/index.json` 의 step 0 을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary"` 에 **새로 정의한 토큰 이름 목록과 별칭 매핑, `.dark` 처리 방식**을 한 줄로 기록. 다음 step 들이 이 정보만 물려받는다.
   - 3회 시도 후 실패 → `"status": "error"` + `"error_message"`
   - 사람 개입 필요 → `"status": "blocked"` + `"blocked_reason"` 후 즉시 중단

## 금지사항

- **`design/` 아래 파일을 수정하지 마라.** 이유: 디자인 시스템이 정본이고 앱이 따라온다. 앱 사정으로 정본을 고치면 방향이 뒤집힌다.
- **`--chart-1` … `--chart-5` 의 이름을 바꾸지 마라.** 이유: `Chart.tsx` 가 런타임에 이 이름으로 읽고, 없으면 Recharts 가 경고도 빌드 실패도 없이 검정으로 칠한다.
- **기존 토큰 이름을 삭제하지 마라.** 이유: 40여 개 컴포넌트가 아직 그 이름을 쓴다. 이 step 에서 전부 고치면 리뷰가 불가능해진다.
- **`[data-theme]` 셀렉터를 앱에 도입하지 마라.** 이유: 토글·초기 스크립트·Tailwind variant 가 전부 `.dark` 클래스를 전제로 이미 동작한다.
- **컴포넌트 파일을 수정하지 마라.** 이 step 은 토큰 층과 `layout.tsx` 의 폰트 변수 연결까지다. 화면 구조는 이후 step 의 몫이다.
- **간격 척도를 8의 배수로 "정리"하지 마라.** 이유: 어긋난 수치가 의도다 (`design/brief.md` 의 불변 3).
- 기존 테스트를 깨뜨리지 마라.
