import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ThumbnailSnap.module.scss";

export type ThumbnailSnapProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type TrackEl = { children: { item(i: number): { scrollIntoView(opts: { behavior: string; inline: string }): void } | null } } | null;

export default function ThumbnailSnap({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#2f6df6" }: ThumbnailSnapProps) {
  const [active, setActive] = useState(0);
  const track = useRef<TrackEl>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const go = (i: number) => {
    setActive(i);
    track.current?.children.item(i)?.scrollIntoView({ behavior: "smooth", inline: "start" });
  };
  return (
    <div className={styles.tm} style={vars}>
      {/* 원본은 큰 슬라이드·썸네일 둘 다 <a href="#id"> + :target 만으로 끝난다(0줄 JS).
          컴포넌트는 아이디 충돌을 피하려 scrollIntoView 로 같은 동작을 낸다 */}
      <div className={styles.viewport} ref={track as never}>
        <div className={styles.track}>
          {[1, 2, 3].map((n) => (
            <div key={n} className={`${styles.slide} ${styles["slide" + n]}`} />
          ))}
        </div>
      </div>
      <nav className={styles.thumbs}>
        {[0, 1, 2].map((i) => (
          <button
            key={i}
            type="button"
            aria-label={`슬라이드 ${i + 1} 썸네일`}
            className={`${styles.thumb} ${styles["thumb" + (i + 1)]} ${i === active ? styles.isActive : ""}`}
            onClick={() => go(i)}
          />
        ))}
      </nav>
    </div>
  );
}
