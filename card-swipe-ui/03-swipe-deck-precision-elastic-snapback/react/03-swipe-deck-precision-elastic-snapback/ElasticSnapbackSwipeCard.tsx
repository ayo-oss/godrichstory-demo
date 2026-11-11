// ElasticSnapbackSwipeCard — vanilla 판(run/422/demo/03-swipe-deck-precision-elastic-snapback/index.html) 의 React 포트.
// 변형 3: SWIPE_STACK_DEPTH_SCALE 를 뒤 카드 한 장에 실재시킨다. 값 하나: 해제 속도가
// SPRING_FLING_VELOCITY_MIN 에 못 미치면 스프링(강성·감쇠)을 적분해 오버슛하며 되돌아온다.
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./ElasticSnapbackSwipeCard.module.scss";

type Box<T> = { current: T };

const SWIPE_STACK_DEPTH_SCALE = 0.04;
const SPRING_FLING_VELOCITY_MIN = 0.5;
const SPRING_STIFFNESS = 120;
const SPRING_DAMPING = 14;
const EXIT_PX = 320;
const CYCLE_S = 2;
const CARDS = ["주말 카페", "홈트 기록", "독서 목록", "여행 메모", "아침 루틴", "저녁 산책"];

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

export default function ElasticSnapbackSwipeCard() {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const peekRef = useRef<HTMLDivElement | null>(null);
  const posRef = useRef<number>(0) as Box<number>;
  const velRef = useRef<number>(0) as Box<number>;
  const phaseRef = useRef<string>("idle") as Box<string>;
  const exitDirRef = useRef<number>(1) as Box<number>;
  const draggingRef = useRef<boolean>(false) as Box<boolean>;
  const startXRef = useRef<number>(0) as Box<number>;
  const lastXRef = useRef<number>(0) as Box<number>;
  const lastTRef = useRef<number>(0) as Box<number>;
  const idxRef = useRef<number>(Math.floor(seedRand(37)() * CARDS.length)) as Box<number>;
  const frameRef = useRef<number>(0) as Box<number>;
  const [label, setLabel] = useState(CARDS[idxRef.current % CARDS.length]);
  const [status, setStatus] = useState("대기 중");
  const [demo, setDemo] = useState(true);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const peek = peekRef.current;
    if (!peek) return;
    peek.style.transform = "translateY(" + (SWIPE_STACK_DEPTH_SCALE * 100).toFixed(1) + "%) scale(" + (1 - SWIPE_STACK_DEPTH_SCALE).toFixed(3) + ")";
  }, []);

  function render(): void {
    const card = cardRef.current;
    if (!card) return;
    const rot = clamp(posRef.current * 0.06, -18, 18);
    card.style.transform = "translateX(" + posRef.current.toFixed(1) + "px) rotate(" + rot.toFixed(2) + "deg)";
  }

  function nextCard(): void {
    idxRef.current += 1;
    setLabel(CARDS[idxRef.current % CARDS.length]);
    posRef.current = 0; velRef.current = 0; phaseRef.current = "idle";
    render();
    setStatus("대기 중");
  }

  function judge(velocityPxMs: number, dir: number): void {
    setDemo(false);
    const flung = Math.abs(velocityPxMs) >= SPRING_FLING_VELOCITY_MIN;
    if (reduce) {
      if (flung) { setStatus(dir > 0 ? "좋아요 처리됨" : "싫어요 처리됨"); nextCard(); }
      else { posRef.current = 0; velRef.current = 0; render(); setStatus("스프링으로 되돌아옴"); phaseRef.current = "idle"; }
      return;
    }
    if (flung) {
      phaseRef.current = "exit"; exitDirRef.current = dir;
      setStatus(dir > 0 ? "좋아요 처리됨" : "싫어요 처리됨");
    } else {
      phaseRef.current = "spring";
      velRef.current = velocityPxMs * 1000;
      setStatus("스프링으로 되돌아옴");
    }
  }

  function startDrag(clientX: number): void {
    setDemo(false);
    draggingRef.current = true; phaseRef.current = "idle";
    startXRef.current = clientX; lastXRef.current = clientX; lastTRef.current = performance.now();
  }
  function moveDrag(clientX: number): void {
    if (!draggingRef.current) return;
    const now = performance.now();
    const dt = Math.max(now - lastTRef.current, 1);
    velRef.current = ((clientX - lastXRef.current) / dt) * 1000;
    lastXRef.current = clientX; lastTRef.current = now;
    posRef.current = clientX - startXRef.current;
    render();
  }
  function endDrag(): void {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    judge(velRef.current / 1000, posRef.current >= 0 ? 1 : -1);
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>): void {
    e.currentTarget.setPointerCapture(e.pointerId);
    startDrag(e.clientX);
  }
  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>): void { moveDrag(e.clientX); }
  function onPointerUp(): void { endDrag(); }

  function keyVerdict(dir: number, weak: boolean): void {
    setDemo(false);
    posRef.current = dir * (weak ? 34 : 70); render();
    judge(dir * (weak ? 0.1 : SPRING_FLING_VELOCITY_MIN + 0.4), dir);
  }
  function onKeyDown(e: any): void {
    if (e.key === "ArrowRight") { e.preventDefault(); keyVerdict(1, false); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); keyVerdict(-1, false); }
  }

  function integrate(dt: number): void {
    const accel = SPRING_STIFFNESS * (0 - posRef.current) - SPRING_DAMPING * velRef.current;
    velRef.current += accel * dt;
    posRef.current += velRef.current * dt;
    if (Math.abs(posRef.current) < 0.4 && Math.abs(velRef.current) < 4) { posRef.current = 0; velRef.current = 0; phaseRef.current = "idle"; }
  }

  function step(dt: number): void {
    const dtS = Math.min(dt / 1000, 0.032);
    if (phaseRef.current === "exit") {
      posRef.current += exitDirRef.current * Math.max(Math.abs(velRef.current) / 1000, SPRING_FLING_VELOCITY_MIN * 1.3) * dt;
      render();
      if (Math.abs(posRef.current) > EXIT_PX) nextCard();
    } else if (phaseRef.current === "spring") {
      integrate(dtS);
      render();
    }
  }

  function synth(t: number, synthPhaseRef: Box<string>): void {
    if (t > 0.4 && t < 0.65 && synthPhaseRef.current === "wait") synthPhaseRef.current = "pull";
    if (synthPhaseRef.current === "pull") {
      const p = clamp((t - 0.4) / 0.25, 0, 1);
      posRef.current = p * 60; render();
      if (t >= 0.65) { synthPhaseRef.current = "afterPull"; judge(0.08, 1); }
    }
    if (t > 1.3 && t < 1.55 && synthPhaseRef.current === "afterPull") synthPhaseRef.current = "throw";
    if (synthPhaseRef.current === "throw") {
      const q = clamp((t - 1.3) / 0.25, 0, 1);
      posRef.current = -q * 140; render();
      if (t >= 1.55) { synthPhaseRef.current = "done"; judge(-(SPRING_FLING_VELOCITY_MIN + 0.4), -1); }
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
      <div className={styles.es}>
        <p className={styles.caption}>스프링 오버슛으로 되돌아오는 카드</p>
        <div className={styles.scene}>
          <div className={styles.peek} ref={peekRef} aria-hidden="true" />
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
          </div>
          <button className={styles.btnNope} type="button" aria-label="싫어요" onClick={() => keyVerdict(-1, false)}>✕</button>
          <button className={styles.btnLike} type="button" aria-label="좋아요" onClick={() => keyVerdict(1, false)}>♥</button>
        </div>
        <p className={styles.status} aria-live="polite">{status}</p>
      </div>
    </main>
  );
}
