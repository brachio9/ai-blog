import type { Metadata } from "next";

import { Container } from "@/components/layout/Container";
import { MdxBody } from "@/components/mdx";
import { renderMdx } from "@/lib/mdx";

export const metadata: Metadata = {
  title: "MDX 렌더 검증",
  robots: { index: false, follow: false },
};

/**
 * 렌더 파이프라인 검증 전용 라우트. 사이트 내비게이션에 링크하지 않는다.
 * blog-1 step 4 에서 실제 샘플 글로 대체되고, blog-2 에서 삭제된다.
 */
const SOURCE = `
## 표

좁은 화면에서 표만 가로로 스크롤되고 페이지 본문은 밀리지 않아야 한다.

| 모델 | 파라미터 | 컨텍스트 | 라이선스 | 공개일 |
|:--|--:|--:|:--|:--|
| Llama 3.1 405B | 405B | 128K | Llama 3.1 Community | 2024-07-23 |
| Mistral Large 2 | 123B | 128K | Mistral Research | 2024-07-24 |
| Qwen2.5 72B | 72B | 131K | Apache-2.0 | 2024-09-19 |

## 코드

인라인 코드는 \`getAllPosts()\` 처럼 본문 흐름 안에 놓인다.

\`\`\`ts
import { getAllPosts } from "@/lib/content/posts";

export function latest(count: number) {
  // publishedAt 내림차순으로 이미 정렬되어 있다.
  return getAllPosts().slice(0, count);
}
\`\`\`

### 인용

> 본문 단폭은 68ch 를 넘지 않는다. 그보다 넓으면 읽기 어렵다.

## 이미지

![분기별 공개 모델 수 — 자리 이미지](/sample-figure.png)

## 콜아웃

<Callout type="info" title="출처 표기">
  외부 원문을 요약·인용하면 source.url 표기가 필수다.
</Callout>

<Callout type="warning">
  단일 테마로 하이라이팅하면 색이 인라인으로 박혀 다크모드에서 바뀌지 않는다.
</Callout>

## 링크와 목록

- 내부 링크: [홈으로](/)
- 외부 링크: [Hugging Face 블로그](https://huggingface.co/blog)

#### 더 작은 제목

제목에 마우스를 올리면 앵커 표식이 나타난다.
`;

export default function MdxPreviewPage() {
  return (
    <Container>
      <div className="py-12">
        <MdxBody>{renderMdx(SOURCE)}</MdxBody>
      </div>
    </Container>
  );
}
