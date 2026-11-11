// CassetteEject — vanilla 판(run/013/demo/09-skeuo-cassette-eject) 의 React 포트.
// 테이프·키·글월은 전부 out 상태 하나로 갈린다. 값·키프레임은 vanilla 와 같다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CassetteEject.module.scss";

export type CassetteEjectProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const LABEL_TITLE = "MIX 90";
const LABEL_SIDE = "SIDE A";
const KEY_TEXT = "이젝트";
const STATE_IN = "테이프를 넣었습니다";
const STATE_OUT = "테이프를 꺼냈습니다";

export default function CassetteEject({
  duration = 220,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#ffffff",
}: CassetteEjectProps) {
  const [out, setOut] = useState(false);
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function toggle() {
    setDemo(false);
    setOut(!out);
  }

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");

  return (
    <main className={styles.stage}>
      <div className={cls} data-out={out ? "true" : "false"} style={vars}>
        <div className={styles.deck}>
          <div className={styles.bay}>
            <div className={styles.tape}>
              <div className={styles.label}><b>{LABEL_TITLE}</b><span>{LABEL_SIDE}</span></div>
              <span className={`${styles.reel} ${styles.reelL}`} aria-hidden="true"></span>
              <span className={`${styles.reel} ${styles.reelR}`} aria-hidden="true"></span>
              <span className={styles.mouth} aria-hidden="true"></span>
            </div>
          </div>
          <div className={styles.panel}>
            <span className={styles.vents} aria-hidden="true"></span>
            <button className={styles.key} type="button" aria-pressed={out} onClick={toggle}>
              <svg className={styles.ejectIco} viewBox="0 0 256 256" aria-hidden="true" fill="currentColor"><g><path d="M216 168v24a8 8 0 0 1-8 8H48a8 8 0 0 1-8-8v-24a8 8 0 0 1 8-8h160a8 8 0 0 1 8 8M48.23 128h159.54c7.16 0 10.89-8.27 6-13.37l-73.74-77.5a16.76 16.76 0 0 0-24.14 0l-73.74 77.5c-4.81 5.1-1.08 13.37 6.08 13.37" opacity=".2"/><path d="M208 152H48a16 16 0 0 0-16 16v24a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16v-24a16 16 0 0 0-16-16m0 40H48v-24h160ZM48.24 136h159.52a16.18 16.18 0 0 0 14.93-9.76a15.59 15.59 0 0 0-3.1-17.12l-73.73-77.51a24.76 24.76 0 0 0-35.72 0l-73.73 77.51a15.59 15.59 0 0 0-3.1 17.12A16.18 16.18 0 0 0 48.24 136m73.49-93.36a8.77 8.77 0 0 1 12.54 0L207.85 120H48.14Z"/></g></svg>
              <span>{KEY_TEXT}</span>
            </button>
          </div>
        </div>
        <p className={styles.status}>
          <span className={`${styles.state} ${styles.stateIn}`}>{STATE_IN}</span>
          <span className={`${styles.state} ${styles.stateOut}`}>{STATE_OUT}</span>
        </p>
      </div>
    </main>
  );
}
