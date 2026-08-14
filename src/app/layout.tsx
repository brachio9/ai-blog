import type { Metadata } from "next";
import {
  IBM_Plex_Mono,
  IBM_Plex_Sans_KR,
  Noto_Serif_KR,
} from "next/font/google";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { DARK_CLASS, DARK_MEDIA_QUERY, THEME_STORAGE_KEY } from "@/lib/theme";
import "./globals.css";

/**
 * 한글 웹폰트 3종. `subsets` 에 `"korean"` 을 넣지 마라 — next/font 타입에 없는 값이라 컴파일 에러다.
 * `["latin"]` 만 선언해도 생성된 CSS 에 한글 유니코드 범위(U+AC00…)가 함께 들어가고
 * 브라우저가 필요한 청크만 받아 간다. 다만 그 범위는 preload 되지 않아 첫 페인트에 폴백이 잠깐 보인다 —
 * next/font 가 만드는 metric-adjusted 폴백이 그 흔들림을 줄이므로 adjustFontFallback 을 끄지 마라.
 *
 * 굵기는 꼭 필요한 것만 부른다. 한글 폰트는 굵기 하나가 곧 청크 한 벌이다.
 */
const plexSansKr = IBM_Plex_Sans_KR({
  variable: "--font-plex-sans-kr",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

const notoSerifKr = Noto_Serif_KR({
  variable: "--font-noto-serif-kr",
  subsets: ["latin"],
  weight: ["400", "600"],
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
 * 페인트 전에 테마를 확정한다 — React 렌더 이후에 처리하면 다크 사용자에게 흰 화면이 번쩍인다.
 * src/lib/theme.ts 의 규약(키·클래스·미디어쿼리)을 그대로 주입해 한쪽만 바뀌는 일을 막는다.
 */
const themeScript = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t!=="light"&&t!=="dark"){t=matchMedia(${JSON.stringify(DARK_MEDIA_QUERY)}).matches?"dark":"light"}document.documentElement.classList.toggle(${JSON.stringify(DARK_CLASS)},t==="dark")}catch(e){}`;

/**
 * 문서 뼈대만 담는다 — 헤더·푸터는 `(public)` 레이아웃의 몫이다.
 * App Router 레이아웃은 교체가 아니라 중첩이라, 여기에 두면 `/admin` 이 블로그 껍데기를 물려받는다.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${plexSansKr.variable} ${notoSerifKr.variable} ${plexMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      {/* 글꼴은 globals.css 의 body 규칙이 정한다 — 본문은 명조(--font-body)다.
          여기에 font-sans 를 붙이면 두 목소리 중 UI 쪽이 본문을 차지한다. */}
      <body className="min-h-full flex flex-col bg-bg text-body">
        {children}
      </body>
    </html>
  );
}
