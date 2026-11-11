// TimeoutReturnHome — vanilla 판(run/298/demo/08-kiosk-timeout-return-home/index.html) 의 React 포트.
// 아무도 안 만지면 남은 시간 고리가 닳고 숫자가 한 칸씩 떨어진다.
// 미리보기 루프(.isDemo)는 CSS 키프레임이고 여기 카운트다운은 setInterval 이다. 둘은 별개 코드다 —
// 사람이 화면을 만지는 순간 루프를 떼고, 그때부터 보이는 값은 전부 이 코드가 놓는다.
// --sweep(고리 각도)과 --left(남은 초)는 짝 scss 에서 @property 에 inherits: false 로 등록했다.
// 상속을 끊었으니 값은 부모가 아니라 그 값을 쓰는 요소 자신에 놓는다 (고리에 --sweep, 숫자 줄에 --left).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TimeoutReturnHome.module.scss";

export type TimeoutReturnHomeProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};
type RingVars = CSSProperties & { "--sweep"?: string };
type NumsVars = CSSProperties & { "--left"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };

const TOTAL = 20;                               // 처음 남은 초. 고리 한 바퀴가 이 값이다
const TICK = 1000;                              // 1초마다 한 칸
const RING_LABEL = "남은 시간 {n}초";
const NOTE_IDLE = "화면을 누르면 이어서 주문합니다";
const NOTE_RESET = "고른 것을 지우고 첫 화면으로 돌아갔습니다";
const HOME_LABEL = "처음으로";
const UNIT = "초";
// 20 부터 0 까지 쌓아 둔 스물한 칸. 창 하나로 그중 한 칸만 들여다본다
const DIGITS: number[] = [];
for (let n = TOTAL; n >= 0; n--) DIGITS.push(n);

export default function TimeoutReturnHome({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#17141a",
}: TimeoutReturnHomeProps) {
  const leftRef = useRef<number>(TOTAL) as Box<number>;
  const [left, setLeft] = useState(TOTAL);
  const [note, setNote] = useState(NOTE_IDLE);
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const ringVars: RingVars = { "--sweep": `${360 * left / TOTAL}deg` };
  const numsVars: NumsVars = { "--left": String(left) };

  function reset(text: string): void {
    leftRef.current = TOTAL;
    setLeft(TOTAL);
    setNote(text);
  }

  function touch(): void {
    setDemo(false);                               // 사람이 만지면 미리보기 루프를 뗀다
    reset(NOTE_IDLE);
  }

  useEffect(() => {
    const id = setInterval(() => {
      const next = leftRef.current - 1;
      if (next <= 0) { reset(NOTE_RESET); return; }   // 다 닳으면 고른 것을 버리고 첫 화면 상태로
      leftRef.current = next;
      setLeft(next);
    }, TICK);
    document.addEventListener("pointerdown", touch);
    document.addEventListener("keydown", touch);
    return () => {
      clearInterval(id);
      document.removeEventListener("pointerdown", touch);
      document.removeEventListener("keydown", touch);
    };
  }, []);

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <div className={styles.top}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true"><path d="M216,136a88,88,0,1,1-88-88A88,88,0,0,1,216,136Z" opacity="0.2"/><path d="M128,40a96,96,0,1,0,96,96A96.11,96.11,0,0,0,128,40Zm0,176a80,80,0,1,1,80-80A80.09,80.09,0,0,1,128,216ZM173.66,90.34a8,8,0,0,1,0,11.32l-40,40a8,8,0,0,1-11.32-11.32l40-40A8,8,0,0,1,173.66,90.34ZM96,16a8,8,0,0,1,8-8h48a8,8,0,0,1,0,16H104A8,8,0,0,1,96,16Z"/></svg>
          <div className={styles.ring} role="img" aria-label={RING_LABEL.replace("{n}", String(left))} style={ringVars}>
            <div className={styles.face}>
              <span className={styles.win}>
                <span className={styles.nums} style={numsVars}>
                  {DIGITS.map((n) => (
                    <i className={styles.num} key={n}>{n}</i>
                  ))}
                </span>
              </span>
              <i className={styles.unit}>{UNIT}</i>
            </div>
          </div>
        </div>
        <p className={styles.note}>{note}</p>
        <button type="button" className={styles.home} onClick={() => reset(NOTE_RESET)}>{HOME_LABEL}</button>
      </div>
    </main>
  );
}
