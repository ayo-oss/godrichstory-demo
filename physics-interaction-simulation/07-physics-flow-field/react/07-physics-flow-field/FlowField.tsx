// FlowField — vanilla 판(run/292/demo/07-physics-flow-field/index.html) 의 React 포트.
// 커서의 이동 속도가 곧 바람 벡터다. 대시 36개가 모두 그 벡터로 조타(steer)되고 최고 속도는 190,
// 가장자리에서는 반대편으로 이어진다. 진행 방향으로 rotate 까지 맞춘다. 상수·식은 vanilla 와 같은 값이다.
// 자리는 결정적 난수(사인 곱셈법)로 뿌리므로 매번 같은 배치가 나온다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./FlowField.module.scss";

export type FlowFieldProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type PartVars = CSSProperties & { "--i"?: string; "--hx"?: string; "--hy"?: string; "--rx"?: string; "--ry"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// React 의 KeyboardEvent 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type KeyEvt = { key: string; preventDefault(): void };
type Part = { x: number; y: number; vx: number; vy: number; ang: number; seed: number };
type Seed = { hx: number; hy: number; rx: number; ry: number };

const N = 36;
const BLOW = 120; // 키보드 한 번의 바람 세기
const HINT = "마우스를 움직인 방향이 바람이 되어 대시 떼가 그 쪽으로 흘러갑니다";
const FIELD_LABEL = "흐름장 실험판";
const DIR_LABEL = "지금 바람";
const RESET_LABEL = "흩어놓기";
const DIRS = { e: "오른쪽", w: "왼쪽", s: "아래", n: "위", calm: "쉬는 중" };

function rnd(seed: number): number {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function WindIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 256 256" className={className} aria-hidden="true" fill="currentColor"><g><path d="M120 96a24 24 0 1 1 24-24a24 24 0 0 1-24 24m88-16a24 24 0 1 0 24 24a24 24 0 0 0-24-24m-56 80a24 24 0 1 0 24 24a24 24 0 0 0-24-24" opacity=".2"/><path d="M184 184a32 32 0 0 1-32 32c-13.7 0-26.95-8.93-31.5-21.22a8 8 0 0 1 15-5.56C137.74 195.27 145 200 152 200a16 16 0 0 0 0-32H40a8 8 0 0 1 0-16h112a32 32 0 0 1 32 32m-64-80a32 32 0 0 0 0-64c-13.7 0-26.95 8.93-31.5 21.22a8 8 0 0 0 15 5.56C105.74 60.73 113 56 120 56a16 16 0 0 1 0 32H24a8 8 0 0 0 0 16Zm88-32c-13.7 0-26.95 8.93-31.5 21.22a8 8 0 0 0 15 5.56C193.74 92.73 201 88 208 88a16 16 0 0 1 0 32H32a8 8 0 0 0 0 16h176a32 32 0 0 0 0-64"/></g></svg>
  );
}

function ResetIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 256 256" className={className} aria-hidden="true" fill="currentColor"><g><path d="M232 136a104 104 0 1 1-38.17-80.55L208 60v-4a8 8 0 0 1 16 0v34a8 8 0 0 1-8 8h-34a8 8 0 0 1 0-16h7.6l-8.89-7.4A88 88 0 1 0 216 136a8 8 0 0 1 16 0Z" opacity=".2"/><path d="M232 136a104 104 0 1 1-38.17-80.55L208 60v-4a8 8 0 0 1 16 0v34a8 8 0 0 1-8 8h-34a8 8 0 0 1 0-16h7.6l-8.89-7.4A88 88 0 1 0 216 136a8 8 0 0 1 16 0Z"/></g></svg>
  );
}

