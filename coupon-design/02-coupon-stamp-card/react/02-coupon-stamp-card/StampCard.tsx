// StampCard — vanilla 판(run/283/demo/02-coupon-stamp-card/index.html) 의 React 포트.
// 도장은 scale 1.6→1 내리찍기 + 살짝 기울임. 진행률은 role="progressbar" 의 aria-valuenow 에 그대로 실린다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./StampCard.module.scss";

export type StampCardProps = {
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/** 칸 열 개 — vanilla 의 열 개 .sp__slot 과 같은 수 */
const SLOTS: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
/** 처음 찍혀 있는 도장 수. 이보다 뒤 칸은 이번에 찍은 것이라 내리찍기 애니메이션이 붙는다 */
const START = 7;
const GOAL = 10;

export default function StampCard({
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  color = "#2f6df6",
}: StampCardProps) {
  const [live, setLive] = useState(demo);
  const [count, setCount] = useState(START);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const full = count >= GOAL;

  // vanilla 의 click 핸들러와 같은 순서: 미리보기 루프를 떼고 다음 칸에 도장을 찍는다
  function applyStamp() {
    setLive(false);
    if (count >= GOAL) {
      return;
    }
    setCount(count + 1);
  }

  const cls = [styles.root, live ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage} style={vars}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <symbol id="seal" viewBox="0 0 256 256" fill="currentColor">
            <path d="M232,128c0,12.51-17.82,21.95-22.68,33.69-4.68,11.32,1.42,30.65-7.78,39.85s-28.53,3.1-39.85,7.78C150,214.18,140.5,232,128,232s-22-17.82-33.69-22.68c-11.32-4.68-30.65,1.42-39.85-7.78s-3.1-28.53-7.78-39.85C41.82,150,24,140.5,24,128s17.82-22,22.68-33.69C51.36,83,45.26,63.66,54.46,54.46S83,51.36,94.31,46.68C106.05,41.82,115.5,24,128,24S150,41.82,161.69,46.68c11.32,4.68,30.65-1.42,39.85,7.78s3.1,28.53,7.78,39.85C214.18,106.05,232,115.5,232,128Z" opacity="0.2" />
            <path d="M225.86,102.82c-3.77-3.94-7.67-8-9.14-11.57-1.36-3.27-1.44-8.69-1.52-13.94-.15-9.76-.31-20.82-8-28.51s-18.75-7.85-28.51-8c-5.25-.08-10.67-.16-13.94-1.52-3.56-1.47-7.63-5.37-11.57-9.14C146.28,23.51,138.44,16,128,16s-18.27,7.51-25.18,14.14c-3.94,3.77-8,7.67-11.57,9.14C88,40.64,82.56,40.72,77.31,40.8c-9.76.15-20.82.31-28.51,8S41,67.55,40.8,77.31c-.08,5.25-.16,10.67-1.52,13.94-1.47,3.56-5.37,7.63-9.14,11.57C23.51,109.72,16,117.56,16,128s7.51,18.27,14.14,25.18c3.77,3.94,7.67,8,9.14,11.57,1.36,3.27,1.44,8.69,1.52,13.94.15,9.76.31,20.82,8,28.51s18.75,7.85,28.51,8c5.25.08,10.67.16,13.94,1.52,3.56,1.47,7.63,5.37,11.57,9.14C109.72,232.49,117.56,240,128,240s18.27-7.51,25.18-14.14c3.94-3.77,8-7.67,11.57-9.14,3.27-1.36,8.69-1.44,13.94-1.52,9.76-.15,20.82-.31,28.51-8s7.85-18.75,8-28.51c.08-5.25.16-10.67,1.52-13.94,1.47-3.56,5.37-7.63,9.14-11.57C232.49,146.28,240,138.44,240,128S232.49,109.73,225.86,102.82Zm-11.55,39.29c-4.79,5-9.75,10.17-12.38,16.52-2.52,6.1-2.63,13.07-2.73,19.82-.1,7-.21,14.33-3.32,17.43s-10.39,3.22-17.43,3.32c-6.75.1-13.72.21-19.82,2.73-6.35,2.63-11.52,7.59-16.52,12.38S132,224,128,224s-9.15-4.92-14.11-9.69-10.17-9.75-16.52-12.38c-6.1-2.52-13.07-2.63-19.82-2.73-7-.1-14.33-.21-17.43-3.32s-3.22-10.39-3.32-17.43c-.1-6.75-.21-13.72-2.73-19.82-2.63-6.35-7.59-11.52-12.38-16.52S32,132,32,128s4.92-9.15,9.69-14.11,9.75-10.17,12.38-16.52c2.52-6.1,2.63-13.07,2.73-19.82.1-7,.21-14.33,3.32-17.43S70.51,56.9,77.55,56.8c6.75-.1,13.72-.21,19.82-2.73,6.35-2.63,11.52-7.59,16.52-12.38S124,32,128,32s9.15,4.92,14.11,9.69,10.17,9.75,16.52,12.38c6.1,2.52,13.07,2.63,19.82,2.73,7,.1,14.33.21,17.43,3.32s3.22,10.39,3.32,17.43c.1,6.75.21,13.72,2.73,19.82,2.63,6.35,7.59,11.52,12.38,16.52S224,124,224,128,219.08,137.15,214.31,142.11ZM173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34Z" />
          </symbol>
          <symbol id="coffee" viewBox="0 0 256 256" fill="currentColor">
            <path d="M208,88v48a88,88,0,0,1-51.3,80H83.3A88,88,0,0,1,32,136V88Z" opacity="0.2" />
            <path d="M80,56V24a8,8,0,0,1,16,0V56a8,8,0,0,1-16,0Zm40,8a8,8,0,0,0,8-8V24a8,8,0,0,0-16,0V56A8,8,0,0,0,120,64Zm32,0a8,8,0,0,0,8-8V24a8,8,0,0,0-16,0V56A8,8,0,0,0,152,64Zm96,56v8a40,40,0,0,1-37.51,39.91,96.59,96.59,0,0,1-27,40.09H208a8,8,0,0,1,0,16H32a8,8,0,0,1,0-16H56.54A96.3,96.3,0,0,1,24,136V88a8,8,0,0,1,8-8H208A40,40,0,0,1,248,120ZM200,96H40v40a80.27,80.27,0,0,0,45.12,72h69.76A80.27,80.27,0,0,0,200,136Zm32,24a24,24,0,0,0-16-22.62V136a95.78,95.78,0,0,1-1.2,15A24,24,0,0,0,232,128Z" />
          </symbol>
        </defs>
      </svg>
      <div className={cls}>
        <div className={styles.card}>
          <div className={styles.head}>
            <p className={styles.title}>
              <svg className={styles.ico} aria-hidden="true"><use href="#coffee" /></svg>
              <span>커피 적립 카드</span>
            </p>
            <p className={styles.count}><span>적립</span> <b>{count}/{GOAL}</b></p>
          </div>
          <div
            className={styles.grid}
            role="progressbar"
            aria-label="적립 도장 진행"
            aria-valuemin={0}
            aria-valuemax={GOAL}
            aria-valuenow={count}
          >
            {SLOTS.map(function (i: number) {
              const idle = i >= count;
              const fresh = i >= START && i < count;
              const stampCls = [
                styles.stamp,
                styles.stampIn,
                idle ? styles.stampIdle : "",
                fresh ? styles.stampNew : "",
              ].filter(Boolean).join(" ");
              return (
                <span className={styles.slot} key={i}>
                  <span className={stampCls}><svg aria-hidden="true"><use href="#seal" /></svg></span>
                </span>
              );
            })}
          </div>
          <div className={styles.foot}>
            <button type="button" className={styles.btn} onClick={applyStamp} disabled={full}>도장 찍기</button>
            <p className={`${styles.issued} ${full ? styles.issuedOn : ""}`} aria-live="polite">
              <span className={styles.issuedChip}>쿠폰 발급 완료</span>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
