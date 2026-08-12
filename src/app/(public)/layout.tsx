import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

/**
 * 공개 페이지의 껍데기. 라우트 그룹 `(public)` 은 URL 에 나타나지 않으므로 홈은 그대로 `/` 다.
 * 앞으로 만들 공개 페이지(카테고리·글 상세·검색)는 전부 이 디렉토리 안에 둔다.
 */
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
