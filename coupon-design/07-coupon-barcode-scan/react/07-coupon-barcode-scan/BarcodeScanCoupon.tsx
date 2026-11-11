// BarcodeScanCoupon — vanilla 판(run/283/demo/07-coupon-barcode-scan/index.html) 의 React 포트.
// 스캔 버튼을 누르면 미리보기 루프에서 빠져나와 빔이 한 번 훑고(800ms) 결제 완료로 컷 전환한다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./BarcodeScanCoupon.module.scss";

export type BarcodeScanCouponProps = {
  /** 격자 미리보기 루프 한 바퀴 (vanilla 2s) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/** 빔이 바코드를 훑는 시간 — scss 의 bcBeamOnce 800ms 와 같은 값 */
const SCAN_MS = 800;

export default function BarcodeScanCoupon({
  duration = 2000,
  easing = "ease-out",
  color = "#fff7e6",
}: BarcodeScanCouponProps) {
  const [demo, setDemo] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [done, setDone] = useState(false);
  const [stateText, setStateText] = useState("대기 중");
  const [liveText, setLiveText] = useState("");
  const timerRef = useRef<number>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) { window.clearTimeout(timerRef.current); }
    };
  }, []);

  function applyScan(): void {
    setDemo(false);
    if (done) { return; }
    setScanning(true);
    setStateText("스캔 중");
    timerRef.current = window.setTimeout(() => {
      setScanning(false);
      setDone(true);
      setStateText("결제 완료");
      setLiveText("바코드를 읽어 결제를 끝냈어요");
    }, SCAN_MS);
  }

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cls: string = [
    styles.root,
    demo ? styles.isDemo : "",
    scanning ? styles.isScanning : "",
    done ? styles.isDone : "",
  ].filter(Boolean).join(" ");

  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <div className={styles.card}>
          <div className={styles.head}>
            <p className={styles.title}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true"><path d="M224,48V208H32V48Z" opacity="0.2" /><path d="M232,48V88a8,8,0,0,1-16,0V56H184a8,8,0,0,1,0-16h40A8,8,0,0,1,232,48ZM72,200H40V168a8,8,0,0,0-16,0v40a8,8,0,0,0,8,8H72a8,8,0,0,0,0-16Zm152-40a8,8,0,0,0-8,8v32H184a8,8,0,0,0,0,16h40a8,8,0,0,0,8-8V168A8,8,0,0,0,224,160ZM32,96a8,8,0,0,0,8-8V56H72a8,8,0,0,0,0-16H32a8,8,0,0,0-8,8V88A8,8,0,0,0,32,96ZM80,80a8,8,0,0,0-8,8v80a8,8,0,0,0,16,0V88A8,8,0,0,0,80,80Zm104,88V88a8,8,0,0,0-16,0v80a8,8,0,0,0,16,0ZM144,80a8,8,0,0,0-8,8v80a8,8,0,0,0,16,0V88A8,8,0,0,0,144,80Zm-32,0a8,8,0,0,0-8,8v80a8,8,0,0,0,16,0V88A8,8,0,0,0,112,80Z" /></svg>
              <span>멤버십 바코드</span>
            </p>
            <span className={styles.state}>{stateText}</span>
          </div>
          <div className={styles.bars} aria-hidden="true">
            <span className={styles.beam} />
          </div>
          <p className={styles.digits}>8842 0071 3390</p>
          <div className={styles.foot}>
            <button type="button" className={styles.btn} onClick={applyScan}>스캔</button>
            <p className={styles.done}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.tick} aria-hidden="true"><path d="M232,56V200a16,16,0,0,1-16,16H40a16,16,0,0,1-16-16V56A16,16,0,0,1,40,40H216A16,16,0,0,1,232,56Z" opacity="0.2" /><path d="M205.66,85.66l-96,96a8,8,0,0,1-11.32,0l-40-40a8,8,0,0,1,11.32-11.32L104,164.69l90.34-90.35a8,8,0,0,1,11.32,11.32Z" /></svg>
              <span>결제 완료</span>
            </p>
          </div>
        </div>
        <p className={styles.live} aria-live="polite">{liveText}</p>
      </div>
    </main>
  );
}
