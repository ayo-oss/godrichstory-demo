// InertiaBox — vanilla 판(run/292/demo/08-physics-inertia-box/index.html) 의 React 포트.
// 상자를 흔들면(가속 boxAX) 공에게는 -boxAX * 1.1 의 힘이 걸리고 벽에서 반발 0.7 로 튕긴다.
// 손을 떼면 상자 자체가 스프링(90, 감쇠 9)으로 중앙에 정렬된다. 상수·식은 vanilla 와 같은 값이다.
// 격자 미리보기(isDemo)는 module.scss 의 감쇠 흔들림 키프레임이 돌린다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./InertiaBox.module.scss";

export type InertiaBoxProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// React 의 KeyboardEvent 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type KeyEvt = { key: string; preventDefault(): void };
type Ball = { size: number; x: number; vx: number };

// 공 3개 — 크기와 상자 안 처음 x(상자 내부 좌표). 상자의 가속이 -a 로 공에게 들어온다
const SPEC: Array<{ cls: string; size: number; x: number }> = [
  { cls: "ballA", size: 24, x: 40 },
  { cls: "ballB", size: 18, x: 120 },
  { cls: "ballC", size: 14, x: 190 },
];
const HINT = "상자를 잡고 좌우로 흔들면 상자의 가속이 반대 힘이 되어 공이 굴러갑니다";
const FIELD_LABEL = "관성 실험판";
const RESET_LABEL = "바로 세우기";

function ShakeIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 256 256" className={className} aria-hidden="true" fill="currentColor"><g><path d="m232 128l-32 32H56l-32-32l32-32h144Z" opacity=".2"/><path d="m237.66 133.66l-32 32a8 8 0 0 1-11.32-11.32L212.69 136H43.31l18.35 18.34a8 8 0 0 1-11.32 11.32l-32-32a8 8 0 0 1 0-11.32l32-32a8 8 0 0 1 11.32 11.32L43.31 120h169.38l-18.35-18.34a8 8 0 0 1 11.32-11.32l32 32a8 8 0 0 1 0 11.32"/></g></svg>
  );
}

function ResetIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 256 256" className={className} aria-hidden="true" fill="currentColor"><g><path d="M232 136a104 104 0 1 1-38.17-80.55L208 60v-4a8 8 0 0 1 16 0v34a8 8 0 0 1-8 8h-34a8 8 0 0 1 0-16h7.6l-8.89-7.4A88 88 0 1 0 216 136a8 8 0 0 1 16 0Z" opacity=".2"/><path d="M232 136a104 104 0 1 1-38.17-80.55L208 60v-4a8 8 0 0 1 16 0v34a8 8 0 0 1-8 8h-34a8 8 0 0 1 0-16h7.6l-8.89-7.4A88 88 0 1 0 216 136a8 8 0 0 1 16 0Z"/></g></svg>
  );
}

