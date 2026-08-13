/**
 * 이미지 업로드의 순수 로직 — 확장자·크기 검증과 저장 경로 결정.
 *
 * ADR-005: 이미지도 글과 같은 레포에 커밋한다 (`public/uploads/{YYYY}/{MM}/`).
 * 외부 스토리지(R2 등)를 쓰지 않으므로 여기서 정한 경로가 그대로 커밋 대상이 된다 —
 * 업로드된 파일명을 경로에 그대로 넣지 않는다 (경로 주입 차단).
 */
const ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif", "svg"];

/**
 * Vercel 서버리스의 요청 본문 한도(약 4.5MB)를 넘으면 라우트에 도달하기도 전에 실패해
 * 원인을 알 수 없는 에러가 난다. 그 앞에서 끊어 이유를 알려 준다.
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/** 사람이 읽을 수 있을 만큼만 남긴다 — 나머지는 날짜·시각이 구분한다. */
const MAX_BASE_LENGTH = 40;

/** 최종 경로가 이 모양이 아니면 커밋하지 않는다 (정규화 실수에 대한 마지막 그물). */
const UPLOAD_PATH_PATTERN = new RegExp(
  `^public/uploads/\\d{4}/\\d{2}/[a-z0-9-]+\\.(${ALLOWED_EXTENSIONS.join("|")})$`,
);

export interface UploadTarget {
  /** 레포 기준 커밋 경로 */
  path: string;
  /** 본문에 삽입할 공개 URL */
  url: string;
}

export type UploadResolution =
  | { ok: true; value: UploadTarget }
  | { ok: false; message: string };

export interface UploadInput {
  /** 업로드된 원래 파일명 — 확장자만 믿고 나머지는 정규화한다 */
  name: string;
  size: number;
  /** KST ISO-8601 (+0900). 호출부가 nowKstIso() 로 만들어 넘긴다. */
  kstNow: string;
}

function extensionOf(name: string): string | null {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return null;

  const extension = name.slice(dot + 1).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(extension) ? extension : null;
}

/** 업로드된 이름에서 안전한 조각만 남긴다. 남는 게 없으면 image. */
function safeBaseName(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = (dot < 0 ? name : name.slice(0, dot))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_BASE_LENGTH)
    .replace(/-+$/, "");

  return base || "image";
}

export function resolveUploadTarget(input: UploadInput): UploadResolution {
  const extension = extensionOf(input.name);
  if (!extension) {
    return {
      ok: false,
      message: `허용하지 않는 확장자다 — ${ALLOWED_EXTENSIONS.join(" · ")} 만 올릴 수 있다`,
    };
  }

  if (input.size <= 0) {
    return { ok: false, message: "빈 파일이다" };
  }
  if (input.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      message: `파일이 너무 크다 (${(input.size / 1024 / 1024).toFixed(1)}MB) — 4MB 까지만 올릴 수 있다`,
    };
  }

  // nowKstIso() 형식: 2026-08-13T09:30:12+0900
  const year = input.kstNow.slice(0, 4);
  const month = input.kstNow.slice(5, 7);
  const day = input.kstNow.slice(8, 10);
  const time = input.kstNow.slice(11, 19).replace(/:/g, "");

  const fileName = `${day}-${time}-${safeBaseName(input.name)}.${extension}`;
  const path = `public/uploads/${year}/${month}/${fileName}`;

  if (!UPLOAD_PATH_PATTERN.test(path)) {
    return { ok: false, message: `업로드 경로를 만들 수 없다: ${input.name}` };
  }

  // public/ 은 배포되면 사이트 루트가 된다 — 본문에 넣을 URL 은 그 앞을 뗀 값이다.
  return { ok: true, value: { path, url: path.replace(/^public/, "") } };
}
