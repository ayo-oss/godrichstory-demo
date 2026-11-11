// SpinWheelCoupon — vanilla 판(run/283/demo/03-coupon-spin-wheel/index.html) 의 React 포트.
// 여덟 칸은 conic-gradient 한 줄, 라벨은 칸 중앙(k*45+22.5deg)에 놓고 글자만 역회전시킨다.
// 실제 클릭은 transition 감속 회전(랜덤 당첨칸), 격자 미리보기 루프와 별개.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SpinWheelCoupon.module.scss";

export type SpinWheelCouponProps = {
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type SliceVars = CSSProperties & { "--k"?: number };

type Slice = { k: number; text: string };

/** 여덟 칸 — 짝수 칸이 당첨(크림 바탕), 홀수 칸이 꽝(파란 바탕) */
const SLICES: Slice[] = [
  { k: 0, text: "10%" },
  { k: 1, text: "꽝" },
  { k: 2, text: "20%" },
  { k: 3, text: "꽝" },
  { k: 4, text: "30%" },
  { k: 5, text: "꽝" },
  { k: 6, text: "10%" },
  { k: 7, text: "꽝" },
];
/** 멈출 수 있는 칸(당첨칸만) — vanilla 의 picks 와 같다 */
const PICKS: number[] = [0, 2, 4, 6];
const PER_SLICE = 45;
/** 감속 회전이 끝나는 시각(ms) — vanilla 의 setTimeout 1900 과 같다 */
const SETTLE_MS = 1900;

export default function SpinWheelCoupon({
  demo = true,
  duration = 2000,
  easing = "ease-out",
  color = "#fff7e6",
}: SpinWheelCouponProps) {
  const [live, setLive] = useState(demo);
  const [spinning, setSpinning] = useState(false);
  const [won, setWon] = useState(false);
  const [angle, setAngle] = useState(0);
  const timer = useRef<number>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(function () {
    return function () {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }
    };
  }, []);

  // vanilla 의 click 핸들러와 같은 순서·같은 수치
  function applySpin() {
    if (spinning) {
      return;
    }
    setLive(false);
    setWon(false);
    setSpinning(true);
    const idx = PICKS[Math.floor(Math.random() * PICKS.length)];
    const target = 1800 + (360 - (idx * PER_SLICE + PER_SLICE / 2));
    setAngle(target);
    timer.current = window.setTimeout(function () {
      setSpinning(false);
      setWon(true);
    }, SETTLE_MS);
  }

  const cls = [
    styles.root,
    live ? styles.isDemo : "",
    spinning ? styles.isSpinning : "",
    won ? styles.isWon : "",
  ].filter(Boolean).join(" ");
  const discStyle: CSSProperties = live ? {} : { transform: `rotate(${angle}deg)` };

  return (
    <main className={styles.stage} style={vars}>
      <div className={cls}>
        <div className={styles.rig}>
          <div className={styles.pointer} aria-hidden="true"></div>
          <div className={styles.disc} style={discStyle}>
            <div className={styles.ring} aria-hidden="true"></div>
            {SLICES.map(function (slice: Slice) {
              const sliceVars: SliceVars = { "--k": slice.k };
              const lblCls = [styles.lbl, slice.k % 2 === 1 ? styles.lblB : ""].filter(Boolean).join(" ");
              return (
                <span className={lblCls} style={sliceVars} key={slice.k}><b>{slice.text}</b></span>
              );
            })}
            <button type="button" className={styles.hub} onClick={applySpin}>뽑기</button>
          </div>
        </div>
        <p className={styles.result} aria-live="polite">
          <span className={`${styles.msg} ${styles.msgIdle}`}>판을 돌려 할인을 뽑아보세요</span>
          <span className={`${styles.msg} ${styles.msgSpin}`} aria-hidden="true">돌리는 중</span>
          <span className={`${styles.msg} ${styles.msgWin}`} aria-hidden="true">30% 할인 당첨!</span>
        </p>
      </div>
    </main>
  );
}
