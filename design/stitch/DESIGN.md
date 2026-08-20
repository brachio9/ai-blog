# 초록 (Chorok) — Design System

A Korean-language reading site for AI research. A bot collects ~20 items a day from
arXiv, GitHub releases, company blogs and forums, then writes a short Korean summary of
each. The site's name — 초록 — means both "abstract (of a paper)" and "green".

**What this site sells is not translation. It is selection.** Every row must answer
"why is this here?" as much as "what is this?"

The reader is a working engineer skimming ~20 new items each morning, and the same
person six months later trying to find one of them again.

---

## The four invariants

Everything else is a knob. These four are not.

1. **One voice plus mono.** Korean prose is a single sans-serif family. Only untouched
   source material — dates, identifiers, versions, domains, numbers — is monospace.
   Never set Korean in the mono face.
2. **One saturated colour.** Green. It is the only high-chroma colour on the page.
   Category marks are low-chroma. No gradients, no glow, no neon.
3. **Dark is the default ground.** Light exists but is an explicit user choice, never
   the OS's choice.
4. **Marks sit in fixed columns.** Anything left of a headline is a fixed-width column —
   thumbnail, axis number, compression ratio. The left edge of every headline is
   identical down the whole list. This is non-negotiable: it is what makes 20 rows
   skimmable.

---

## Colour

Values are OKLCH; the hex after each is the sRGB equivalent — **use the hex if your
renderer does not support `oklch()`**. All values verified in-gamut.

### Neutrals — hue 255, no hue drift

The previous system drifted hue 85 → 70 across the ramp, which read as newsprint.
This one holds a single cool hue. Chroma is small but never zero — a pure grey reads
as an unconfigured admin panel.

| token | oklch | hex |
|---|---|---|
| ink-50  | 0.985 0.002 255 | `#f9fafb` |
| ink-100 | 0.960 0.003 255 | `#f0f2f4` |
| ink-200 | 0.905 0.005 255 | `#dde0e3` |
| ink-300 | 0.820 0.007 255 | `#c1c4c9` |
| ink-400 | 0.690 0.009 255 | `#989ca1` |
| ink-500 | 0.575 0.011 255 | `#75797f` |
| ink-600 | 0.480 0.012 255 | `#595e64` |
| ink-700 | 0.385 0.013 255 | `#3f444b` |
| ink-800 | 0.285 0.014 255 | `#262b31` |
| ink-900 | 0.215 0.014 255 | `#151a20` |
| ink-950 | 0.165 0.013 255 | `#0b0f14` |
| ink-975 | 0.128 0.011 255 | `#05070b` |

### Green — hue 148, the only saturated colour

| token | oklch | hex |
|---|---|---|
| green-100 | 0.925 0.060 148 | `#ccf2d0` |
| green-300 | 0.815 0.140 148 | `#7fdb8e` |
| green-500 | 0.715 0.190 148 | `#2fc258` |
| green-600 | 0.640 0.180 148 | `#14a846` |
| green-700 | 0.545 0.155 148 | `#098736` |
| green-800 | 0.430 0.115 148 | `#116028` |

### Roles — dark (default)

| role | token | hex | contrast on bg |
|---|---|---|---|
| canvas (outside the page) | ink-975 | `#05070b` | — |
| bg (the page) | ink-950 | `#0b0f14` | — |
| surface (raised block) | ink-900 | `#151a20` | 1.1:1 |
| line (hairline) | ink-800 | `#262b31` | — |
| muted (secondary text) | ink-400 | `#989ca1` | **6.96:1** |
| text (body) | ink-100 | `#f0f2f4` | **17.13:1** |
| accent (links, focus, ratio) | green-500 | `#2fc258` | **8.22:1** |

### Roles — light (secondary but fully designed)

bg `#ffffff` · surface `#f9fafb` · line `#dde0e3` · muted `#595e64` ·
text `#151a20` · accent green-700 `#098736` (4.64:1 on white).

### Category marks — low chroma, equal lightness

Five provenance categories. They must read as *equal weight* — one of them
(papers) is 62% of all rows, so it must not dominate visually. Keep all five at the
same OKLCH lightness; vary hue only. They are **not** the accent colour.

`papers` · `releases` · `news` · `community` · `notes`

---

## Depth

**In dark UI a black shadow is invisible.** The sense of raised material comes from a
1px light inset along the top edge, not from a drop shadow:

```
--edge-top: inset 0 1px 0 oklch(1 0 0 / 0.05);
```

Use shadows only for things that genuinely overlap (dialogs, popovers). Radius is small
and consistent — 4 / 6 / 10 px. Nothing is a pill except tags and toggles.

---

## Type

