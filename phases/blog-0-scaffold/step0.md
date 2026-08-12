# Step 0: project-setup

Next.js 16 앱 골격을 이 레포에 심는다. 디자인·레이아웃은 다음 step 소관이므로 여기서는 **빌드가 도는 최소 골격**만 만든다.

## 읽어야 할 파일

- `/docs/ARCHITECTURE.md` — 디렉토리 구조 (특히 `src/` 하위 계약)
- `/docs/ADR.md` — ADR-003(MDX 단일화), ADR-008(Tailwind v4 CSS-first)
- `/CLAUDE.md` — 기술 스택과 CRITICAL 규칙
- `/.gitignore` — 이미 Next.js 용 항목이 들어 있다. 덮어쓰지 마라.

## 배경 (이미 검증된 사실 — 다시 조사하지 마라)

이 지시는 실제로 실행해 확인한 결과를 바탕으로 한다:

1. **`create-next-app` 은 이 레포 루트에서 실패한다.** `CLAUDE.md` · `README.md` · `phases/` · `scripts/` 를 충돌 파일로 판단하고 거부한다. 그래서 아래 "임시 디렉토리 생성 후 복사" 절차를 쓴다.
2. **`create-next-app` 은 자기 `CLAUDE.md` 와 `AGENTS.md` 를 생성한다.** 이걸 복사해 오면 프로젝트 가드레일 `CLAUDE.md` 가 파괴된다. 반드시 제외한다.
3. **생성되는 `package.json` 에는 `test` 스크립트가 없다.** Stop 훅이 `npm run lint && npm run build && npm run test` 를 실행하므로 그대로 두면 매 세션 종료 시 훅이 실패한다.
4. **Next.js 16 에서 `next lint` 는 제거되었다.** `lint` 스크립트는 `eslint` 를 직접 호출한다 (생성물 기본값이 이미 그렇다).
5. 생성되는 버전: `next@16.3.0` · `react@19.2.8` · `typescript@^5` · `tailwindcss@^4` · `eslint-config-next@16.3.0`. Tailwind v4 라 `tailwind.config.js` 는 없고 CSS-first 설정을 쓴다.
6. **`rm -rf` 는 PreToolUse 훅이 차단한다.** 임시 디렉토리 정리는 `rm -r <경로>` 로 하라 (`-f` 를 붙이지 마라).

## 작업

### 1) 임시 디렉토리에 scaffold 생성

```bash
TMP=/tmp/blog-scaffold-$$
npx --yes create-next-app@latest "$TMP" \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --use-npm --disable-git --skip-install --yes
```

### 2) 레포로 복사 — 제외 목록을 반드시 지킬 것

`$TMP` 에서 아래만 복사한다:

```
next.config.ts
tsconfig.json
eslint.config.mjs
postcss.config.mjs
package.json
src/app/layout.tsx
src/app/globals.css
src/app/page.tsx
src/app/favicon.ico
```

**복사하지 마라 (이유 포함):**
- `CLAUDE.md` — 프로젝트 가드레일 문서를 덮어쓴다. 절대 금지.
- `AGENTS.md` — 이 프로젝트는 `CLAUDE.md` 를 정본으로 쓴다. 두 벌의 지침은 서로 어긋난다.
- `README.md` — 기존 README 를 덮어쓴다.
- `.gitignore` — 기존 것이 이미 Next.js + 하네스 양쪽에 맞춰져 있다.
- `next-env.d.ts` — gitignore 대상이며 `next build` 가 자동 생성한다.
- `public/*.svg` (next.svg, vercel.svg, file.svg, globe.svg, window.svg) — 템플릿 데모 자산. 쓰지 않는다.

복사가 끝나면 `rm -r "$TMP"` 로 정리한다.

### 3) package.json 정리

- `name` 을 `ai-trends-blog` 로 바꾼다.
- `scripts` 에 아래를 **추가**한다 (기존 `dev`/`build`/`start`/`lint` 는 유지):
  - `"test": "vitest run"`
  - `"typecheck": "tsc --noEmit"`

