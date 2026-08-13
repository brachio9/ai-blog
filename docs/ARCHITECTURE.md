# 아키텍처

## 디렉토리 구조

```
content/                   # 글 원본 (git = 저장소)
├── hf-blog/               # YYYY-MM-DD-slug.mdx
├── papers/
└── notes/

public/                    # 정적 자산 (샘플 이미지 포함)

src/
├── proxy.ts               # Next 16 의 구 middleware. /admin/* 보호
├── app/
│   ├── (public)/          # 공개 페이지 — 홈·카테고리·글 상세·검색·태그·아카이브·소개
│   ├── admin/             # 관리자 — proxy + 페이지 레벨 세션 확인 이중 보호
│   └── api/               # API 라우트 (조회수, 발행, 업로드)
├── components/
│   ├── mdx/               # MDX 매핑 컴포넌트 (표·이미지·코드·차트·다이어그램)
│   ├── layout/            # 헤더·푸터·테마 토글
│   └── ui/                # 범용 프리미티브 (icons.tsx — 아이콘 단일 출처)
├── types/                 # TypeScript 타입 정의
├── lib/                   # 유틸 + 콘텐츠 로더 + MDX 컴파일
└── services/              # 외부 API 래퍼 — github.ts, turso.ts

scripts/                   # 하네스 (execute.py) — 앱 코드 아님
phases/                    # 하네스 phase 정의
docs/                      # 가드레일 문서
```

**규칙**: 계약되지 않은 최상위 디렉토리를 새로 만들지 마라. 외부 API 호출은 반드시 `src/services/` 의 래퍼를 경유한다 — 컴포넌트에서 직접 `fetch` 로 외부 서비스를 부르지 마라.

## 패턴

- **Server Components 기본.** 인터랙션이 필요한 곳만 `"use client"`.
- 무거운 클라이언트 라이브러리(Mermaid, Recharts)는 **해당 요소가 있는 페이지에서만** `next/dynamic` 으로 lazy-load 한다.
- 콘텐츠는 빌드 타임 정적 생성(SSG). 조회수만 런타임.

## 데이터 흐름

**읽기**
```
content/**/*.mdx
  → gray-matter (frontmatter 파싱)
  → zod 스키마 검증        ← 실패하면 빌드를 깨뜨린다
  → next-mdx-remote/rsc 컴파일 (src/lib/mdx.ts 단일 진입점)
  → Server Component 렌더 → 정적 HTML

조회수: Client → /api/views → services/turso.ts → Turso
댓글:   Client → Giscus iframe → GitHub Discussions
이미지: public/uploads/ (레포에 커밋) → next/image
```

**발행**
```
/admin 에디터
  → /api/publish
  → services/github.ts (fine-grained PAT, Contents API)
  → content/{category}/*.mdx 커밋
  → Vercel 자동 재배포 (~90초)
  → 정적 페이지 갱신
```

프리뷰와 실제 렌더는 **같은 컴파일 경로**(`src/lib/mdx.ts`)를 쓴다. 프리뷰용 별도 파이프라인을 만들지 마라.

## 상태 관리

- 서버 상태 = Server Components. 전역 상태 라이브러리를 도입하지 마라.
- 클라이언트 상태는 `useState` / `useReducer` 로 컴포넌트 안에 가둔다.
- 테마(라이트/다크)만 `localStorage` + `document.documentElement` 클래스로 관리한다.

## 실패 처리

- **조회수·댓글은 실패해도 글 렌더를 막지 않는다.** 부가 기능이 본문을 인질로 잡으면 안 된다.
- **frontmatter 검증 실패는 빌드를 깨뜨린다.** 깨진 글이 조용히 배포되는 것보다 낫다.
- 발행 실패는 관리자에게 원인을 그대로 노출한다 (조용히 삼키지 마라).
