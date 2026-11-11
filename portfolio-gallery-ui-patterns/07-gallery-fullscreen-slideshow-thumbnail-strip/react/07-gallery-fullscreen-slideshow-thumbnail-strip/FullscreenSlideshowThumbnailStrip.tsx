import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FullscreenSlideshowThumbnailStrip.module.scss";

type ReactKeyboardEvent<T> = { key: string; preventDefault: () => void; currentTarget: T };

export type FullscreenSlideshowThumbnailStripProps = {
  duration?: number;
  easing?: string;
  /** 활성 썸네일 테두리 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const TONES = ["a", "b", "c", "d"] as const;

/**
 * 큰 사진 한 장이 자동으로 넘어가고, 화살표 키나 썸네일 클릭으로도 이동할 수 있다.
 * 자동 재생 트랙엔 1번 슬라이드의 클론을 5번째 칸으로 붙여 두어 (vanilla 와 동일한 기법)
 * 한 바퀴 끝(80%)이 1번째(0%)와 같은 그림이라 되돌아가는 지점이 안 보인다.
 */
export default function FullscreenSlideshowThumbnailStrip({
  duration = 2000,
  easing = "linear",
  color = "#6ec8ff",
}: FullscreenSlideshowThumbnailStripProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const [current, setCurrent] = useState(0);
  const [autoplay, setAutoplay] = useState(true);

  function goTo(i: number) {
    setAutoplay(false);
    setCurrent(i);
  }

  function onKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowRight") { goTo((current + 1) % TONES.length); e.preventDefault(); }
    else if (e.key === "ArrowLeft") { goTo((current - 1 + TONES.length) % TONES.length); e.preventDefault(); }
  }

  const trackStyle: Vars = autoplay ? vars : { ...vars, transform: `translateX(-${current * 20}%)` };

  return (
    <div className={styles.wrap} style={vars}>
      <div
        className={styles.viewport}
        tabIndex={0}
        aria-label="Slideshow, use the left and right arrow keys to move"
        onKeyDown={onKeyDown}
      >
        <ul className={`${styles.track} ${autoplay ? styles.autoplay : ""}`} style={trackStyle}>
          {/* 실제 4장 + 1번째 클론(5번째 칸, aria-hidden) — 자동 루프가 이 5칸을 -80%까지 훑는다 */}
          {[...TONES, TONES[0]].map((tone, i) => (
            <li key={i} className={`${styles.slide} ${styles["slide-" + tone]}`} aria-hidden={i === TONES.length} />
          ))}
        </ul>
      </div>
      <div className={styles.thumbs} role="tablist" aria-label="Choose a slide">
        {TONES.map((tone, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={!autoplay && current === i}
            aria-label={`Photo ${i + 1}`}
            className={[
              styles.thumb,
              styles["thumb-" + tone],
              autoplay ? styles["autoThumb-" + tone] : (current === i ? styles.active : ""),
            ].join(" ")}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </div>
  );
}
