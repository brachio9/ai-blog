/**
 * 주제 축 단일 진실 공급원 — docs/PRD.md 의 「주제 축」 표를 그대로 옮긴다.
 * 축은 필수·단일이다. 6축 편수의 합이 전체 글 수와 같아야 /topics 가 지도 노릇을 한다.
 *
 * 축은 색을 쓰지 않는다. 안료 3색은 카테고리(소스 축) 전용으로 예약돼 있고,
 * 축의 부호는 번호(mono `01`~`06`)다 — docs/UI_GUIDE.md 「분류 축은 셋이고 색을 쓰는 것은 하나뿐이다」.
 */
export type AxisSlug =
  | "retrieval"
  | "serving"
  | "voice"
  | "agent"
  | "domain"
  | "vibe-coding";

export interface Axis {
  /** URL 세그먼트. `/topics/{slug}` 로 걸리므로 바꾸지 마라. */
  slug: AxisSlug;
  /** 목차 번호. 화면에는 mono 두 자리('01')로 그린다. 안료가 아니라 이것이 축의 부호다. */
  order: number;
  /** 축 페이지 제목용 (예: "검색·RAG") */
  name: string;
  /** 2~4자. 헤더·목록의 좁은 자리용 */
  shortName: string;
  /** 글이 0편이어도 이 문장이 매체의 약속을 싣는다 */
  description: string;
  /** 화면에 보여 줄 대표 키워드 6~10개. 필터용이 아니다 */
  covers: readonly string[];
  /**
   * 이 축을 **되풀이하는** 개념 라벨. `tags` 금지 판정에만 쓴다 (`isOwnAxisEcho`).
   * `slug`·`name`·`shortName` 은 자동으로 포함되므로 여기 다시 적지 않는다.
   *
   * **`covers` 를 쓰지 마라.** 거기엔 `MCP`·`vLLM`·`Whisper` 같은 고유명사가 들어 있고,
   * 그것들은 축을 되풀이하는 것이 아니라 **축 안의 한 물건**을 가리킨다.
   * `covers` 로 막으면 태그의 존재 이유가 사라진다 — 6개월 뒤 `vLLM` 로 되찾는 것이
   * 이 필드가 하는 일이다.
   */
  aliases: readonly string[];
}

export const AXES: readonly Axis[] = [
  {
    slug: "retrieval",
    order: 1,
    name: "검색·RAG",
    shortName: "검색",
    description:
      "문서를 어떻게 쪼개고, 무엇을 먼저 올리고, 그 답이 근거를 제대로 물고 있는지. 검색기·리랭커·인용 검증까지 RAG 파이프라인 전 구간을 봅니다.",
    covers: [
      "late chunking",
      "리랭킹",
      "하이브리드 검색",
      "임베딩 모델",
      "GraphRAG",
      "인용 충실도",
      "벡터 DB",
      "긴 문맥 대 RAG",
    ],
    aliases: [],
  },
  {
    slug: "serving",
    order: 2,
    name: "서빙·학습",
    shortName: "서빙",
    description:
      "모델을 실제로 돌리는 쪽의 이야기. 처리량·지연·메모리와 파인튜닝·양자화처럼 선택이 곧 비용 숫자로 나오는 주제를 모읍니다.",
    covers: [
      "vLLM",
      "KV 캐시",
      "양자화",
      "speculative decoding",
      "LoRA",
      "분산 학습",
      "배치 스케줄링",
      "MoE 서빙",
    ],
    aliases: ["추론최적화·파인튜닝"],
  },
  {
    slug: "voice",
    order: 3,
    name: "음성",
    shortName: "음성",
    description:
      "말이 들어오고 나가는 구간. 인식·합성과 음성 대화 모델을 다루되, 실시간 대화가 걸리는 지점인 지연과 끼어들기를 같이 잽니다.",
    covers: [
      "Whisper",
      "음성 인식",
      "음성 합성",
      "화자 분리",
      "실시간 음성 대화",
      "끼어들기 처리",
      "종단 지연",
      "운율·감정",
    ],
    aliases: [],
  },
  {
    slug: "agent",
    order: 4,
    name: "에이전트·자동화",
    shortName: "에이전트",
    description:
      "모델이 도구를 쥐고 여러 단계를 스스로 도는 구조. 도구 호출·계획·메모리와 함께, 무너질 때 어디서 어떻게 무너지는지를 같이 적습니다.",
    covers: [
      "도구 호출",
      "MCP",
      "멀티 에이전트",
      "계획·재시도",
      "장기 메모리",
      "컴퓨터 사용",
      "샌드박스 실행",
      "에이전트 평가",
    ],
    aliases: ["Agentic Engineering"],
  },
  {
    slug: "domain",
    order: 5,
    name: "도메인·정책",
    shortName: "도메인",
    description:
      "특정 산업에 들어간 AI와 그 위에 얹히는 규제·평가·안전 문제. 틀렸을 때 대가가 큰 자리를 먼저 봅니다.",
    covers: [
      "의료",
      "법률·계약",
      "금융",
      "규제·컴플라이언스",
      "벤치마크 설계",
      "데이터 라이선스",
      "프라이버시",
      "한국어 평가",
    ],
    aliases: ["평가·벤치마크", "규제·정책"],
  },
  {
    slug: "vibe-coding",
    order: 6,
    name: "바이브코딩",
    shortName: "코딩",
    description:
      "코드를 모델에게 맡기는 방식 자체. 코딩 에이전트·리뷰·테스트 자동화와, 그 결과물을 사람이 어디까지 믿을 수 있는지를 다룹니다.",
    covers: [
      "코딩 에이전트",
      "코드 리뷰 자동화",
      "SWE-bench",
      "테스트 생성",
      "리포지토리 문맥",
      "리팩터링 자동화",
      "프롬프트 설계",
      "생성 코드 품질",
    ],
    aliases: ["바이브코딩"],
  },
];

