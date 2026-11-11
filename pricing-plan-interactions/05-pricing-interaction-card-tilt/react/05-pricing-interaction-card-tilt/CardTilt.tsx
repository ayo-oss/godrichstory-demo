import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CardTilt.module.scss";

// React 이벤트 타입은 'react' 앰비언트에 없다 — 쓰는 모양만 여기서 직접 적는다
type PtrEvt = {
  clientX: number;
  clientY: number;
  currentTarget: { getBoundingClientRect(): { left: number; top: number; width: number; height: number } };
};

export type CardTiltProps = {
  planName?: string;
  amount?: string;
  unit?: string;
  feature?: string;
  /** 기울기 한계(deg). 이보다 크면 모서리에서 본 그림이 된다 */
  limit?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--rx"?: string;
  "--ry"?: string;
  "--mx"?: string;
  "--my"?: string;
};

const REST = { rx: 0, ry: 0, mx: 50, my: 50 };

export default function CardTilt({
  planName = "Premium",
  amount = "$99",
  unit = "/ mo",
  feature = "Unlimited projects",
  limit = 9,
  duration = 300,
  easing = "ease-out",
  color = "#b9a0ff",
}: CardTiltProps) {
  const [demo, setDemo] = useState(true);
  const [idle, setIdle] = useState(false);
  const [t, setT] = useState(REST);

  // 커서의 카드 안 상대 좌표(0~1)를 각도와 글레어 위치로 옮긴다
  function move(e: PtrEvt) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    setDemo(false);
    setIdle(false); // 따라다니는 동안은 transition 없이 바로 붙는다
    setT({ rx: (0.5 - y) * 2 * limit, ry: (x - 0.5) * 2 * limit, mx: x * 100, my: y * 100 });
  }
  function leave() {
    setIdle(true); // 떠날 때만 transition 이 걸려 스르르 눕는다
    setT(REST);
  }

  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--rx": `${t.rx.toFixed(2)}deg`,
    "--ry": `${t.ry.toFixed(2)}deg`,
    "--mx": `${t.mx.toFixed(1)}%`,
    "--my": `${t.my.toFixed(1)}%`,
  };

  return (
    <div className={`${styles.ct} ${demo ? styles.isDemo : ""}`} style={vars}>
      <div className={styles.scene}>
        <div
          className={`${styles.card} ${idle ? styles.isIdle : ""}`}
          onPointerMove={move}
          onPointerLeave={leave}
        >
          <span className={styles.name}>{planName}</span>
          <span className={styles.price}>
            <span className={styles.amount}>{amount}</span>
            <span className={styles.unit}>{unit}</span>
          </span>
          <span className={styles.feat}>{feature}</span>
        </div>
      </div>
    </div>
  );
}
