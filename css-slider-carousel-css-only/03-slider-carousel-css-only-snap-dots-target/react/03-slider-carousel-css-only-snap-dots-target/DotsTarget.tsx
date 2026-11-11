import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./DotsTarget.module.scss";

export type DotsTargetProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type TrackEl = { children: { item(i: number): { scrollIntoView(opts: { behavior: string; inline: string }): void } | null } } | null;

export default function DotsTarget({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#ffd23f" }: DotsTargetProps) {
  const [active, setActive] = useState(0);
  const track = useRef<TrackEl>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const go = (i: number) => {
    setActive(i);
    track.current?.children.item(i)?.scrollIntoView({ behavior: "smooth", inline: "start" });
  };
  return (
    <div className={styles.dt} style={vars}>
      {/* 원본은 <a href="#id"> + :target 만으로 끝난다(0줄 JS). 컴포넌트는 아이디가 겹치지 않도록
          scrollIntoView 로 같은 동작을 낸다 — 실제로 슬라이드가 스크롤 상자 안에서 움직인다 */}
      <div className={styles.viewport} ref={track as never}>
        <div className={styles.track}>
          {[1, 2, 3].map((n) => (
            <div key={n} className={`${styles.slide} ${styles["slide" + n]}`} />
          ))}
        </div>
      </div>
      <nav className={styles.dots}>
        {[0, 1, 2].map((i) => (
          <button
            key={i}
            type="button"
            aria-label={`슬라이드 ${i + 1}`}
            className={`${styles.dot} ${i === active ? styles.isActive : ""}`}
            onClick={() => go(i)}
          />
        ))}
      </nav>
    </div>
  );
}
