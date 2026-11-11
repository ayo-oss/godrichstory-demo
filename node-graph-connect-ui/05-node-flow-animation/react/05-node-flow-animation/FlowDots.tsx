import { useState } from "react";
import styles from "./FlowDots.module.scss";

export type FlowDotsProps = { duration?: number; easing?: string; color?: string };

/** 실행 중인 갈래. offset-path 의 path() 와 **글자 그대로 같은 문자열**이라 좌표계가 어긋날 수 없다 */
const RUN_WIRE = "M122,85 C176,85 224,132 278,132";
const IDLE_WIRE = "M122,85 C176,85 224,38 278,38";

export default function FlowDots({ duration = 2000, easing = "linear", color = "#4cd4a6" }: FlowDotsProps) {
  const [paused, setPaused] = useState(false);

  return (
    <main className={styles.stage}>
      <div
        className={`${styles.ng} ${paused ? styles.isPaused : ""}`}
        style={{ "--ng-duration": `${duration}ms`, "--ng-easing": easing, "--ng-color": color }}
      >
        <svg className={styles.canvas} viewBox="0 0 400 170" role="group" aria-label="실행 중인 갈래를 점으로 보여 주는 연결도">
          <path className={styles.wire} d={IDLE_WIRE} />
          <path className={`${styles.wire} ${styles.wireRun}`} d={RUN_WIRE} />

          <circle className={styles.ring} cx="278" cy="132" r="6" />

          <circle className={styles.dot} cx="0" cy="0" r="4.5" />
          <circle className={`${styles.dot} ${styles.dot2}`} cx="0" cy="0" r="4.5" />
          <circle className={`${styles.dot} ${styles.dot3}`} cx="0" cy="0" r="4.5" />

          <g className={styles.node}>
            <rect className={styles.box} x="14" y="59" width="108" height="52" rx="12" />
            <svg className={styles.ico} x="58" y="68" width="20" height="20" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M96,240l16-80L48,136,160,16,144,96l64,24Z" opacity="0.2" /><path d="M215.79,118.17a8,8,0,0,0-5-5.66L153.18,90.9l14.66-73.33a8,8,0,0,0-13.69-7l-112,120a8,8,0,0,0,3,13l57.63,21.61L88.16,238.43a8,8,0,0,0,13.69,7l112-120A8,8,0,0,0,215.79,118.17ZM109.37,214l10.47-52.38a8,8,0,0,0-5-9.06L62,132.71l84.62-90.66L136.16,94.43a8,8,0,0,0,5,9.06l52.8,19.8Z" /></svg>
            <text className={styles.label} x="68" y="103" textAnchor="middle">폼 접수</text>
            <circle className={styles.port} cx="122" cy="85" r="4.5" />
          </g>

          <g className={styles.node}>
            <rect className={styles.box} x="278" y="12" width="108" height="52" rx="12" />
            <svg className={styles.ico} x="322" y="21" width="20" height="20" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M221.9,61.38,152,136v58.65a8,8,0,0,1-3.56,6.66l-32,21.33A8,8,0,0,1,104,216V136L34.1,61.38A8,8,0,0,1,40,48H216A8,8,0,0,1,221.9,61.38Z" opacity="0.2" /><path d="M230.6,49.53A15.81,15.81,0,0,0,216,40H40A16,16,0,0,0,28.19,66.76l.08.09L96,139.17V216a16,16,0,0,0,24.87,13.32l32-21.34A16,16,0,0,0,160,194.66V139.17l67.74-72.32.08-.09A15.8,15.8,0,0,0,230.6,49.53ZM40,56h0Zm106.18,74.58A8,8,0,0,0,144,136v58.66L112,216V136a8,8,0,0,0-2.16-5.47L40,56H216Z" /></svg>
            <text className={styles.label} x="332" y="56" textAnchor="middle">걸러내기</text>
            <circle className={styles.port} cx="278" cy="38" r="4.5" />
          </g>

          <g className={styles.node}>
            <rect className={`${styles.box} ${styles.boxRun}`} x="278" y="106" width="108" height="52" rx="12" />
            <svg className={styles.ico} x="322" y="115" width="20" height="20" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M200,56H56A24,24,0,0,0,32,80V192a24,24,0,0,0,24,24H200a24,24,0,0,0,24-24V80A24,24,0,0,0,200,56ZM164,184H92a20,20,0,0,1,0-40h72a20,20,0,0,1,0,40Z" opacity="0.2" /><path d="M200,48H136V16a8,8,0,0,0-16,0V48H56A32,32,0,0,0,24,80V192a32,32,0,0,0,32,32H200a32,32,0,0,0,32-32V80A32,32,0,0,0,200,48Zm16,144a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V80A16,16,0,0,1,56,64H200a16,16,0,0,1,16,16ZM72,108a12,12,0,1,1,12,12A12,12,0,0,1,72,108Zm88,0a12,12,0,1,1,12,12A12,12,0,0,1,160,108Zm4,28H92a28,28,0,0,0,0,56h72a28,28,0,0,0,0-56Zm-24,16v24H116V152ZM80,164a12,12,0,0,1,12-12h8v24H92A12,12,0,0,1,80,164Zm84,12h-8V152h8a12,12,0,0,1,0,24Z" /></svg>
            <text className={styles.label} x="332" y="150" textAnchor="middle">AI 요약</text>
            <circle className={`${styles.port} ${styles.portRun}`} cx="278" cy="132" r="4.5" />
          </g>
        </svg>

        <div className={styles.bar}>
          <button type="button" className={styles.toggle} aria-pressed={paused} onClick={() => setPaused((v) => !v)}>
            {paused ? "흐름 재생" : "흐름 멈춤"}
          </button>
        </div>
      </div>
    </main>
  );
}
