// SpringFollow — vanilla 판(run/292/demo/01-physics-spring-follow/index.html) 의 React 포트.
// 준암시적 오일러: 가속(강성 k = 강성값×60 으로 목표를 당기고 마찰 c = 감쇠값×1.5 로 깎는다)을 먼저 반영하고 위치를 옮긴다.
// 값·수치는 vanilla 와 같다. 사람이 판을 클릭하거나 방향키를 누르면 미리보기 루프를 떼고 진짜 적분 경로로 넘어간다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./SpringFollow.module.scss";

export type SpringFollowProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type GhostVars = CSSProperties & { "--g"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// React 의 KeyboardEvent 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type KeyEvt = { key: string; preventDefault(): void };
type InputEvt = { target: { value: string } };
type Point = { x: number; y: number };

const SIZE = 40;
const HOME: Point = { x: 24, y: 24 };
const JUMP = 24; // 방향키 한 번에 옮기는 목표 거리
const FIELD_LABEL = "스프링 실험판";

export default function SpringFollow({
  duration = 2000,
  easing = "linear",
  color = "#ffd23f",
}: SpringFollowProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const chipRef = useRef<HTMLSpanElement | null>(null);
  const ghostARef = useRef<HTMLSpanElement | null>(null);
  const ghostBRef = useRef<HTMLSpanElement | null>(null);
  const ghostCRef = useRef<HTMLSpanElement | null>(null);
  const ringHomeRef = useRef<HTMLSpanElement | null>(null);
  const ringAwayRef = useRef<HTMLSpanElement | null>(null);
  const posRef = useRef<Point>({ x: HOME.x, y: HOME.y }) as Box<Point>;
  const velRef = useRef<Point>({ x: 0, y: 0 }) as Box<Point>;
  const targetRef = useRef<Point>({ x: HOME.x, y: HOME.y }) as Box<Point>;
  const trailRef = useRef<Point[]>([
    { x: HOME.x, y: HOME.y },
    { x: HOME.x, y: HOME.y },
    { x: HOME.x, y: HOME.y },
  ]) as Box<Point[]>;
  const lastRef = useRef<number>(0) as Box<number>;
  const tickRef = useRef<number>(0) as Box<number>;   // 잔상을 두 프레임마다 밀기 위한 프레임 수
  const rafRef = useRef<number>(0) as Box<number>;
  const runningRef = useRef<boolean>(false) as Box<boolean>;
  const stiffRef = useRef<number>(3) as Box<number>;
  const dampRef = useRef<number>(8) as Box<number>;
  const [stiff, setStiff] = useState(3);
  const [damp, setDamp] = useState(8);
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function ghostEls(): (HTMLSpanElement | null)[] {
    return [ghostARef.current, ghostBRef.current, ghostCRef.current];
  }

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function clampTarget(t: Point): void {
    const field = fieldRef.current;
    if (!field) return;
    const w = field.clientWidth - SIZE;
    const h = field.clientHeight - SIZE;
    t.x = Math.max(0, Math.min(w, t.x));
    t.y = Math.max(0, Math.min(h, t.y));
  }

  function paint(): void {
    const pos = posRef.current;
    const target = targetRef.current;
    const chip = chipRef.current;
    if (chip) chip.style.transform = "translate(" + pos.x + "px, " + pos.y + "px)";
    const ghosts = ghostEls();
    for (let i = 0; i < ghosts.length; i++) {
      const g = ghosts[i];
      if (g) g.style.transform = "translate(" + trailRef.current[i].x + "px, " + trailRef.current[i].y + "px)";
    }
    const home = ringHomeRef.current;
    const away = ringAwayRef.current;
    if (home) {
      home.style.transform = "translate(" + HOME.x + "px, " + HOME.y + "px)";
      home.classList.toggle(styles.isOn, target.x === HOME.x && target.y === HOME.y);
    }
    if (away) {
      away.style.transform = "translate(" + target.x + "px, " + target.y + "px)";
      away.classList.toggle(styles.isOn, target.x !== HOME.x || target.y !== HOME.y);
    }
  }

  function step(now: number): void {
    // 준암시적 오일러: 가속을 먼저 반영하고 위치를 옮긴다. dt 는 프레임 간격(초)이다.
    const dt = Math.min((now - lastRef.current) / 1000, 0.033);
    lastRef.current = now;
    const pos = posRef.current;
    const vel = velRef.current;
    const target = targetRef.current;
    const k = stiffRef.current * 60;
    const c = dampRef.current * 1.5;
    vel.x += (k * (target.x - pos.x) - c * vel.x) * dt;
    vel.y += (k * (target.y - pos.y) - c * vel.y) * dt;
    pos.x += vel.x * dt;
    pos.y += vel.y * dt;
    tickRef.current++;
    if (tickRef.current % 2 === 0) {
      const trail = trailRef.current;
      trail[2] = trail[1];
      trail[1] = trail[0];
      trail[0] = { x: pos.x, y: pos.y };
    }
    paint();
    const settled =
      Math.abs(target.x - pos.x) < 0.5 && Math.abs(target.y - pos.y) < 0.5 &&
      Math.abs(vel.x) < 4 && Math.abs(vel.y) < 4;
    if (settled) {
      pos.x = target.x; pos.y = target.y; vel.x = 0; vel.y = 0;
      trailRef.current = [{ x: pos.x, y: pos.y }, { x: pos.x, y: pos.y }, { x: pos.x, y: pos.y }];
      paint();
      runningRef.current = false;
      return;
    }
    rafRef.current = requestAnimationFrame(step);
  }

  function go(t: Point): void {
    clampTarget(t);
    const target = targetRef.current;
    target.x = t.x;
    target.y = t.y;
    setDemo(false);
    if (reduced()) {
      // 사용자가 움직임을 줄였을 때는 진동 없이 목표에 바로 붙인다
      const pos = posRef.current;
      const vel = velRef.current;
      pos.x = target.x; pos.y = target.y; vel.x = 0; vel.y = 0;
      trailRef.current = [{ x: pos.x, y: pos.y }, { x: pos.x, y: pos.y }, { x: pos.x, y: pos.y }];
      paint();
      return;
    }
    if (!runningRef.current) {
      runningRef.current = true;
      lastRef.current = performance.now();
      rafRef.current = requestAnimationFrame(step);
    }
  }

  useEffect(() => {
    paint();
    function onResize(): void {
      clampTarget(targetRef.current);
      paint();
    }
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    go({ x: event.clientX - r.left - SIZE / 2, y: event.clientY - r.top - SIZE / 2 });
  }

  function onKeyDown(event: KeyEvt): void {
    const target = targetRef.current;
    const next: Point = { x: target.x, y: target.y };
    if (event.key === "ArrowLeft") next.x -= JUMP;
    else if (event.key === "ArrowRight") next.x += JUMP;
    else if (event.key === "ArrowUp") next.y -= JUMP;
    else if (event.key === "ArrowDown") next.y += JUMP;
    else return;
    event.preventDefault();
    go(next);
  }

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  const ghostVars = (g: number): GhostVars => ({ "--g": String(g) });
  return (
    <main className={styles.stage}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <symbol id="ico-target" viewBox="0 0 256 256" fill="currentColor"><g><path d="M213.66 201L201 213.66a8 8 0 0 1-11.31 0l-51.31-51.31a8 8 0 0 0-13 2.46l-17.82 46.41a8 8 0 0 1-14.85-.71L40.41 50.44a8 8 0 0 1 10-10l160.1 52.24a8 8 0 0 1 .71 14.85l-46.41 17.82a8 8 0 0 0-2.46 13l51.31 51.31a8 8 0 0 1 0 11.34" opacity=".2"/><path d="M88 24v-8a8 8 0 0 1 16 0v8a8 8 0 0 1-16 0m-72 80h8a8 8 0 0 0 0-16h-8a8 8 0 0 0 0 16m108.42-64.84a8 8 0 0 0 10.74-3.58l8-16a8 8 0 0 0-14.31-7.16l-8 16a8 8 0 0 0 3.57 10.74m-96 81.69l-16 8a8 8 0 0 0 7.16 14.31l16-8a8 8 0 1 0-7.16-14.31M219.31 184a16 16 0 0 1 0 22.63l-12.68 12.68a16 16 0 0 1-22.63 0L132.7 168L115 214.09c0 .1-.08.21-.14.32a8 8 0 0 1-14.68-1.6L40.41 50.44a8 8 0 0 1 10-10l160.1 52.24c.1 0 .21.08.32.14a8 8 0 0 1-1.21 15.27l-46.41 17.82Z"/></g></symbol>
          <symbol id="ico-reset" viewBox="0 0 256 256" fill="currentColor"><g><path d="M232 136a104 104 0 1 1-38.17-80.55L208 60v-4a8 8 0 0 1 16 0v34a8 8 0 0 1-8 8h-34a8 8 0 0 1 0-16h7.6l-8.89-7.4A88 88 0 1 0 216 136a8 8 0 0 1 16 0Z" opacity=".2"/><path d="M232 136a104 104 0 1 1-38.17-80.55L208 60v-4a8 8 0 0 1 16 0v34a8 8 0 0 1-8 8h-34a8 8 0 0 1 0-16h7.6l-8.89-7.4A88 88 0 1 0 216 136a8 8 0 0 1 16 0Z"/></g></symbol>
        </defs>
      </svg>
      <div className={cls} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} aria-hidden="true"><use href="#ico-target" /></svg>
          <span>판을 클릭하거나 방향키로 목표를 옮기면 칩이 스프링처럼 따라옵니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onKeyDown={onKeyDown}
        >
          <span className={`${styles.ring} ${styles.ringHome}`} ref={ringHomeRef} aria-hidden="true"></span>
          <span className={`${styles.ring} ${styles.ringAway}`} ref={ringAwayRef} aria-hidden="true"></span>
          <span className={`${styles.ghost} ${styles.ghostA}`} ref={ghostARef} style={ghostVars(0)} aria-hidden="true"></span>
          <span className={`${styles.ghost} ${styles.ghostB}`} ref={ghostBRef} style={ghostVars(1)} aria-hidden="true"></span>
          <span className={`${styles.ghost} ${styles.ghostC}`} ref={ghostCRef} style={ghostVars(2)} aria-hidden="true"></span>
          <span className={styles.chip} ref={chipRef} aria-hidden="true">
            <svg className={styles.chipIco} aria-hidden="true"><use href="#ico-target" /></svg>
          </span>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>강성
            <input
              type="range" min={1} max={6} step={1} value={stiff} aria-label="강성"
              onChange={(event: InputEvt) => { const v = Number(event.target.value); stiffRef.current = v; setStiff(v); }}
            />
            <b className={styles.val}>{stiff}</b>
          </label>
          <label className={styles.dial}>감쇠
            <input
              type="range" min={4} max={12} step={1} value={damp} aria-label="감쇠"
              onChange={(event: InputEvt) => { const v = Number(event.target.value); dampRef.current = v; setDamp(v); }}
            />
            <b className={styles.val}>{damp}</b>
          </label>
          <button className={styles.reset} type="button" onClick={() => go({ x: HOME.x, y: HOME.y })}>
            <svg className={styles.ico} aria-hidden="true"><use href="#ico-reset" /></svg><span>처음으로</span>
          </button>
        </div>
      </div>
    </main>
  );
}