/** 축 목록 URL. 카테고리와 달리 `/topics/` 아래에 둔다 — 최상위 세그먼트를 더 먹지 않는다. */
export function axisHref(axis: Axis): string {
  return `/topics/${axis.slug}`;
}

/**
 * 화면에 그리는 축의 부호 — 두 자리 mono 번호(`01`~`06`).
 * 자릿수가 갈리면 목차처럼 읽히지 않으므로 만드는 곳을 하나로 둔다.
 */
export function axisNumber(axis: Axis): string {
  return String(axis.order).padStart(2, "0");
}

export function getAxis(slug: string): Axis | undefined {
  return AXES.find((axis) => axis.slug === slug);
}

/**
 * 태그 비교용 정규화. NFKC → 소문자 → 공백·`·`·`-`·`.` 제거.
 * `Agentic Engineering` 과 `agenticengineering`, `바이브코딩` 과 `바이브 코딩`을 같게 본다.
 */
export function normalizeTagKey(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s·\-.]/g, "");
}

/**
 * 이 태그가 **이 글의 축을 되풀이하는가.**
 *
 * `docs/PRD.md` 는 태그를 두고 스스로 모순이었다 — 26행은 「고유명사 전용, 축을 태그로
 * 표현하지 마라」이고 30행은 「두 축에 걸치는 글의 **부차 주제는 태그가 받는다**」다.
 * 부차 주제는 곧 축 성격의 주제라, 26행이 금지한 것을 30행이 요구했다.
 *
 * 실측(2026-08-19, 부착 79회)이 답을 줬다 — 41회는 그 글의 **자기 축**을 되풀이했고
 * 38회는 **다른 축**을 가리켰다. 앞의 것은 정보량이 0 이고 뒤의 것이 바로 30행이 말한 부차 주제다.
 * 그래서 금지는 「축 이름을 쓰지 마라」가 아니라 **「이 글의 축을 되풀이하지 마라」** 여야 한다.
 * 그러면 41회는 사라지고 38회는 살아남으며 26행·30행이 둘 다 성립한다.
 */
export function isOwnAxisEcho(tag: string, axisSlug: string): boolean {
  const axis = getAxis(axisSlug);
  if (!axis) {
    return false;
  }

  const key = normalizeTagKey(tag);
  return [axis.slug, axis.name, axis.shortName, ...axis.aliases].some(
    (candidate) => normalizeTagKey(candidate) === key,
  );
}

