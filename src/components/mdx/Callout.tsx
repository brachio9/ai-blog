import type { ReactNode } from "react";

import {
  CheckCircleIcon,
  InfoIcon,
  type IconProps,
  WarningIcon,
  XCircleIcon,
} from "@/components/ui/icons";

export type CalloutType = "info" | "success" | "warning" | "danger";

/** 클래스는 리터럴이어야 한다 — Tailwind 는 조합된 클래스명을 찾지 못한다. */
const TONE: Record<
  CalloutType,
  { border: string; icon: string; Icon: (props: IconProps) => ReactNode }
> = {
  info: { border: "border-l-info", icon: "text-info", Icon: InfoIcon },
  success: {
    border: "border-l-success",
    icon: "text-success",
    Icon: CheckCircleIcon,
  },
  warning: {
    border: "border-l-warning",
    icon: "text-warning",
    Icon: WarningIcon,
  },
  danger: { border: "border-l-danger", icon: "text-danger", Icon: XCircleIcon },
};

export function Callout({
  type = "info",
  title,
  children,
}: {
  type?: CalloutType;
  title?: string;
  children?: ReactNode;
}) {
  const tone = TONE[type];

  return (
    <aside
      className={`my-6 flex gap-3 border-l-[3px] bg-surface px-4 py-3 ${tone.border}`}
    >
      <span className={`mt-0.5 shrink-0 ${tone.icon}`}>
        <tone.Icon />
      </span>
      <div className="min-w-0">
        {title ? (
          <p className="mb-1 font-sans text-sm font-medium text-heading">
            {title}
          </p>
        ) : null}
        {children}
      </div>
    </aside>
  );
}