export default function InertiaBox({
  duration = 2000,
  easing = "ease-in-out",
  color = "#ff4d1f",
}: InertiaBoxProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const elsBox = useRef<Array<HTMLElement | null>>([]) as Box<Array<HTMLElement | null>>;
  const ballsBox = useRef<Ball[]>([]) as Box<Ball[]>;
  const boxXBox = useRef(0) as Box<number>;
  const boxVXBox = useRef(0) as Box<number>;
  const boxAXBox = useRef(0) as Box<number>;
  const draggingBox = useRef(false) as Box<boolean>;
  const lastBox = useRef(0) as Box<number>;
  const runningBox = useRef(false) as Box<boolean>;
  const frameBox = useRef(0) as Box<number>;
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function innerW(): number {
    const box = boxRef.current;
    return box ? box.clientWidth : 340;
  }

  function floorY(size: number): number {
    const box = boxRef.current;
    return (box ? box.clientHeight : 128) - size;
  }

  function resetAll(): void {
    ballsBox.current = SPEC.map(function (s) { return { size: s.size, x: s.x, vx: 0 }; });
    boxXBox.current = 0;
    boxVXBox.current = 0;
    boxAXBox.current = 0;
    paint();
  }

  function paint(): void {
    const box = boxRef.current;
    if (box) {
      box.style.transform = "translate(" + boxXBox.current.toFixed(1) + "px, 0)";
    }
    const balls = ballsBox.current;
    const els = elsBox.current;
    for (let i = 0; i < balls.length; i++) {
      const el = els[i];
      if (!el) { continue; }
      const b = balls[i];
      el.style.transform = "translate(" + b.x.toFixed(1) + "px, " + floorY(b.size) + "px)";
    }
  }

  function step(now: number): void {
    const dt = Math.min((now - lastBox.current) / 1000, 0.033);
    lastBox.current = now;
    const inner = innerW();
    let allCalm = true;
    if (!draggingBox.current) {
      // 손을 뗀 뒤 상자는 스프링으로 중앙으로 돌아온다
      boxVXBox.current += (-90 * boxXBox.current - 9 * boxVXBox.current) * dt;
      boxXBox.current += boxVXBox.current * dt;
    }
    const balls = ballsBox.current;
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      // 관성: 상자 가속의 반대 방향 힘이 공에게 걸리고 벽에서는 반발로 튕긴다
      b.vx += -boxAXBox.current * 1.1 * dt;
      b.x += b.vx * dt;
      if (b.x < 0) { b.x = 0; if (Math.abs(b.vx) > 20) { b.vx = -b.vx * 0.7; } else { b.vx = 0; } }
      if (b.x > inner - b.size) {
        b.x = inner - b.size;
        if (Math.abs(b.vx) > 20) { b.vx = -b.vx * 0.7; } else { b.vx = 0; }
      }
      if (Math.abs(b.vx) > 1 || Math.abs(boxVXBox.current) > 2 || Math.abs(boxXBox.current) > 0.5) { allCalm = false; }
    }
    // 손을 떼고 있을 때 가속은 한 프레임짜리 충격이다 — 안 지우면 화살표 키로 준 힘이 영원히 남아
    // 공이 한쪽 벽에 붙고 allCalm 이 끝내 참이 안 돼 루프도 안 멎는다. 끄는 동안은 moveBox 가 매번 다시 넣는다
    if (!draggingBox.current) { boxAXBox.current = 0; }
    paint();
    if (allCalm && !draggingBox.current) { resetAll(); runningBox.current = false; return; }
    frameBox.current = requestAnimationFrame(step);
  }

  function wake(): boolean {
    setDemo(false);
    if (reduced()) { resetAll(); return false; }
    if (!runningBox.current) {
      runningBox.current = true;
      lastBox.current = performance.now();
      frameBox.current = requestAnimationFrame(step);
    }
    return true;
  }

  function moveBox(clientX: number): void {
    const field = fieldRef.current;
    if (!field) { return; }
    const r = field.getBoundingClientRect();
    const nx = Math.max(-44, Math.min(44, clientX - r.left - r.width / 2));
    boxAXBox.current = (nx - boxXBox.current) * 46; // 잡아당기는 힘 = 변위 비례 (흔듦의 가속원)
    boxXBox.current = nx;
    wake();
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    event.preventDefault();
    draggingBox.current = true;
    const box = boxRef.current;
    if (box) { box.setPointerCapture(event.pointerId); }
    moveBox(event.clientX);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    if (draggingBox.current) { moveBox(event.clientX); }
  }

  function onPointerUp(): void {
    draggingBox.current = false;
    boxAXBox.current = 0;
  }

  function onKeyDown(event: KeyEvt): void {
    if (event.key === "ArrowLeft") {
      boxAXBox.current = 2600;
      boxXBox.current = Math.max(-44, boxXBox.current - 12);
    } else if (event.key === "ArrowRight") {
      boxAXBox.current = -2600;
      boxXBox.current = Math.min(44, boxXBox.current + 12);
    } else { return; }
    event.preventDefault();
    wake();
  }

  function onReset(): void {
    resetAll();
    wake();
  }

  useEffect(() => {
    resetAll();
    const onResize = (): void => { resetAll(); };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frameBox.current);
    };
  }, []);

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <p className={styles.hint}><ShakeIcon className={styles.ico} /><span>{HINT}</span></p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onKeyDown={onKeyDown}
        >
          <div
            className={styles.box}
            ref={boxRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            {SPEC.map((spec, i) => (
              <span
                key={spec.cls}
                className={`${styles.ball} ${styles[spec.cls]}`}
                aria-hidden="true"
                ref={(el: HTMLElement | null) => { elsBox.current[i] = el; }}
              />
            ))}
          </div>
        </div>
        <div className={styles.bar}>
          <button className={styles.reset} type="button" onClick={onReset}>
            <ResetIcon className={styles.ico} /><span>{RESET_LABEL}</span>
          </button>
        </div>
      </div>
    </main>
  );
}