### 4) 의존성 설치

```bash
npm install --no-audit --no-fund
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom --no-audit --no-fund
```

### 5) Vitest 설정

`vitest.config.ts` 를 레포 루트에 만든다. 요구 사항:
- `@vitejs/plugin-react` 플러그인
- `environment: "jsdom"`, `globals: true`
- `include: ["src/**/*.test.{ts,tsx}"]` — `scripts/` 의 Python 테스트와 섞이지 않게 범위를 좁힌다
- `@` 별칭을 `./src` 로 resolve (tsconfig 의 `paths` 와 일치시켜야 한다)

`src/lib/smoke.test.ts` 에 최소 테스트 1개를 둔다. 이유: `npm run test` 가 "테스트 파일 없음"으로 실패하면 Stop 훅이 매번 깨진다.

### 6) 데모 콘텐츠 제거

`src/app/page.tsx` 의 create-next-app 데모 마크업을 지우고, 제목 한 줄 정도의 최소 플레이스홀더로 교체한다. 스타일링은 하지 마라 — step 1·2 소관이다.

`src/app/layout.tsx` 의 `metadata` 를 이 프로젝트에 맞게 고친다 (`title`, `description`). 폰트 설정은 건드리지 마라 — step 1 소관이다.

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run typecheck
node -e "const s=require('./package.json').scripts;['dev','build','lint','test','typecheck'].forEach(k=>{if(!s[k])throw new Error('missing script: '+k)});console.log('scripts OK')"
grep -q "AI 동향 블로그" CLAUDE.md && echo "guardrail CLAUDE.md OK"
test ! -f AGENTS.md && echo "AGENTS.md 미유입 OK"
test ! -f tailwind.config.js && test ! -f tailwind.config.ts && echo "Tailwind v4 CSS-first OK"
test ! -f middleware.ts && test ! -f src/middleware.ts && echo "middleware.ts 없음 OK"
test ! -f public/next.svg && echo "데모 자산 제거 OK"
pytest scripts/test_execute.py -q
```

## 검증 절차

1. 위 AC 커맨드를 전부 실행한다.
2. 아키텍처 체크리스트:
   - `ARCHITECTURE.md` 의 `src/` 구조를 벗어난 최상위 디렉토리를 만들지 않았는가?
   - `CLAUDE.md` CRITICAL 규칙을 위반하지 않았는가?
   - `tailwind.config.js` 를 만들지 않았는가? (ADR-008)
3. `phases/blog-0-scaffold/index.json` 의 step 0 을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary"` 에 **생성된 주요 파일 경로와 확정된 버전**을 한 줄로 기록 (다음 step 이 이 정보만 물려받는다)
   - 3회 시도 후 실패 → `"status": "error"`, `"error_message"`
   - 사람 개입 필요 → `"status": "blocked"`, `"blocked_reason"` 후 즉시 중단

## 금지사항

- **`CLAUDE.md` · `README.md` · `.gitignore` 를 덮어쓰지 마라.** 이유: 프로젝트 가드레일과 하네스 설정이 들어 있다.
- **`AGENTS.md` 를 만들지 마라.** 이유: 지침 정본은 `CLAUDE.md` 하나다.
- **`tailwind.config.js` / `tailwind.config.ts` 를 만들지 마라.** 이유: ADR-008 — Tailwind v4 는 CSS-first 로 간다.
- **디자인 토큰·색상·폰트·레이아웃을 건드리지 마라.** 이유: step 1·2 의 범위다. 여기서 손대면 충돌한다.
- **`scripts/` · `docs/` · `.claude/` 를 수정하지 마라.** 이유: 하네스 자산이며 이 step 의 범위 밖이다. `phases/` 에서는 **오직 `phases/blog-0-scaffold/index.json` 의 step 0 상태만** 업데이트한다 (검증 절차 3 참고).
- **`rm -rf` 를 쓰지 마라.** 이유: PreToolUse 훅이 차단한다. `rm -r` 를 써라.
- 기존 테스트를 깨뜨리지 마라 (`pytest scripts/test_execute.py -q`).
