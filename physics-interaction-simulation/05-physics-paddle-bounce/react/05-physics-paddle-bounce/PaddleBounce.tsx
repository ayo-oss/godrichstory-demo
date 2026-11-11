// PaddleBounce — vanilla 판(run/292/demo/05-physics-paddle-bounce/index.html) 의 React 포트.
// 공은 등속으로 날고 벽·패들·벽돌에 부딪히면 뚫은 변의 법선으로 속도 부호를 되돌린다.
// 패들은 맞은 칸(off) 에 따라 수평 성분이 SPEED×off×0.9 로 꺾인다. 값·수치는 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./PaddleBounce.module.scss";

export type PaddleBounceProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// React 의 KeyboardEvent 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type KeyEvt = { key: string; preventDefault(): void };
type Brick = { el: HTMLElement; r: number; c: number; alive: boolean };

// 벽돌 3×6 — 왼쪽 여백 22, 위 여백 24, 칸 60×14, 간격 4. 행 색은 CSS 클래스가 정한다.
// 격자의 원점은 여기 한 곳뿐이다 — 그리는 자리(laid)와 충돌 판정(step)이 같은 BX·BY 를 본다.
// 두 곳에 따로 적으면 위 여백만 옮기는 순간 공이 보이지 않는 띠에서 튕긴다
const COLS = 6;
const ROWS = 3;
const BX = 22;
const BY = 24;
const BW = 60;
const BH = 14;
const GAP = 4;
const PW = 68;
const PH = 10;
const SPEED = 240;
const JUMP = 30;   // 방향키 한 번에 옮기는 패들 거리
const FIELD_LABEL = "벽돌 게임판";
const SCORE_LABEL = "점수";   // 문구 사전이 en·ja 로 바꿔 줄 수 있게 상수 하나로 둔다
const CELLS: { r: number; c: number }[] = [];
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) CELLS.push({ r: r, c: c });
}

