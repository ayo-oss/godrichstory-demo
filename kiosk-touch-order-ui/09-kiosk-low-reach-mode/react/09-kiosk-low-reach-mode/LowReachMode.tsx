// LowReachMode — vanilla 판(run/298/demo/09-kiosk-low-reach-mode/index.html) 의 React 포트.
// 버튼 묶음이 화면 위쪽에서 아래쪽으로 통째로 내려앉고 글자가 한 단계 커진다.
// 앉은 눈높이에 맞추는 것이 목적이라 누르는 칸의 높이는 그대로 둔다 (글자만 커진다).
// 미리보기 루프(.isDemo)는 CSS 키프레임이고, 사람이 전환 버튼을 누르면 여기서 루프를 떼고
// isLow 클래스와 aria-pressed 를 뒤집는다 — 내려앉는 움직임은 그때부터 transition 이 맡는다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LowReachMode.module.scss";

export type LowReachModeProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

const FRAME_TITLE = "메뉴 고르기";
const TOGGLE_LABEL = "낮은 화면";
const MENU = ["주문 시작", "장바구니", "직원 호출"];

export default function LowReachMode({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: LowReachModeProps) {
  const [demo, setDemo] = useState(true);
  const [low, setLow] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // <button> 은 클릭과 Enter·Space 가 모두 click 으로 온다 — 키보드 경로를 따로 둘 필요가 없다
  function onToggle(): void {
    setDemo(false);
    setLow(!low);
  }

  const cls = [styles.root, demo ? styles.isDemo : "", low ? styles.isLow : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <div className={styles.frame}>
          <p className={styles.title}>{FRAME_TITLE}</p>
          <div className={styles.body}>
            <ul className={styles.group}>
              {MENU.map((item) => (
                <li key={item}>
                  <button type="button" className={styles.btn}><span className={styles.label}>{item}</span></button>
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.foot}>
            <button type="button" className={styles.toggle} aria-pressed={low ? "true" : "false"} onClick={onToggle}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true"><path d="M128,48a24,24,0,1,1-24-24A24,24,0,0,1,128,48Z" opacity="0.2"/><path d="M255.59,189.47a8,8,0,0,0-10.12-5.06l-17.42,5.81-28.9-57.8A8,8,0,0,0,192,128H112V104h56a8,8,0,0,0,0-16H112V79a32,32,0,1,0-16,0V89.81A72,72,0,0,0,112,232c33.52,0,63.69-22.71,71.75-54a8,8,0,1,0-15.5-4C162.09,198,137.91,216,112,216A56,56,0,0,1,96,106.34V136a8,8,0,0,0,8,8h83.05l29.79,59.58a8,8,0,0,0,9.69,4l24-8A8,8,0,0,0,255.59,189.47ZM88,48a16,16,0,1,1,16,16A16,16,0,0,1,88,48Z"/></svg>
              <span className={styles.toggleLabel}>{TOGGLE_LABEL}</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
