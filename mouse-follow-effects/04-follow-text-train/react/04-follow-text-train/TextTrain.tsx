// TextTrain — vanilla 판(run/079/demo/04-follow-text-train/index.html) 의 React 포트.
// 첫 글자는 커서를, 뒤 글자는 앞 글자를 lerp 로 쫓게 한다(계수 0.22 → 0.07) — 기차처럼 한 박자씩 밀려온다.
// 자리 계산·줄간격·reduce 동작은 vanilla 와 같은 값이다 (다시 타이핑하지 않는다).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TextTrain.module.scss";

export type TextTrainProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// 전역 DOM 타입에 기대지 않는다 — 포인터 이벤트에서 실제로 읽는 것만 적는다
type PtrEvt = { clientX: number; clientY: number };

const FIELD_LABEL = "안녕하세요 글자가 커서를 쫓아 한 박자씩 밀려오는 그림";
const HINT = "마우스를 움직이면 글자들이 줄지어 따라옵니다";
const CHARS = ["안", "녕", "하", "세", "요"];
// 첫 글자는 커서를, 나머지는 앞 글자를 쫓는다 — 계수가 뒤로 갈수록 작아져 기차처럼 밀린다
const FOLLOW = [0.22, 0.16, 0.12, 0.09, 0.07];

// lerp: 매 프레임 남은 거리의 일부만 더 가는 선형 보간
function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}

export default function TextTrain({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#17141a",
}: TextTrainProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement>;
  const charRef = useRef<(HTMLSpanElement | null)[]>(new Array(CHARS.length).fill(null)) as Box<(HTMLSpanElement | null)[]>;
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function setChar(index: number) {
    return (el: HTMLSpanElement | null): void => {
      charRef.current[index] = el;
    };
  }

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const target = { x: 0, y: 0 };
    let spots = CHARS.map(() => ({ x: 0, y: 0 }));

    function home(): void {
      // 글자들은 처음에 가로로 늘어서 있다 — .is-demo 를 뗀 정적 상태의 모습
      const r = field.getBoundingClientRect();
      const gap = Math.min(44, (r.width - 60) / (CHARS.length - 1));
      const startX = r.width / 2 - gap * (CHARS.length - 1) / 2;
      target.x = r.width / 2;
      target.y = r.height / 2;
      spots = CHARS.map((_, i) => ({ x: startX + gap * i, y: r.height / 2 + 26 }));
    }

    function setTarget(cx: number, cy: number): void {
      const r = field.getBoundingClientRect();
      target.x = cx - r.left;
      target.y = cy - r.top;
    }

    function draw(): void {
      for (let i = 0; i < spots.length; i++) {
        const ch = charRef.current[i];
        if (ch) ch.style.transform = "translate3d(" + (spots[i].x - 14) + "px," + (spots[i].y - 20) + "px,0)";
      }
    }

    function tick(): void {
      spots[0].x = lerp(spots[0].x, target.x, FOLLOW[0]);
      spots[0].y = lerp(spots[0].y, target.y - 34, FOLLOW[0]);
      for (let i = 1; i < spots.length; i++) {
        spots[i].x = lerp(spots[i].x, spots[i - 1].x, FOLLOW[i]);
        spots[i].y = lerp(spots[i].y, spots[i - 1].y + 8, FOLLOW[i]);
      }
      draw();
      raf = requestAnimationFrame(tick);
    }

    function onMove(event: PtrEvt): void {
      setDemo(false);
      setTarget(event.clientX, event.clientY);
      if (reduce) {
        // reduce 에서는 글자가 커서 뒤로 가로줄로 바로 붙는다
        for (let i = 0; i < spots.length; i++) {
          spots[i].x = target.x - i * 34;
          spots[i].y = target.y;
        }
        draw();
      }
    }
    function onDown(event: PtrEvt): void {
      setDemo(false);
      setTarget(event.clientX, event.clientY);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);

    let raf = 0;
    home();
    draw();
    if (!reduce) raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.root + (demo ? " " + styles.isDemo : "")} style={vars}>
        <div className={styles.field} ref={fieldRef} role="img" aria-label={FIELD_LABEL}>
          {CHARS.map((ch, i) => (
            <span className={styles.ch} key={i} ref={setChar(i)}>{ch}</span>
          ))}
        </div>
        <p className={styles.hint}>{HINT}</p>
      </div>
    </main>
  );
}
