// ConicRouletteSpin — vanilla 판(run/080/demo/08-conic-roulette-spin/index.html) 의 React 포트.
// 원판은 conic-gradient 하나, 회전은 transform: rotate 하나, 감속은 CSS transition-timing-function 이 맡는다.
// --spin 하나로 원판은 그만큼 돌고 라벨 글자는 그만큼 되돌아 돌아 언제나 수평으로 읽힌다.
// 각도 규약: conic-gradient 도 화살표도 위(12시)가 0deg 이고 시계 방향으로 큰다.
// 원판을 A 만큼 돌리면 화살표가 가리키는 칸의 원래 각도는 (-A) 를 360 으로 나눈 나머지다.
import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ConicRouletteSpin.module.scss";

export type ConicRouletteSpinProps = {
  duration?: number;
  easing?: string;
  accentColor?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string; "--easing"?: string; "--color"?: string; "--spin"?: string;
};
// React 제네릭 대신 로컬 타입 — 라벨 글자도 같은 transition 을 쓰므로 target 으로 걸러야 한다
type TransEvt = { propertyName: string; target: unknown; currentTarget: unknown };

const PRIZES = ["커피", "쿠키", "쿠폰", "스티커", "한번더", "꽝"];
const TITLE = "룰렛 뽑기";
const SPIN_LABEL = "돌리기";
const HELP = "버튼을 눌러 돌립니다";
const SPINNING = "돌리는 중";
const RESULT = "{n} 나왔어요!";
const GHOST_WIN = "커피 나왔어요!";
const SLICE = 360 / PRIZES.length;
const LABEL_CLASS = ["label1", "label2", "label3", "label4", "label5", "label6"];

export default function ConicRouletteSpin({
  duration = 2000,
  easing = "ease-out",
  accentColor = "#0a4fe8",
}: ConicRouletteSpinProps) {
  const [angle, setAngle] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(HELP);
  const [demo, setDemo] = useState(true);
  const busyRef = useRef(false);
  const vars: Vars = {
    "--duration": `${duration}ms`, "--easing": easing,
    "--color": accentColor, "--spin": `${angle}deg`,
  };

  function spin() {
    if (busyRef.current) { return; }
    busyRef.current = true;
    setDemo(false);
    setBusy(true);
    setMsg(SPINNING);
    const turns = 5 + Math.floor(Math.random() * 4);                    // 5~8 바퀴
    const idx = Math.floor(Math.random() * PRIZES.length);              // 멈출 칸
    const target = (360 - (idx * SLICE + SLICE / 2) + 360) % 360;       // 그 칸의 한가운데가 위로 오는 각도
    setAngle(angle + turns * 360 + (((target - (angle % 360)) + 360) % 360));
  }

  function onEnd(e: TransEvt) {
    if (e.target !== e.currentTarget || e.propertyName !== "transform") { return; }
    const at = ((-angle % 360) + 360) % 360;
    const i = Math.floor(at / SLICE) % PRIZES.length;
    setMsg(RESULT.replace("{n}", PRIZES[i]));
    busyRef.current = false;
    setBusy(false);
  }

  return (
    <main className={styles.stage}>
      <div className={[styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ")} style={vars}>
        <div className={styles.wheel}>
          <div className={styles.disc} onTransitionEnd={onEnd}>
            {PRIZES.map((name, i) => (
              <span key={name} className={`${styles.label} ${styles[LABEL_CLASS[i]]}`}>
                <span className={styles.labelText}>{name}</span>
              </span>
            ))}
          </div>
          <span className={styles.hub} aria-hidden="true" />
          <span className={styles.pointer} aria-hidden="true">
            <svg viewBox="0 0 256 256" focusable="false">
              <g fill="currentColor">
                <path d="m208 96l-80 80l-80-80Z" opacity=".2" />
                <path d="M215.39 92.94A8 8 0 0 0 208 88H48a8 8 0 0 0-5.66 13.66l80 80a8 8 0 0 0 11.32 0l80-80a8 8 0 0 0 1.73-8.72M128 164.69L67.31 104h121.38Z" />
              </g>
            </svg>
          </span>
        </div>

        <div className={styles.side}>
          <p className={styles.title}>{TITLE}</p>
          <button className={styles.spin} type="button" disabled={busy} onClick={spin}>{SPIN_LABEL}</button>
          <div className={styles.out}>
            <p className={styles.result} aria-live="polite">{msg}</p>
            <p className={`${styles.ghost} ${styles.ghostB}`} aria-hidden="true">{GHOST_WIN}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
