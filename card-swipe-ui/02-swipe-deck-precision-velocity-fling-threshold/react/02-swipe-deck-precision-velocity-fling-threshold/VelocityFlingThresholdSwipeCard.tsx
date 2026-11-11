// VelocityFlingThresholdSwipeCard — vanilla 판(run/422/demo/02-swipe-deck-precision-velocity-fling-threshold/index.html) 의 React 포트.
// 값 하나: 놓는 순간 속도(px/ms) 가 FLING_VELOCITY_MIN 을 넘지 못하면 카드는 날아가지 않는다.
// 드래그 중에는 SWIPE_ROTATE_LERP_RATIO(px 당 도) 만큼 살짝 기운다.
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./VelocityFlingThresholdSwipeCard.module.scss";

type Box<T> = { current: T };

const SWIPE_ROTATE_LERP_RATIO = 0.05;
const ROTATE_MAX_DEG = 14;
const FLING_VELOCITY_MIN = 0.42;
const INERTIA_DECAY = 0.85;
const SETTLE_RATE = 0.2;
const EXIT_PX = 320;
const CYCLE_S = 2;
const CARDS = ["저녁 산책", "주말 카페", "홈트 기록", "독서 목록", "여행 메모", "아침 루틴"];

function seedRand(seed: number) {
  let s = seed >>> 0;
  return function (): number {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export default function VelocityFlingThresholdSwipeCard() {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const xRef = useRef<number>(0) as Box<number>;
  const vxRef = useRef<number>(0) as Box<number>;
  const phaseRef = useRef<string>("idle") as Box<string>;
  const exitDirRef = useRef<number>(1) as Box<number>;
  const draggingRef = useRef<boolean>(false) as Box<boolean>;
  const startXRef = useRef<number>(0) as Box<number>;
  const lastXRef = useRef<number>(0) as Box<number>;
  const lastTRef = useRef<number>(0) as Box<number>;
  const idxRef = useRef<number>(Math.floor(seedRand(23)() * CARDS.length)) as Box<number>;
  const frameRef = useRef<number>(0) as Box<number>;
  const [label, setLabel] = useState(CARDS[idxRef.current % CARDS.length]);
  const [hint, setHint] = useState("속도 0.00 px/ms");
  const [status, setStatus] = useState("대기 중");
  const [demo, setDemo] = useState(true);
  const [reduce, setReduce] = useState(false);

  function render(): void {
    const card = cardRef.current;
    if (!card) return;
    const rot = clamp(xRef.current * SWIPE_ROTATE_LERP_RATIO, -ROTATE_MAX_DEG, ROTATE_MAX_DEG);
    card.style.transform = "translateX(" + xRef.current.toFixed(1) + "px) rotate(" + rot.toFixed(2) + "deg)";
  }

  function nextCard(): void {
    idxRef.current += 1;
    setLabel(CARDS[idxRef.current % CARDS.length]);
    xRef.current = 0; vxRef.current = 0; phaseRef.current = "idle";
    render();
    setStatus("대기 중");
  }

  function judge(velocity: number, dir: number): void {
    setDemo(false);
    setHint("속도 " + Math.abs(velocity).toFixed(2) + " px/ms");
    const flung = Math.abs(velocity) >= FLING_VELOCITY_MIN;
    if (reduce) {
      if (flung) { setStatus(dir > 0 ? "좋아요 처리됨" : "싫어요 처리됨"); nextCard(); }
      else { xRef.current = 0; render(); setStatus("기준 속도 미달 — 되돌아옴"); phaseRef.current = "idle"; }
      return;
    }
    if (flung) {
      phaseRef.current = "exit"; exitDirRef.current = dir;
      setStatus(dir > 0 ? "좋아요 처리됨" : "싫어요 처리됨");
    } else {
      phaseRef.current = "settle";
      setStatus("기준 속도 미달 — 되돌아옴");
    }
  }

  function startDrag(clientX: number): void {
    setDemo(false);
    draggingRef.current = true;
    startXRef.current = clientX; lastXRef.current = clientX; lastTRef.current = performance.now(); vxRef.current = 0;
  }
  function moveDrag(clientX: number): void {
    if (!draggingRef.current) return;
    const now = performance.now();
    const dt = Math.max(now - lastTRef.current, 1);
    vxRef.current = (clientX - lastXRef.current) / dt;
    lastXRef.current = clientX; lastTRef.current = now;
    xRef.current = clientX - startXRef.current;
    render();
  }
  function endDrag(): void {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    judge(vxRef.current, xRef.current >= 0 ? 1 : -1);
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>): void {
    e.currentTarget.setPointerCapture(e.pointerId);
    startDrag(e.clientX);
  }
  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>): void { moveDrag(e.clientX); }
  function onPointerUp(): void { endDrag(); }

  function keyVerdict(dir: number): void {
    setDemo(false);
    xRef.current = dir * 40; render();
    judge(dir * (FLING_VELOCITY_MIN + 0.15), dir);
  }
  function onKeyDown(e: any): void {
    if (e.key === "ArrowRight") { e.preventDefault(); keyVerdict(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); keyVerdict(-1); }
  }

  function step(dt: number): void {
    if (phaseRef.current === "exit") {
      const speed = Math.max(Math.abs(vxRef.current), FLING_VELOCITY_MIN * 1.4);
      xRef.current += exitDirRef.current * speed * dt;
      render();
      if (Math.abs(xRef.current) > EXIT_PX) nextCard();
    } else if (phaseRef.current === "settle") {
      xRef.current += vxRef.current * dt;
      vxRef.current *= INERTIA_DECAY;
      xRef.current += (0 - xRef.current) * SETTLE_RATE;
      render();
      if (Math.abs(xRef.current) < 0.5 && Math.abs(vxRef.current) < 0.01) { xRef.current = 0; phaseRef.current = "idle"; render(); }
    }
  }

  function synth(t: number, synthPhaseRef: Box<string>): void {
    if (t > 0.45 && t < 0.7 && synthPhaseRef.current === "wait") synthPhaseRef.current = "weak";
    if (synthPhaseRef.current === "weak") {
      const p = clamp((t - 0.45) / 0.25, 0, 1);
      xRef.current = p * 30; render();
      if (t >= 0.7) { synthPhaseRef.current = "afterWeak"; judge(0.15, 1); }
    }
    if (t > 1.05 && t < 1.35 && synthPhaseRef.current === "afterWeak") synthPhaseRef.current = "strong";
    if (synthPhaseRef.current === "strong") {
      const q = clamp((t - 1.05) / 0.3, 0, 1);
      xRef.current = q * 130; render();
      if (t >= 1.35) { synthPhaseRef.current = "done"; judge(FLING_VELOCITY_MIN + 0.5, 1); }
    }
  }

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    let start = 0, lastNow = 0, prevT = 0;
    const synthPhaseRef: Box<string> = { current: "wait" };
    function loop(now: number): void {
      if (start === 0) { start = now; lastNow = now; }
      const dt = Math.min(now - lastNow, 48);
      lastNow = now;
      const t = ((now - start) / 1000) % CYCLE_S;
      if (t < prevT) synthPhaseRef.current = "wait";
      prevT = t;
      if (!reduce && demo) synth(t, synthPhaseRef);
      if (!reduce) step(dt);
      frameRef.current = requestAnimationFrame(loop);
    }
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [reduce, demo]);

  return (
    <main className={styles.stage}>
      <div className={styles.vf}>
        <p className={styles.caption}>놓는 속도로 갈리는 스와이프 판정</p>
        <div className={styles.scene}>
          <div
            className={styles.card}
            ref={cardRef}
            tabIndex={0}
            role="group"
            aria-roledescription="스와이프 카드"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onKeyDown={onKeyDown}
          >
            <p className={styles.label}>{label}</p>
            <p className={styles.hint}>{hint}</p>
          </div>
          <button className={styles.btnNope} type="button" aria-label="싫어요" onClick={() => keyVerdict(-1)}>✕</button>
          <button className={styles.btnLike} type="button" aria-label="좋아요" onClick={() => keyVerdict(1)}>♥</button>
        </div>
        <p className={styles.status} aria-live="polite">{status}</p>
      </div>
    </main>
  );
}
