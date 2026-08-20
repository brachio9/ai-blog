import type { Post } from "@/types/content";

/**
 * 목록 행의 왼쪽 고정폭 그림 자리 — 16:9, 80×45.
 *
 * **`next/image` 를 쓰지 않는다. `next.config.ts` 의 `remotePatterns` 도 열지 않는다.**
 * 이게 이 파일에서 가장 중요한 한 줄이다. 최적화기를 태우면 Vercel 이 원본을 받아 변환해
 * **우리 인프라에 파생 사본을 캐시하고 우리 도메인에서 재배포**한다 — 「복제가 아니라
 * 임베드」라는 근거가 그 자리에서 사라진다. 게다가 `remotePatterns: "**"` 는
 * `/_next/image?url=` 을 공개 이미지 프록시로 만들고, 열거 방식은 목록에 없는 호스트가
 * 발행되는 순간 프로덕션 500 이다. 안 열면 이 질문 자체가 사라진다.
 *
 * 대가(srcset·AVIF 없음)는 80×45 에서 무의미하다. 수집기가 애초에 작은 원본을 고른다
 * (유튜브 `hqdefault` 480×360 ≈ 20KB — `maxres` 를 쓰지 마라).
 *
 * **`referrerPolicy` 를 덮어쓰지 마라.** 호스트가 누가 임베드하는지 보고 원치 않으면
 * 막을 수 있어야 한다 — 그 통제권이 상대에게 남는 것이 「임베드」의 실질이다.
 *
 * 실패는 두 층으로 받는다. `onError` 도 자바스크립트도 쓰지 않는다:
 *
 *   주소가 없다  → `<img>` 를 아예 안 그린다     → 표지가 그대로 보인다
 *   주소가 죽었다 → 브라우저가 그 자리를 안 그린다 → **표지가 뒤에서 비친다**
 *
 * `alt=""` 가 정답이다 — 옆에 제목 링크가 있으므로 순수 장식이고, 빈 alt 는 대부분의
 * 브라우저에서 깨진 이미지 아이콘도 억제한다.
 *
 * 표지는 카테고리 안료를 지면에 아주 옅게 섞은 판이다 (globals.css `.thumb`).
 * 안료를 그대로 칠하면 스무 행에 큰 색판이 서서 부호가 아니라 벽지가 된다.
 * 축 번호도 적지 않는다 — 바로 오른쪽 열이 이미 그 번호다.
 */
export function PostThumb({ post }: { post: Post }) {
  const image = post.frontmatter.source?.image;

  return (
    <div aria-hidden className="thumb">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- 위 주석이 근거다
        <img
          className="thumb-img"
          src={image}
          alt=""
          width={80}
          height={45}
          loading="lazy"
          decoding="async"
        />
      ) : null}
    </div>
  );
}
