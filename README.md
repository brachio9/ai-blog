# AI 동향 블로그

HuggingFace 블로그·arXiv 논문 등 영문 AI 최신 동향을 한글 요약으로 정리해 공개하는 1인 운영 블로그.

운영 비용 **월 $0** 을 목표로, 글은 이 레포의 MDX 파일에 두고 사이트는 전부 정적으로 생성한다.

## 카테고리

| slug | 이름 | 성격 |
|---|---|---|
| `hf-blog` | 허깅페이스 소식 | HuggingFace 블로그 글 요약 + 원문 링크 |
| `papers` | 최신 논문 | arXiv 논문 리뷰. 수식·도표 비중이 높다 |
| `notes` | 수집 자료 | 개인 스크랩·메모 |

카테고리는 [`src/lib/categories.ts`](src/lib/categories.ts) 한 곳에 정의되어 있고, 내비게이션·목록·푸터는 전부 그것을 순회해 그린다. 추가하려면 그 파일만 고치면 된다.

## 본문에서 쓸 수 있는 것

MDX 로 쓰며 아래가 전부 라이트/다크 양쪽에서 동작한다.

| 표현 | 방법 |
|---|---|
| 수식 | `$인라인$` · `$$별행$$` (KaTeX). 좁은 화면에서 별행 수식은 자체 가로 스크롤 |
| 차트 | `<Chart kind="bar" data={...} xKey="..." series={[...]} />` (Recharts). 테마 전환 시 색이 함께 바뀐다 |
| 다이어그램 | Mermaid. 테마가 바뀌면 다시 렌더된다 |
| 표 | GFM 문법. 좁은 화면에서 표만 가로 스크롤되고 페이지는 밀리지 않는다 |
| 코드 | 구문 강조 + 복사 버튼. 라이트/다크 이중 테마 |
| 이미지 | 캡션 + 클릭 확대 |
| 콜아웃 | `<Callout type="info|success|warning|danger">` |

무거운 라이브러리(Mermaid·Recharts)는 해당 요소가 있는 글에서만 내려받는다.

## 글 쓰기

`content/{category}/YYYY-MM-DD-{slug}.mdx` 형식으로 파일을 만든다.

```yaml
---
title: "글 제목"
category: papers                       # hf-blog | papers | notes
summary: "목록과 검색에 쓰이는 한두 문장 요약"
publishedAt: "2026-08-05T10:00:00+0900"   # KST(+0900) 고정
tags: [LLM, MoE]
draft: false                           # true 면 프로덕션에서 제외
source:                                # 외부 원문을 요약했다면 필수
  url: "https://..."
  title: "원문 제목"
  author: "저자"
  license: "cc-by-4.0"
paper:                                 # papers 카테고리 전용, 필수
  arxivId: "2608.01337"
  authors: ["A", "B"]
---
```

frontmatter 검증에 실패하면 **빌드가 깨진다.** 깨진 글이 조용히 배포되는 것보다 낫다는 판단이다.

> 외부 글을 다룰 때는 원문 전재가 아니라 **요약 + 출처 링크** 형태로 쓴다. `source.url` 은 필수이며 글 상단에 출처가 항상 표기된다.

## 개발

```bash
npm install
cp .env.example .env.local     # 값은 비워둬도 개발/빌드가 돌아간다
npm run dev                    # http://localhost:3000

npm run lint && npm run build && npm run test
npm run typecheck
```

환경변수가 없으면 조회수·댓글만 조용히 꺼지고 나머지는 정상 동작한다. 필요한 값과 발급 방법은 [`.env.example`](.env.example) 에 적혀 있다.

## 배포

Vercel 에 배포한다. 순서와 환경변수, 스모크 체크 목록은 [`docs/DEPLOY.md`](docs/DEPLOY.md) 에 있다.

도메인이 정해져야 채울 수 있는 값(`NEXT_PUBLIC_SITE_URL`, OAuth 콜백)이 있어 **첫 배포 → 환경변수 등록 → 재배포** 순으로 두 번 배포하게 된다.

## 구조

