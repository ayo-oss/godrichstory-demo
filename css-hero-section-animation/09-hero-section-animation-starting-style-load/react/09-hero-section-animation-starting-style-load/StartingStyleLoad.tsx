import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./StartingStyleLoad.module.scss";

export type StartingStyleLoadProps = {
  label?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function StartingStyleLoad({
  label = "Saved",
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#38b6ff",
}: StartingStyleLoadProps) {
  const [hidden, setHidden] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // @starting-style 는 요소가 "새로 렌더" 될 때만 발동한다 — 실서비스라면 실제 저장 이벤트가
  // 이 토글을 부르고, 여기서는 데모용으로 짧은 간격을 두고 반복 재현한다
  useEffect(() => {
    const id = setInterval(() => {
      setHidden(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setHidden(false)));
    }, 350);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={styles.scene} style={vars}>
      <p className={styles.label}>Auto-save</p>
      <div className={`${styles.toast} ${hidden ? styles.hidden : ""}`}>{label}</div>
    </div>
  );
}