- **Korean and Latin prose:** IBM Plex Sans KR — weights 400, 500, 600. No 700.
- **Source material:** IBM Plex Mono 400, with tabular figures.
- Body ~15.5px, line-height 1.70. Headings tighten to 1.25 with -0.012em tracking.
- Largest type on a list page is ~30px. **There is no hero headline anywhere on this site.**
- Korean must not break mid-word: `word-break: keep-all`.
- Identifiers like `arXiv:2608.13706` must never wrap: `overflow-wrap: normal`.

---

## Layout — the uniform feed

The home page is a chronological feed grouped by day. **Every row is the same size.**
There is no featured item, no hero, no card grid, no masonry. Rows differ only in the
marks they carry.

Each row has these slots, left to right:

```
[thumbnail 16:9, small]  [axis no. 2 digits]  headline
                                              one-line summary (clamped)
                                              date · category · minutes · ratio · marks
```

- **Thumbnail** — 16:9, small enough that a row stays scannable. About 40% of rows have
  no image; those show a flat category-coloured block with the axis number instead. Both
  states must occupy exactly the same box so the column never jitters.
- **Axis number** — a two-digit mono number, 01–06, naming the topic. It is a fixed-width
  column. It is the primary way a skimmer groups the list.
- **Ratio** — the site's signature. `35:1` means the Korean summary is 1/35 the length of
  the source. It appears on **every** row, right-aligned in a fixed-width column so the
  metadata after it does not shift. About half of rows have no ratio.
- **Marks** — small mono signals explaining *why* the bot picked this: `교차 3곳`
  (appeared in 3 places), `▲128` (upvotes on the source), `†` (topic assigned by
  machine, low confidence).

Day groups are separated by a header line: date, item count, and a per-topic tally.
Routine version bumps collapse into one summary row at the bottom of each day.

---

## Do not

These are failure modes, not preferences.

- No gradients, no glow, no `backdrop-filter`, no glassmorphism
- No purple/indigo/violet — the colour of every AI product since 2023
- No emoji, no icon-library glyphs used as decoration
- No centred hero section, no oversized landing type
- No scroll-triggered animation, no fade-in-on-view
- No card grid, no masonry, no bento box
- No rounded-full avatars, no fake user chrome
- No drop shadows to fake elevation on a dark ground
- No colour used as the *only* carrier of meaning — every mark needs a text label or
  `aria-label`

---

## Real content

Use these actual headlines. They are the real length and shape of Korean text on this
site — placeholder Latin text hides every Korean typesetting problem.

```
LLM을 넘어선 에이전트 시스템의 실제 운영 교훈
장문 QLoRA 학습 속도를 높이는 토큰 블록 선택법
AI로 신약 후보를 찾는 공개 실험, 문턱이 낮아졌다
사진을 건드리지 않고 추상 패널만 더하는 Codex 스킬
중국어 유머 데이터셋 Humor_Vote 공개, LLM 평가와 게임 콘텐츠에 활용 가능
KV 캐시 양자화에서 푸리에 진폭의 위상 보존 효과
Claude Code로 리서치 기록을 영구 보관하는 법
코딩 에이전트가 기억상실증에 걸리지 않게 하는 방법
같은 유효 배치 크기, 다른 학습 시간: TRL과 LoRA의 그라디언트 누적 효과
vLLM 모델 변환, AI 에이전트로 자동화하다
2026년 8월 프론트엔드 뉴스: CSS 동향, 렌더링 전략, Vite+ 베타
메타의 오픈 가글 모델 Muse Glimmer, 에이전트 작업에 최적화됐다
Qdrant와 Minima가 에이전트 RAG 효율을 2.9배 높인 이유
Qwen3.8-27B, 뛰어난 성능 뒤에는 과도한 생각하기가 숨겨져 있다
AI 코딩의 핵심은 프롬프트가 아니라 코드 읽기다
AI 자동화 5000시간의 교훈: 도구보다 성과가 중요하다
ChatGPT Work로 반복 업무를 자동화하는 8가지 실전 사례
OpenAI Codex 하네스 설계의 핵심 원리
에이전트 눈높이에 맞춘 문서화: OpenWiki의 구조와 철학
에이전트 하네스, RL 학습의 핵심 변수로 부상하다
```

Topic names for the axis numbers:
`01 검색·RAG` · `02 서빙·학습` · `03 음성` · `04 에이전트·자동화` ·
`05 도메인·정책` · `06 바이브코딩`

Category names: `논문` · `릴리즈` · `소식` · `커뮤니티` · `기록`

Sample metadata: `2026.08.19` · `arXiv:2608.17528` · `2분` · `추림 35:1` ·
`교차 3곳` · `▲128` · `조회 41`
