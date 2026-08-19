import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { DayHead } from "@/components/post/DayHead";
import { PostIndexRow } from "@/components/post/PostIndexRow";
import { PostLead } from "@/components/post/PostLead";
import { PostTable } from "@/components/post/PostTable";
import { ReleaseDigest } from "@/components/post/ReleaseDigest";
import { SinceLastVisit } from "@/components/post/SinceLastVisit";
import { ViewCounts } from "@/components/post/ViewCounts";
import { getAllPosts } from "@/lib/content/posts";
import { formatDateShort } from "@/lib/format";
import { pickLead } from "@/lib/frontpage";
import { partitionReleases } from "@/lib/releases";
import { showsCrossSources } from "@/lib/selection";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";
import { postsByDay } from "@/lib/stats";
import type { Post } from "@/types/content";

/**
 * 가장 새 날에 한 행씩 세울 상한. **접은 뒤의 행 수를 센다.**
 * 접기가 일을 하므로 평상시에는 걸리지 않는다 (2026-08-18 은 접고 나면 19행이었다) —
 * 40편이 들어오는 날의 안전장치로만 둔다. 잘라 낸 뒤에는 그 사실을 적는다.
 */
const TODAY_FULL_MAX = 24;

/** 지면 전체가 실을 항목 수. 접힌 묶음은 **1행으로 센다** (8행이 아니라). */
const HOME_ITEM_BUDGET = 60;

/** 예산이 남아도 이만큼의 날은 싣는다 — 글이 뜸한 주에도 지면이 비지 않게 한다. */
const MIN_DAYS = 3;

/**
 * 1면 — **일자 구획**이다.
 *
 * 옛 지면은 머리기사 하나 + 단신 다섯 + 카테고리별 넷이었다. 사람이 하루 한두 편 고르던
 * 시절의 배치인데 지금은 봇이 하루 스무 편을 밀어 넣는다. 단신 다섯 칸은 **여섯 시간치**였고,
 * 지면 전체를 다 세어도 그날 글의 절반이 안 보였다.
 *
 * 「1면 편집」 시그니처를 죽이지 않고 **주기를 바꾼다.** 신문의 1면은 원래 한 호(號)당
 * 하나이고 여기서 한 호는 **하루**다 — 그래서 머리기사는 가장 새 날에만 선다.
 * 「지면당 머리기사는 하나」가 그대로 지켜진다.
 *
 * 급이 무너지는 자리가 곧 편집이다: **오늘은 편집면, 어제부터는 색인.**
 * 그 차이가 「두 화면을 나란히 놨는데 구분이 안 되면 실패」에 대한 답이고,
 * 보류돼 있던 「시간축 눈금」 후보를 별도 장치 없이 흡수한 자리다 (`DayHead`).
 */
export default function Home() {
  const allPosts = getAllPosts();
  const newest = allPosts.at(0);
  const days = pickDays(postsByDay());

  // 가장 새 날만 편집면이다 — 머리기사는 거기서만 선다.
  const latest = days.at(0);
  const lead = latest ? pickLead(latest.group.posts) : null;

  // 조회수는 한 번에 모아 받는다 — 행마다 부르지 않는다. 지면에 실린 글만 센다.
  const shownIds = [
    ...new Set(
      days.flatMap((day) =>
        day.isLatest ? day.partition.promoted.map((post) => post.slug) : [],
      ),
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

          {days.map(({ group, partition, isLatest, truncated }) => (
            <section
              key={group.day}
              aria-label={`${group.day} 발행분`}
              className="mt-[var(--space-6)]"
            >
              <DayHead group={group} isLatest={isLatest} />

              {isLatest ? (
                <>
                  {/* 머리기사 — 표제가 스케일 밖으로 커지는 자리이고 이 지면의 파격 예산을
                      여기 전부 쓴다. 「추린 비율」도 지면당 한 번, 여기서만 그린다. */}
                  {lead ? <PostLead post={lead} /> : null}

                  <ul role="list" className="list-loose mt-[var(--space-4)]">
                    {partition.promoted
                      .filter((post) => post !== lead)
                      .map((post) => (
                        <PostTableRow key={post.slug} post={post} />
                      ))}

                    {/* 그날의 침전물은 맨 아래 한 줄로 접힌다. */}
                    <ReleaseDigest groups={partition.routine} />
                  </ul>

                  {truncated > 0 ? (
                    <p className="voice-ui mt-[var(--space-3)] text-muted">
                      이 날 <span className="voice-source">{truncated}</span>편을
                      더 실었습니다 —{" "}
                      <Link href="/archive" className="underline underline-offset-4">
                        아카이브
                      </Link>
                    </p>
                  ) : null}
                </>
              ) : (
                /* 어제부터는 색인 밀도다. 요약도 메타도 없이 날짜·제목·구분 3열. */
                <ul role="list" className="list-tight mt-[var(--space-3)]">
                  {partition.promoted.map((post) => (
                    <PostIndexRow key={post.slug} post={post} />
                  ))}
                  <ReleaseDigest groups={partition.routine} />
                </ul>
              )}
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

/** 한 행. `PostTable` 은 목록 단위라 여기서는 항목 하나만 빌려 쓴다. */
function PostTableRow({ post }: { post: Post }) {
  return (
    <PostTable
      posts={[post]}
      showCategory
      showIdentifier
      /* 요약을 펴는 기준도 교차등장이다 — 등급은 59%가 high 라 아무것도 가르지 못한다.
         전부 펴면 하루치 훑는 데 3,460자가 되고, 전부 접으면 700자지만 판단할 거리가 없다. */
      showSummary={showsCrossSources(post.frontmatter.selection)}
      reserveViews
      caption={post.frontmatter.title}
    />
  );
}

interface HomeDay {
  group: ReturnType<typeof postsByDay>[number];
  partition: ReturnType<typeof partitionReleases>;
  isLatest: boolean;
  /** 상한에 걸려 이 지면에서 뺀 편수 */
  truncated: number;
}

/**
 * 지면에 실을 날들을 고른다. **접은 뒤에 예산을 센다** — 그 순서가 뒤집히면
 * 정기 릴리즈 여덟 건이 예산을 여덟 칸 먹고 볼 만한 글이 밀려난다.
 */
function pickDays(all: ReturnType<typeof postsByDay>): HomeDay[] {
  const days: HomeDay[] = [];
  let budget = HOME_ITEM_BUDGET;

  for (const [index, group] of all.entries()) {
    if (days.length >= MIN_DAYS && budget <= 0) {
      break;
    }

    const isLatest = index === 0;
    const partition = partitionReleases(group.posts);
    const promoted = isLatest
      ? partition.promoted.slice(0, TODAY_FULL_MAX)
      : partition.promoted;

    days.push({
      group,
      partition: { ...partition, promoted },
      isLatest,
      truncated: partition.promoted.length - promoted.length,
    });
    // 접힌 묶음은 몇 건이 들었든 한 줄이다.
    budget -= promoted.length + (partition.routine.length > 0 ? 1 : 0);
  }

  return days;
}
