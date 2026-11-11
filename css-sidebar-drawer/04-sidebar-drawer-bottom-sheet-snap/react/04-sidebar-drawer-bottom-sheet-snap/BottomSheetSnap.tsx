import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./BottomSheetSnap.module.scss";

export type SnapStep = "closed" | "peek" | "half" | "full";

export type BottomSheetSnapProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

const STEPS: SnapStep[] = ["peek", "half", "full"];

export default function BottomSheetSnap({
  duration = 300,
  easing = "ease-out",
  color = "#17141a",
}: BottomSheetSnapProps) {
  const [snap, setSnap] = useState<SnapStep>("closed");
  const open = snap !== "closed";

  function cycle() {
    const i = STEPS.indexOf(snap === "closed" ? "peek" : snap);
    setSnap(STEPS[(i + 1) % STEPS.length]);
  }

  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.stage} style={vars}>
      <button className={styles.trigger} type="button" onClick={() => setSnap("half")}>목록 열기</button>
      <div className={styles.overlay} data-open={open} onClick={() => setSnap("closed")} />
      <div className={styles.sheet} data-snap={snap} role="dialog" aria-modal="true" aria-label="주변 장소 12곳">
        <button
          className={styles.handle}
          type="button"
          aria-label="시트 크기 전환(peek·half·full)"
          onClick={cycle}
        />
        <h2>주변 장소 12곳</h2>
        <p>손잡이를 누를 때마다 peek → half → full 순으로 바뀐다.</p>
      </div>
    </div>
  );
}