export default function PaddleBounce({
  duration = 2000,
  easing = "linear",
  color = "#ffd23f",
}: PaddleBounceProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const bricksBoxRef = useRef<HTMLDivElement | null>(null);
  const ballRef = useRef<HTMLSpanElement | null>(null);
  const paddleRef = useRef<HTMLSpanElement | null>(null);
  const bricksRef = useRef<Brick[]>([]) as Box<Brick[]>;
  const pxRef = useRef<number>(176) as Box<number>;
  const bxRef = useRef<number>(210) as Box<number>;
  const byRef = useRef<number>(150) as Box<number>;
  const vxRef = useRef<number>(SPEED * 0.66) as Box<number>;
  const vyRef = useRef<number>(-SPEED * 0.75) as Box<number>;
  const stuckRef = useRef<boolean>(true) as Box<boolean>;
  const scoreRef = useRef<number>(0) as Box<number>;
  const lastRef = useRef<number>(0) as Box<number>;
  const rafRef = useRef<number>(0) as Box<number>;
  const runningRef = useRef<boolean>(false) as Box<boolean>;
  const [score, setScore] = useState(0);
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function padY(): number {
    const field = fieldRef.current;
    return (field ? field.clientHeight : 176) - 18;
  }

  function scaled(n: number): number {
    const field = fieldRef.current;
    return field ? (n * field.clientWidth) / 424 : n;
  }

  function laid(): void {
    const bricks = bricksRef.current;
    for (let i = 0; i < bricks.length; i++) {
      const b = bricks[i];
      b.el.style.transform = "translate(" + scaled(BX + b.c * (BW + GAP)) + "px, " + (BY + b.r * (BH + GAP)) + "px)";
    }
  }

  function paint(): void {
    const paddle = paddleRef.current;
    const ball = ballRef.current;
    if (paddle) paddle.style.transform = "translate(" + pxRef.current + "px, " + padY() + "px)";
    if (ball) ball.style.transform = "translate(" + bxRef.current + "px, " + byRef.current + "px)";
  }

  function step(now: number): void {
    const field = fieldRef.current;
    if (!field) { runningRef.current = false; return; }
    const dt = Math.min((now - lastRef.current) / 1000, 0.033);
    lastRef.current = now;
    const w = field.clientWidth;
    const h = field.clientHeight;
    if (stuckRef.current) {
      bxRef.current = pxRef.current + PW / 2 - 6;
      byRef.current = padY() - 14;
      paint();
      rafRef.current = requestAnimationFrame(step);
      return;
    }
    bxRef.current += vxRef.current * dt;
    byRef.current += vyRef.current * dt;
    // 벽 반사 — 좌우와 천장
    if (bxRef.current < 0) { bxRef.current = 0; vxRef.current = Math.abs(vxRef.current); }
    if (bxRef.current > w - 12) { bxRef.current = w - 12; vxRef.current = -Math.abs(vxRef.current); }
    if (byRef.current < 0) { byRef.current = 0; vyRef.current = Math.abs(vyRef.current); }
    // 패들 반사 — 맞은 칸에 따라 수평 성분이 꺾인다 (법선 반사의 게임판 버전)
    const pyNow = padY();
    if (
      vyRef.current > 0 && byRef.current + 12 >= pyNow && byRef.current + 12 <= pyNow + PH &&
      bxRef.current + 12 > pxRef.current && bxRef.current < pxRef.current + PW
    ) {
      const off = (bxRef.current + 6 - (pxRef.current + PW / 2)) / (PW / 2);
      vxRef.current = SPEED * off * 0.9;
      vyRef.current = -Math.abs(vyRef.current);
      byRef.current = pyNow - 12;
    }
    // 벽돌 충돌 — 겹친 칸을 끄고 뚫은 변으로 반사한다
    const bricks = bricksRef.current;
    for (let i = 0; i < bricks.length; i++) {
      const b = bricks[i];
      if (!b.alive) continue;
      const bxx = scaled(BX + b.c * (BW + GAP));
      const byy = BY + b.r * (BH + GAP);
      if (bxRef.current + 12 > bxx && bxRef.current < bxx + scaled(BW) && byRef.current + 12 > byy && byRef.current < byy + BH) {
        b.alive = false;
        b.el.classList.add(styles.isHit);
        scoreRef.current += 1;
        setScore(scoreRef.current);
        const overX = bxRef.current + 6 - (bxx + scaled(BW) / 2);
        const overY = byRef.current + 6 - (byy + BH / 2);
        if (Math.abs(overX) > Math.abs(overY)) { vxRef.current = overX > 0 ? Math.abs(vxRef.current) : -Math.abs(vxRef.current); }
        else { vyRef.current = overY > 0 ? Math.abs(vyRef.current) : -Math.abs(vyRef.current); }
        break;
      }
    }
    // 공을 놓쳤으면 패들 위에 다시 얹는다
    if (byRef.current > h + 8) {
      stuckRef.current = true;
      bxRef.current = pxRef.current + PW / 2 - 6;
      byRef.current = padY() - 14;
    }
    paint();
    rafRef.current = requestAnimationFrame(step);
  }

  function wake(): void {
    setDemo(false);
    if (reduced()) {
      pxRef.current = 176;
      stuckRef.current = true;
      bxRef.current = pxRef.current + PW / 2 - 6;
      byRef.current = padY() - 14;
      paint();
      return;
    }
    if (!runningRef.current) {
      runningRef.current = true;
      lastRef.current = performance.now();
      rafRef.current = requestAnimationFrame(step);
    }
  }

  function movePaddle(x: number): void {
    const field = fieldRef.current;
    if (!field) return;
    pxRef.current = Math.max(0, Math.min(field.clientWidth - PW, x));
    if (!runningRef.current) wake();
  }

  function launchBall(): void {
    wake();
    stuckRef.current = false;
    vxRef.current = SPEED * 0.66;
    vyRef.current = -SPEED * 0.75;
  }

  function restart(): void {
    const bricks = bricksRef.current;
    for (let i = 0; i < bricks.length; i++) {
      bricks[i].alive = true;
      bricks[i].el.classList.remove(styles.isHit);
    }
    scoreRef.current = 0;
    setScore(0);
    stuckRef.current = true;
    pxRef.current = 176;
    wake();
  }

  useEffect(() => {
    const box = bricksBoxRef.current;
    if (box) {
      const nodes = box.querySelectorAll("i");
      const built: Brick[] = [];
      for (let n = 0; n < nodes.length; n++) {
        built.push({ el: nodes[n], r: CELLS[n].r, c: CELLS[n].c, alive: true });
      }
      bricksRef.current = built;
    }
    laid();
    paint();
    function onResize(): void { laid(); }
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    movePaddle(event.clientX - r.left - PW / 2);
  }

  function onKeyDown(event: KeyEvt): void {
    if (event.key === "ArrowLeft") movePaddle(pxRef.current - JUMP);
    else if (event.key === "ArrowRight") movePaddle(pxRef.current + JUMP);
    else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); launchBall(); }
    else return;
    event.preventDefault();
  }

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  function brickCls(r: number, c: number): string {
    const spot = styles["brickR" + r + "C" + c] || "";
    return [styles.brick, styles["brickR" + r] || "", spot].filter(Boolean).join(" ");
  }
  return (
    <main className={styles.stage}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <symbol id="ico-ball" viewBox="0 0 256 256" fill="currentColor"><g><path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2"/><path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24m0 192a88 88 0 1 1 88-88a88.1 88.1 0 0 1-88 88"/></g></symbol>
          <symbol id="ico-reset" viewBox="0 0 256 256" fill="currentColor"><g><path d="M232 136a104 104 0 1 1-38.17-80.55L208 60v-4a8 8 0 0 1 16 0v34a8 8 0 0 1-8 8h-34a8 8 0 0 1 0-16h7.6l-8.89-7.4A88 88 0 1 0 216 136a8 8 0 0 1 16 0Z" opacity=".2"/><path d="M232 136a104 104 0 1 1-38.17-80.55L208 60v-4a8 8 0 0 1 16 0v34a8 8 0 0 1-8 8h-34a8 8 0 0 1 0-16h7.6l-8.89-7.4A88 88 0 1 0 216 136a8 8 0 0 1 16 0Z"/></g></symbol>
        </defs>
      </svg>
      <div className={cls} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} aria-hidden="true"><use href="#ico-ball" /></svg>
          <span>패들이 마우스를 따라오고 공은 벽돌에 부딪힌 만큼 점수가 오릅니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onPointerMove={onPointerMove}
          onKeyDown={onKeyDown}
        >
          <p className={styles.score} aria-live="polite">
            <span className={styles.scoreVal}>{SCORE_LABEL} {score}</span>
            <span className={styles.scoreLoop} aria-hidden="true"><i>점수 0</i><i>점수 1</i><i>점수 2</i></span>
          </p>
          <div className={styles.bricks} ref={bricksBoxRef} aria-hidden="true">
            {CELLS.map((cell) => (
              <i key={`${cell.r}-${cell.c}`} className={brickCls(cell.r, cell.c)} />
            ))}
          </div>
          <span className={styles.ball} ref={ballRef} aria-hidden="true"></span>
          <span className={styles.paddle} ref={paddleRef} aria-hidden="true"></span>
        </div>
        <div className={styles.bar}>
          <button className={styles.launch} type="button" onClick={launchBall}>
            <svg className={styles.ico} aria-hidden="true"><use href="#ico-ball" /></svg><span>공 놓기</span>
          </button>
          <button className={styles.reset} type="button" onClick={restart}>
            <svg className={styles.ico} aria-hidden="true"><use href="#ico-reset" /></svg><span>처음으로</span>
          </button>
        </div>
      </div>
    </main>
  );
}
