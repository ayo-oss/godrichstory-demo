import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ScrollConsentGate.module.scss";

export type ScrollConsentGateProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--p"?: number;
};

const KEY = "gd-consent-08";
const LABEL = "Agree and continue";
const DONE = "Agreed";

const TERMS = [
  "This site uses only the cookies strictly needed to run the service.",
  "Analytics cookies collect visit counts and time on page anonymously.",
  "We use no advertising cookies and never sell your data to third parties.",
  "You can clear stored cookies at any time in your browser settings.",
  "Your choice lasts 12 months and can be changed from the footer link.",
  "Scroll to the end and the consent button below turns on.",
];

export default function ScrollConsentGate({
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: ScrollConsentGateProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [demo, setDemo] = useState(true);
  const [ready, setReady] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [p, setP] = useState(0);

  function onScroll() {
    const box = boxRef.current;
    if (!box) {
      return;
    }
    setDemo(false); // 사람이 스크롤하면 자동 루프를 끈다
    const max = box.scrollHeight - box.clientHeight;
    const next = max > 0 ? box.scrollTop / max : 1;
    setP(next < 1 ? next : 1);
    if (box.scrollTop + box.clientHeight >= box.scrollHeight - 4) {
      setReady(true);
    }
  }

  function agree() {
    setDemo(false);
    setAgreed(true);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* 무시 */
    }
  }

  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--p": p,
  };

  const label = agreed ? DONE : LABEL;

  return (
    <div
      className={`${styles.sg} ${demo ? styles.isDemo : ""} ${ready ? styles.isReady : ""}`}
      style={vars}
    >
      <div className={styles.bar} aria-hidden="true">
        <i className={styles.fill} />
      </div>

      <div className={styles.box} ref={boxRef} onScroll={onScroll}>
        <div className={styles.track}>
          {TERMS.map((t) => (
            <p key={t}>{t}</p>
          ))}
        </div>
      </div>

      <button type="button" className={styles.btn} disabled={!ready} onClick={agree}>
        <span className={styles.faceOff}>{label}</span>
        <span className={styles.faceOn} aria-hidden="true">
          {label}
        </span>
      </button>
    </div>
  );
}
