import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { DayHead } from "@/components/post/DayHead";
import { PostRow } from "@/components/post/PostRow";
import { ReleaseDigest } from "@/components/post/ReleaseDigest";
import { SinceLastVisit } from "@/components/post/SinceLastVisit";
import { ViewCounts } from "@/components/post/ViewCounts";
import { getAllPosts } from "@/lib/content/posts";
import { formatDateShort } from "@/lib/format";
import { partitionReleases } from "@/lib/releases";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";
import { postsByDay } from "@/lib/stats";

/** 지면 전체가 실을 항목 수. 접힌 묶음은 **1행으로 센다** (8행이 아니라). */
const HOME_ITEM_BUDGET = 60;

/** 예산이 남아도 이만큼의 날은 싣는다 — 글이 뜸한 주에도 지면이 비지 않게 한다. */
const MIN_DAYS = 3;

/**
 * 1면 — **일자로 구획된 균일 피드**다.
 *
 * 2026-08-20 에 「1면 편집」이 죽었다. 머리기사·단신·카테고리 넷으로 짜던 신문 배치는
 * 사람이 하루 한두 편 고르던 시절의 것이고, 지금은 봇이 하루 스무 편을 밀어 넣는다.
 * 하루치 안에서 「가장 최근 글을 크게」는 **동어반복**이라 아무것도 고르지 않았다.
 *
 * 그 자리를 시그니처 둘이 받는다:
 *
 *   ① **추린 비율 — 행마다, 있는 만큼** — 원문을 몇 분의 일로 줄였는가
 *   ② **선별 경위를 목록 부호로** — 교차 3곳 · ▲128 · 약한 축 †
 *
 * 행의 급을 나누는 대신 **부호로 가른다.** 크기가 같아야 스무 행이 훑히고,
 * 그때 눈에 띄는 것은 「크게 그린 것」이 아니라 「부호가 붙은 것」이 된다.
 *
 * **되돌리지 않는 것:** 일자 구획(`DayHead`) · 릴리즈 접기(`ReleaseDigest`) ·
 * 축 번호 레일 · 카테고리 강등 · `SinceLastVisit`.
 * 죽은 것은 급의 차이뿐이고 정보구조는 어제 그대로다.
 */
export default function Home() {
  const allPosts = getAllPosts();
  const newest = allPosts.at(0);
  const days = pickDays(postsByDay());

  // 조회수는 한 번에 모아 받는다 — 행마다 부르지 않는다. 지면에 실린 글만 센다.
  const shownIds = [
    ...new Set(
      days.flatMap((day) => day.partition.promoted.map((post) => post.slug)),
    ),
  ];

  return (
    <Container>
      <ViewCounts ids={shownIds}>
        <div className="pb-16">
          {/* 제호 — 좌측 정렬. 히어로가 아니므로 화면을 차지하지 않고 곧바로 지면이 온다. */}
          <header className="masthead border-b border-border">
            <h1 className="masthead-title text-heading">{SITE_NAME}</h1>
            <p className="masthead-line">{SITE_DESCRIPTION}</p>

            <div className="masthead-meta">
              <span className="voice-ui text-muted">
                전체 <span className="voice-source">{allPosts.length}</span>편
              </span>
              {newest ? (
                <span className="voice-ui text-muted">
                  최근 발행{" "}
                  <span className="voice-source">
                    {formatDateShort(newest.frontmatter.publishedAt)}
                  </span>
                </span>
              ) : null}
              {/* 「지난번 이후 새것」 — 단골에게 가장 중요한데 지금까지 아무 장치가 없었다.
                  클라이언트 전용이라 SSG 를 건드리지 않는다. */}
              <SinceLastVisit posts={allPosts} />
            </div>
          </header>

          {days.map(({ group, partition, isLatest }) => (
            <section
              key={group.day}
              aria-label={`${group.day} 발행분`}
              className="mt-[var(--space-6)]"
            >
              <DayHead group={group} isLatest={isLatest} />

              <ul role="list" className="mt-[var(--space-3)]">
                {partition.promoted.map((post) => (
                  <PostRow key={post.slug} post={post} reserveViews />
                ))}
                {/* 그날의 침전물은 맨 아래 한 줄로 접힌다. */}
                <ReleaseDigest groups={partition.routine} />
              </ul>
            </section>
          ))}

          <div className="rule-pair mt-[var(--space-6)]" />

          <nav
            aria-label="더 보기"
            className="mt-[var(--space-4)] flex flex-wrap gap-x-[var(--space-5)] gap-y-[var(--space-2)]"
          >
            <Link href="/archive" className="voice-ui text-muted hover:text-heading">
              그 전 → 아카이브
            </Link>
            <Link href="/topics" className="voice-ui text-muted hover:text-heading">
              여섯 갈래 → 주제
            </Link>
            <Link href="/sources" className="voice-ui text-muted hover:text-heading">
              어디서 왔나 → 출처
            </Link>
          </nav>
        </div>
      </ViewCounts>
    </Container>
  );
}

interface HomeDay {
  group: ReturnType<typeof postsByDay>[number];
  partition: ReturnType<typeof partitionReleases>;
  isLatest: boolean;
}

/**
 * 지면에 실을 날들을 고른다. **접은 뒤에 예산을 센다** — 그 순서가 뒤집히면
 * 정기 릴리즈 여덟 건이 예산을 여덟 칸 먹고 볼 만한 글이 밀려난다.
 *
 * 오늘치를 따로 잘라 내던 상한(`TODAY_FULL_MAX`)은 없앴다. 행이 전부 같은 크기가 된 이상
 * 「오늘만 크게 실어서 넘친다」는 상황이 아예 생기지 않고, 예산 하나면 충분하다.
 */
function pickDays(all: ReturnType<typeof postsByDay>): HomeDay[] {
  const days: HomeDay[] = [];
  let budget = HOME_ITEM_BUDGET;

  for (const [index, group] of all.entries()) {
    if (days.length >= MIN_DAYS && budget <= 0) {
      break;
    }

    const partition = partitionReleases(group.posts);
    days.push({ group, partition, isLatest: index === 0 });
    // 접힌 묶음은 몇 건이 들었든 한 줄이다.
    budget -= partition.promoted.length + (partition.routine.length > 0 ? 1 : 0);
  }

  return days;
}
