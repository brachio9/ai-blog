import { Children, isValidElement, type ComponentProps } from "react";

import { MdxImage } from "./Image";

/**
 * 마크다운은 홑이미지도 단락으로 감싼다. `<figure>` 가 `<p>` 안에 들어가면 HTML 규격
 * 위반이라 브라우저가 단락을 강제로 닫고, 그 결과 hydration 이 어긋난다. 여기서 벗긴다.
 */
export function MdxParagraph({ children, ...props }: ComponentProps<"p">) {
  const only = Children.toArray(children);

  if (
    only.length === 1 &&
    isValidElement(only[0]) &&
    only[0].type === MdxImage
  ) {
    return <>{only[0]}</>;
  }

  return <p {...props}>{children}</p>;
}
