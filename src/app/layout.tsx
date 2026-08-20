import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans_KR } from "next/font/google";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { LIGHT_CLASS, THEME_STORAGE_KEY } from "@/lib/theme";
import "./globals.css";

/**
 * 한글 웹폰트 **한 벌 + mono**. 명조를 뺀 것이 이번 개편이다 —
 * 한글 패밀리가 2개에서 1개로 줄어 FOUT 이 절반이 됐고, Plex Sans KR 과 Plex Mono 는
 * 같은 슈퍼패밀리라 「한 목소리 + mono」가 자의적이지 않다.
 *
 * `subsets` 에 `"korean"` 을 넣지 마라 — next/font 타입에 없는 값이라 컴파일 에러다.
 * `["latin"]` 만 선언해도 생성된 CSS 에 한글 유니코드 범위(U+AC00…)가 함께 들어가고
 * 브라우저가 필요한 청크만 받아 간다. 다만 그 범위는 preload 되지 않아 첫 페인트에 폴백이 잠깐 보인다 —
 * next/font 가 만드는 metric-adjusted 폴백이 그 흔들림을 줄이므로 adjustFontFallback 을 끄지 마라.
 *
 * 굵기는 꼭 필요한 것만 부른다. 한글 폰트는 굵기 하나가 곧 청크 한 벌이다.
 */
const plexSansKr = IBM_Plex_Sans_KR({
  variable: "--font-plex-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

/** 숫자·라틴 전용이다 — 한글이 없으므로 globals.css 스택 뒤의 한글 폴백이 실제로 쓰인다. */
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

export const metadata: Metadata = {
  // 각 페이지가 상대 경로로 적은 canonical·openGraph.url 을 절대 URL 로 만들어 준다.
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
};

/**
 * 페인트 전에 낮을 고른 사람에게만 클래스를 붙인다.
 *
 * **기본 경로에는 클래스 조작이 아예 없다** — 저장값이 없으면 이 스크립트는 아무 일도 하지 않고,
 * :root 가 이미 밤이라 JS 가 꺼져 있어도 밤이 그려진다. 흰 화면 번쩍임이 구조적으로 사라진다.
 */
const themeScript = `try{if(localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})==="light"){document.documentElement.classList.add(${JSON.stringify(LIGHT_CLASS)})}}catch(e){}`;

/**
 * 문서 뼈대만 담는다 — 헤더·푸터는 `(public)` 레이아웃의 몫이다.
 * App Router 레이아웃은 교체가 아니라 중첩이라, 여기에 두면 `/admin` 이 블로그 껍데기를 물려받는다.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${plexSansKr.variable} ${plexMono.variable} h-full antialiased`}
    >
      <head>
        {/* 브라우저 기본 UI(스크롤바·폼 컨트롤)에 어느 지면인지 알린다. 밤이 먼저다. */}
        <meta name="color-scheme" content="dark light" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      {/* 글꼴은 globals.css 의 body 규칙이 정한다 — 한글은 산세리프 한 벌이다. */}
      <body className="min-h-full flex flex-col bg-bg text-body">
        {children}
      </body>
    </html>
  );
}
