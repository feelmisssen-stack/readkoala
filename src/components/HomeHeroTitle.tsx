"use client";

import { useLayoutEffect, useRef } from "react";

/** text-3xl(30px)의 2/3 */
const MAX_FONT_PX = 20;
const MIN_FONT_PX = 10;

export function HomeHeroTitle() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    const containerEl = containerRef.current;
    const titleEl = titleRef.current;
    if (!containerEl || !titleEl) return;

    function fit() {
      const container = containerRef.current;
      const title = titleRef.current;
      if (!container || !title) return;

      let size = MAX_FONT_PX;
      title.style.fontSize = `${size}px`;
      const maxWidth = container.clientWidth;

      while (title.scrollWidth > maxWidth && size > MIN_FONT_PX) {
        size -= 0.5;
        title.style.fontSize = `${size}px`;
      }
    }

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(containerEl);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full overflow-hidden">
      <h1
        ref={titleRef}
        className="whitespace-nowrap text-center font-bold tracking-tight text-koala-heading"
      >
        작은 호기심이 자라나, 우리의 깊은 감상이 되는 곳
      </h1>
    </div>
  );
}
