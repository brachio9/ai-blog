# UI 디자인 가이드

## 디자인 원칙
1. **읽기 우선.** 콘텐츠가 주인공이고 UI는 물러난다. 장식이 본문 이해를 돕지 못하면 뺀다.
2. **편집물처럼 보여야 한다.** SaaS 랜딩이 아니라 기술 잡지. 본문 세리프 + 넉넉한 행간 + 좁은 단폭.
3. **라이트/다크 동등.** 어느 쪽도 "덤"이 아니다. 표·차트·수식·코드가 양쪽에서 똑같이 읽혀야 한다.

## AI 슬롭 안티패턴 — 하지 마라
| 금지 사항 | 이유 |
|-----------|------|
| backdrop-filter: blur() | glass morphism은 AI 템플릿의 가장 흔한 징후 |
| gradient-text (배경 그라데이션 텍스트) | AI가 만든 SaaS 랜딩의 1번 특징 |
| "Powered by AI" 배지 | 기능이 아니라 장식. 사용자에게 가치 없음 |
| box-shadow 글로우 애니메이션 | 네온 글로우 = AI 슬롭 |
| 보라/인디고 브랜드 색상 | "AI = 보라색" 클리셰 |
| 모든 카드에 동일한 rounded-2xl | 균일한 둥근 모서리는 템플릿 느낌 |
| 배경 gradient orb (blur-3xl 원형) | 모든 AI 랜딩 페이지에 있는 장식 |
| 이모지 아이콘 (🚀 ✨ 🔥) | 인터페이스에 이모지를 쓰지 마라. SVG 아이콘만 |
| 스크롤 트리거 등장 애니메이션 | 읽는 흐름을 끊는다 |

## 색상

CSS 변수로 정의하고 Tailwind 토큰으로 노출한다. 컴포넌트에 hex를 직접 쓰지 마라.

| 토큰 | 라이트 | 다크 | 용도 |
|---|---|---|---|
| `bg` | `#fdfcfa` | `#14110f` | 페이지 배경 |
| `surface` | `#ffffff` | `#1c1917` | 카드·코드블록 |
| `border` | `#e7e2da` | `#33302c` | 구분선·테두리 |
| `heading` | `#1c1917` | `#fafaf9` | 제목 |
| `body` | `#44403c` | `#d6d3d1` | 본문 |
| `muted` | `#78716c` | `#a8a29e` | 보조·메타 정보 |
| `faint` | `#a8a29e` | `#78716c` | 비활성 |
| `accent` | `#a8442a` | `#e07a55` | 링크·활성 상태 |
| `accent-hover` | `#8a3721` | `#ec9273` | 링크 hover |

### 시맨틱 (콜아웃·상태)
| 용도 | 라이트 | 다크 |
|---|---|---|
| 성공 | `#4d7c46` | `#7fae76` |
| 주의 | `#b45309` | `#d99a4e` |
| 오류 | `#b91c1c` | `#e07a7a` |
| 정보 | `#3f6b8a` | `#7aa8c4` |

### 차트 카테고리 색 (순서대로 사용)
| # | 라이트 | 다크 |
|---|---|---|
| 1 | `#a8442a` | `#e07a55` |
| 2 | `#3f6b8a` | `#7aa8c4` |
| 3 | `#4d7c46` | `#7fae76` |
| 4 | `#b8860b` | `#d9a94e` |
| 5 | `#6e6259` | `#a89c92` |

계열 하나면 `accent` 만 쓴다. 색만으로 구분하지 말고 범례·직접 라벨을 함께 둔다.

## 타이포그래피

| 역할 | 폰트 | 비고 |
|---|---|---|
| 본문 (글 상세) | 세리프 — Source Serif 4 | `next/font` 로 self-host |
| UI·목록·내비 | 산세리프 — Inter | |
| 코드·수식 보조 | 모노 — JetBrains Mono | |