export default function FlowField({
  duration = 2000,
  easing = "linear",
  color = "#ffd23f",
}: FlowFieldProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const elsBox = useRef<Array<HTMLElement | null>>([]) as Box<Array<HTMLElement | null>>;
  const partsBox = useRef<Part[]>([]) as Box<Part[]>;
  const windBox = useRef({ x: 12, y: 0 }) as Box<{ x: number; y: number }>;
  const windUntilBox = useRef(0) as Box<number>;
  const prevBox = useRef<{ x: number; y: number } | null>(null) as Box<{ x: number; y: number } | null>;
  const lastBox = useRef(0) as Box<number>;
  const runningBox = useRef(false) as Box<boolean>;
  const frameBox = useRef(0) as Box<number>;
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [dir, setDir] = useState(DIRS.calm);
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // 대시를 판 안에 결정적 난수로 뿌린다 — 미리보기 궤도의 중심(hx·hy)과 반지름(rx·ry)도 여기서 나온다
  function scatter(): void {
    const field = fieldRef.current;
    if (!field) { return; }
    const w = field.clientWidth;
    const h = field.clientHeight;
    const parts = partsBox.current;
    if (!parts.length) {
      for (let i = 0; i < N; i++) {
        parts.push({ x: 0, y: 0, vx: 12, vy: 0, ang: 0, seed: i + 1 });
      }
    }
    const next: Seed[] = [];
    for (let j = 0; j < parts.length; j++) {
      const p = parts[j];
      p.x = (0.06 + rnd(p.seed) * 0.88) * w;
      p.y = (0.1 + rnd(p.seed + 60) * 0.8) * h;
      p.vx = 12;
      p.vy = 0;
      p.ang = 0;
      next.push({
        hx: p.x,
        hy: p.y,
        rx: 10 + rnd(p.seed + 7) * 26,
        ry: 6 + rnd(p.seed + 13) * 16,
      });
    }
    setSeeds(next);
  }

  function paint(): void {
    const parts = partsBox.current;
    const els = elsBox.current;
    for (let i = 0; i < parts.length; i++) {
      const el = els[i];
      if (!el) { continue; }
      const p = parts[i];
      el.style.transform =
        "translate(" + p.x.toFixed(1) + "px, " + p.y.toFixed(1) + "px) rotate(" + p.ang.toFixed(1) + "deg)";
    }
  }

  function dirName(): string {
    const wind = windBox.current;
    const ax = Math.abs(wind.x);
    const ay = Math.abs(wind.y);
    if (ax < 8 && ay < 8) { return DIRS.calm; }
    if (ax > ay * 1.2) { return wind.x > 0 ? DIRS.e : DIRS.w; }
    if (ay > ax * 1.2) { return wind.y > 0 ? DIRS.s : DIRS.n; }
    return wind.x > 0 ? DIRS.e : DIRS.w;
  }

  function wake(): boolean {
    setDemo(false);
    if (reduced()) { paint(); return false; }
    if (!runningBox.current) {
      runningBox.current = true;
      lastBox.current = performance.now();
      frameBox.current = requestAnimationFrame(step);
    }
    return true;
  }

  function step(now: number): void {
    const field = fieldRef.current;
    if (!field) { runningBox.current = false; return; }
    const dt = Math.min((now - lastBox.current) / 1000, 0.033);
    lastBox.current = now;
    const w = field.clientWidth;
    const h = field.clientHeight;
    const gust = now - windUntilBox.current < 900; // 최근 입력 바람이 살아 있는 동안 조타력이 세다
    const parts = partsBox.current;
    const wind = windBox.current;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      // 흐름장: 모든 대시가 같은 방향으로 조타된다 — 힘은 커서 속도에서 온다
      p.vx += (wind.x - p.vx) * (gust ? 2.4 : 0.4) * dt;
      p.vy += (wind.y - p.vy) * (gust ? 2.4 : 0.4) * dt;
      const sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (sp > 190) { p.vx *= 190 / sp; p.vy *= 190 / sp; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.ang = (Math.atan2(p.vy, p.vx) * 180) / Math.PI;
      // 가장자리에서 반대편으로 돌아온다 — 흐름장의 공간이 잇달아 이어진 셈이다
      if (p.x > w + 8) { p.x = -8; } else if (p.x < -8) { p.x = w + 8; }
      if (p.y > h + 8) { p.y = -8; } else if (p.y < -8) { p.y = h + 8; }
    }
    const name = dirName();
    setDir(function (prev: string) { return prev === name ? prev : name; });
    paint();
    frameBox.current = requestAnimationFrame(step);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    const field = fieldRef.current;
    if (!field) { return; }
    const r = field.getBoundingClientRect();
    const x = event.clientX - r.left;
    const y = event.clientY - r.top;
    const prev = prevBox.current;
    if (prev) {
      const dx = x - prev.x;
      const dy = y - prev.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) {
        windBox.current.x = dx * 9;
        windBox.current.y = dy * 9;
        windUntilBox.current = performance.now();
        wake();
      }
    }
    prevBox.current = { x: x, y: y };
  }

  function onKeyDown(event: KeyEvt): void {
    const wind = windBox.current;
    if (event.key === "ArrowLeft") { wind.x = -BLOW; wind.y = 0; }
    else if (event.key === "ArrowRight") { wind.x = BLOW; wind.y = 0; }
    else if (event.key === "ArrowUp") { wind.x = 0; wind.y = -BLOW; }
    else if (event.key === "ArrowDown") { wind.x = 0; wind.y = BLOW; }
    else { return; }
    event.preventDefault();
    windUntilBox.current = performance.now();
    wake();
  }

  function onReset(): void {
    windBox.current.x = 12;
    windBox.current.y = 0;
    scatter();
  }

  useEffect(() => {
    scatter();
    const onResize = (): void => { scatter(); paint(); };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frameBox.current);
    };
  }, []);

  // 대시가 새로 뿌려진 뒤에 현재 자리를 한 번 칠한다
  useEffect(() => { paint(); }, [seeds]);

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <p className={styles.hint}><WindIcon className={styles.ico} /><span>{HINT}</span></p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onPointerMove={onPointerMove}
          onKeyDown={onKeyDown}
        >
          <span aria-hidden="true">
            {seeds.map((seed, i) => (
              <i
                key={i}
                className={styles.part}
                ref={(el: HTMLElement | null) => { elsBox.current[i] = el; }}
                style={{
                  "--i": String(i),
                  "--hx": seed.hx.toFixed(1) + "px",
                  "--hy": seed.hy.toFixed(1) + "px",
                  "--rx": seed.rx.toFixed(1) + "px",
                  "--ry": seed.ry.toFixed(1) + "px",
                } as PartVars}
              />
            ))}
          </span>
        </div>
        <div className={styles.bar}>
          <p className={styles.dir}>
            <span className={styles.dirLabel}>{DIR_LABEL}</span>
            <b className={styles.dirBox}>
              <span className={styles.dirVal}>{dir}</span>
              <span className={styles.dirLoop} aria-hidden="true"><i>{DIRS.e}</i><i>{DIRS.w}</i></span>
            </b>
          </p>
          <button className={styles.reset} type="button" onClick={onReset}>
            <ResetIcon className={styles.ico} /><span>{RESET_LABEL}</span>
          </button>
        </div>
      </div>
    </main>
  );
}
