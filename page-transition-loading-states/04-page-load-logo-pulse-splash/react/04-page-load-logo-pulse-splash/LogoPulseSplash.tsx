import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LogoPulseSplash.module.scss";

export type LogoPulseSplashProps = {
  /** 준비 중 안내 — aria-live="polite" 영역에 들어간다 */
  message?: string;
  /** 버튼을 눌러 준비가 끝났을 때의 안내 */
  readyMessage?: string;
  enterLabel?: string;
  groupLabel?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 버튼을 누르면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function LogoPulseSplash({
  message = "Getting your first screen ready",
  readyMessage = "All set",
  enterLabel = "Go in without waiting",
  groupLabel = "First run splash",
  demo = true,
  duration = 600,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: LogoPulseSplashProps) {
  const [ready, setReady] = useState(false);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  // 루프는 마크의 맥박과 점 셋만 돈다 — 스플래시가 걷히는 장면은 사람이 버튼을 눌렀을 때만 일어난다
  const cls = [styles.sp, demo && !ready ? styles.isDemo : "", ready ? styles.isReady : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <div className={styles.mark} aria-hidden="true">
        <span className={styles.disc} />
        <span className={styles.box} />
      </div>
      <p className={styles.dots} aria-hidden="true">
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </p>
      <p className={styles.msg} aria-live="polite">{ready ? readyMessage : message}</p>
      <button className={styles.enter} type="button" disabled={ready} onClick={() => setReady(true)}>
        {enterLabel}
      </button>
    </section>
  );
}
