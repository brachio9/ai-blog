import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
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
  title: {
    default: "AI 동향 블로그",
    template: "%s | AI 동향 블로그",
  },
  description:
    "HuggingFace 블로그·arXiv 논문 등 영문 AI 최신 동향을 한글 요약으로 정리합니다.",
};

/**
 * 페인트 전에 테마를 확정한다 — React 렌더 이후에 처리하면 다크 사용자에게 흰 화면이 번쩍인다.
 * src/lib/theme.ts 의 규약(키·클래스·미디어쿼리)을 그대로 주입해 한쪽만 바뀌는 일을 막는다.
 */
const themeScript = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t!=="light"&&t!=="dark"){t=matchMedia(${JSON.stringify(DARK_MEDIA_QUERY)}).matches?"dark":"light"}document.documentElement.classList.toggle(${JSON.stringify(DARK_CLASS)},t==="dark")}catch(e){}`;

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
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