```
content/                  글 원본 (MDX) — 이게 저장소다
public/                   정적 자산. 업로드 이미지는 public/uploads/
src/
├── app/
│   ├── (public)/         공개 페이지 — 홈·카테고리·글 상세·검색
│   └── api/              런타임 API (조회수)
├── components/
│   ├── mdx/              본문 요소 (표·이미지·코드·수식·차트·다이어그램)
│   ├── post/             글 카드·목록·목차·출처·조회수·댓글
│   └── layout/           헤더·푸터·테마 토글
├── lib/                  콘텐츠 로더·MDX 컴파일·검색 인덱스·유틸
├── services/             외부 API 래퍼 (turso.ts)
└── types/
docs/                     PRD · ADR · ARCHITECTURE · UI_GUIDE
phases/                   개발 phase 정의 (아래 참고)
scripts/execute.py        phase 실행 하네스
```

## 설계 결정

전문은 [`docs/ADR.md`](docs/ADR.md). 요약하면:

- **글 본문은 git 레포의 MDX 파일** — 비용 0, 버전관리·롤백·백업이 공짜. DB 가 죽어도 글은 살아 있다
- **Turso 는 조회수 같은 휘발성 수치 전용** — 본문·인증정보·댓글을 넣지 않는다
- **댓글은 Giscus(GitHub Discussions)** — 자체 저장소도 스팸 관리도 필요 없다
- **이미지도 레포에 커밋** — 외부 스토리지를 쓰지 않는다
- **검색은 클라이언트에서** — 빌드 타임 JSON 인덱스 + minisearch, 서버·DB 없이
- **MDX 컴파일 진입점은 하나** (`src/lib/mdx.ts`) — 프리뷰와 실제 렌더가 갈라지면 "프리뷰는 되는데 발행하면 깨진다" 가 생긴다

정적 생성을 유지하기 위해 **서버 컴포넌트에서 `searchParams` 를 읽지 않는다.** 필터·페이지네이션·검색어는 클라이언트에서 `useSearchParams()` 로 다룬다. 현재 동적 라우트는 `/api/views` 하나뿐이다.

## 기술 스택

Next.js 16 (App Router · Turbopack) · React 19 · TypeScript 5 · Tailwind CSS v4 (CSS-first `@theme`)
· MDX (`next-mdx-remote`) · KaTeX · Recharts · Mermaid · minisearch · zod
· Turso(libSQL) · Giscus · Vitest · Vercel

## 개발 방식 — phase 하네스

이 레포는 phase 기반 개발 하네스 위에서 만들어졌다. 작업을 phase 로 나누고 각 phase 를 step 으로 쪼갠 뒤, [`scripts/execute.py`](scripts/execute.py) 가 Claude 서브프로세스를 호출해 step 단위로 구현·검증·커밋한다.

```bash
python3 scripts/execute.py <phase-dir>          # 예: blog-2-public-site
pytest scripts/test_execute.py -q               # 하네스 회귀 (71 tests)
```

각 step 은 독립 세션에서 실행되며, `CLAUDE.md` 와 `docs/*.md` 가 매 프롬프트에 주입되어 가드레일 역할을 한다. 완료된 step 의 `summary` 만 다음 step 에 전달된다.

진행 상황은 [`phases/index.json`](phases/index.json) 에 있다.

| phase | 내용 |
|---|---|
| `blog-0-scaffold` | Next.js 골격 · 디자인 토큰 · 레이아웃 셸 |
| `blog-1-content-pipeline` | 콘텐츠 스키마 · MDX 렌더러 · 수식/다이어그램 · 차트 · 샘플 글 |
| `blog-2-public-site` | 홈 · 카테고리 · 글 상세 · 검색/RSS/sitemap/OG |
| `blog-3-comments-and-views` | 조회수(Turso) · 댓글(Giscus) |

## 테스트

```bash
npm run test                        # 133 tests
pytest scripts/test_execute.py -q   # 71 tests (하네스)
```

## 라이선스

코드는 MIT. 글(`content/`)의 저작권은 작성자에게 있으며, 인용한 원문의 권리는 각 원저작자에게 있다.
