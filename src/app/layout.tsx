import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { DARK_CLASS, DARK_MEDIA_QUERY, THEME_STORAGE_KEY } from "@/lib/theme";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif-4",
  subsets: ["latin"],
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
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
      className={`${inter.variable} ${sourceSerif.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-body font-sans">
        {children}
      </body>
    </html>
  );
}