| 용도 | 스타일 |
|------|--------|
| 히어로 제목 | `text-5xl md:text-6xl font-semibold tracking-tight text-heading` (sans) |
| 글 제목 (상세) | `text-3xl md:text-4xl font-semibold text-heading` (serif) |
| 섹션 제목 (h2) | `text-2xl font-semibold text-heading mt-12 mb-4` |
| 본문 | `text-[1.0625rem] leading-[1.75] text-body` (serif) |
| 카드 제목 | `text-base font-medium text-heading` (sans) |
| 메타 정보 | `text-sm text-muted` (sans) |

**본문 단폭은 `max-w-[68ch]`.** 그보다 넓으면 읽기 어렵다. 표·차트·코드블록은 이 폭을 넘어 확장해도 된다.

## 레이아웃
- 페이지 컨테이너: `max-w-6xl mx-auto px-5 md:px-8`
- 글 본문: `max-w-[68ch]` (컨테이너 안에서 좌측 정렬)
- 섹션 간격: `space-y-12`, 카드 내부 `p-5`, 그리드 `gap-4`
- 좌측 정렬 기본. 히어로만 예외적으로 중앙 정렬 허용.

## 컴포넌트

모서리 반경을 **의도적으로 다르게** 준다 (균일한 rounded-2xl 금지).

```
카드      rounded-md border border-border bg-surface p-5
버튼 주   rounded bg-heading text-bg px-4 py-2 text-sm font-medium
버튼 보조 rounded border border-border px-4 py-2 text-sm hover:bg-surface
텍스트 버튼 text-muted hover:text-heading
입력      rounded border border-border bg-surface px-3 py-2
태그/뱃지 rounded-full border border-border px-2.5 py-0.5 text-xs text-muted
이미지    rounded-sm
코드블록  rounded-md bg-surface border border-border
```

### 본문 요소 (핵심 요구사항)

| 요소 | 규격 |
|---|---|
| **표** | `overflow-x-auto` 컨테이너로 감싼다. 헤더 행 `bg-surface` + 하단 보더. 셀 `px-3 py-2 text-sm`. 좁은 화면에서 가로 스크롤되고 페이지 본문은 절대 가로 스크롤되지 않는다. 스크롤 가능함을 시각적으로 알린다 (우측 페이드). |
| **이미지** | `<figure>` + `<figcaption>` (캡션 `text-sm text-muted`). 클릭하면 라이트박스로 확대. `next/image` 로 최적화하고 `alt` 필수. |
| **차트** | 컨테이너 `border border-border rounded-md p-4`. 축·격자선은 `border` 색, 라벨은 `muted`. 반응형 높이. 다크모드에서 색 토큰이 자동 전환되어야 한다. |
| **다이어그램** | Mermaid 테마를 CSS 변수에 맞춰 라이트/다크 각각 설정. 배경 투명. |
| **수식** | KaTeX. 인라인은 본문 행간을 깨지 않게, 별행 수식은 좌우 여백 + 넘칠 때 가로 스크롤. |
| **코드블록** | 구문 강조 + 복사 버튼(우상단, hover 시 노출). 언어 라벨 표시. 줄바꿈 대신 가로 스크롤. |
| **콜아웃** | 좌측 3px 보더 + 시맨틱 색. 아이콘은 인라인 SVG. |

## 애니메이션
- **허용**: 색·불투명도 `transition-colors`/`transition-opacity` 150ms ease. 페이지 진입 fade-in 300ms 1회.
- **그 외 전부 금지.** 스크롤 트리거, transform 확대/이동, 무한 루프, glow, 패럴랙스.
- `prefers-reduced-motion` 을 존중한다.

## 아이콘
- 인라인 SVG, `strokeWidth 1.5`, `currentColor`, 크기 16/20/24.
- 아이콘을 둥근 배경 박스로 감싸지 않는다.
- 이모지를 아이콘 대용으로 쓰지 않는다.

## 접근성
- 본문 대비 최소 4.5:1, 큰 텍스트 3:1.
- 포커스 링을 지우지 마라 — `focus-visible:outline-2 outline-accent`.
- 표에 `<caption>` 또는 `aria-label`. 차트에 텍스트 요약 또는 원본 표 병기.
