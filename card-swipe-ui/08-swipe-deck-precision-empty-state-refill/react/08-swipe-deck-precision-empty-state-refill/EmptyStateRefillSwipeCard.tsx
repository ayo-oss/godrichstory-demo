// EmptyStateRefillSwipeCard — vanilla 판(run/422/demo/08-swipe-deck-precision-empty-state-refill/index.html) 의 React 포트.
// 값 하나: REFILL_COUNT 번 스와이프하면 빈 상태 패널이 뜨고, "다시 채우기" 를 누르면
// scale 에 스프링(강성·감쇠)을 적분해(integrateScale) 오버슛하며 카드 더미가 튀어 들어온다.
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./EmptyStateRefillSwipeCard.module.scss";

type Box<T> = { current: T };

const REFILL_COUNT = 3;
const REFILL_SPRING_STIFFNESS = 160;
const REFILL_SPRING_DAMPING = 12;
const RELEASE_VELOCITY_MIN = 0.4;
const EXIT_PX = 320;
const CYCLE_S = 2;
const CARDS = ["아침 루틴", "저녁 산책", "주말 카페", "홈트 기록", "독서 목록", "여행 메모"];

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

export default function EmptyStateRefillSwipeCard() {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const posRef = useRef<number>(0) as Box<number>;
  const velRef = useRef<number>(0) as Box<number>;
  const phaseRef = useRef<string>("idle") as Box<string>;
  const exitDirRef = useRef<number>(1) as Box<number>;
  const draggingRef = useRef<boolean>(false) as Box<boolean>;
  const startXRef = useRef<number>(0) as Box<number>;
  const lastXRef = useRef<number>(0) as Box<number>;
  const lastTRef = useRef<number>(0) as Box<number>;
  const swipeCountRef = useRef<number>(0) as Box<number>;
  const scaleRef = useRef<number>(1) as Box<number>;
  const scaleVelRef = useRef<number>(0) as Box<number>;
  const idxRef = useRef<number>(Math.floor(seedRand(71)() * CARDS.length)) as Box<number>;
  const frameRef = useRef<number>(0) as Box<number>;
  const [label, setLabel] = useState(CARDS[idxRef.current % CARDS.length]);
  const [status, setStatus] = useState("대기 중");
  const [empty, setEmpty] = useState(false);
  const [demo, setDemo] = useState(true);
  const [reduce, setReduce] = useState(false);

  function render(): void {
    const card = cardRef.current;
    if (!card) return;
    const rot = clamp(posRef.current * 0.05, -16, 16);
    card.style.transform = "translateX(" + posRef.current.toFixed(1) + "px) rotate(" + rot.toFixed(2) + "deg) scale(" + scaleRef.current.toFixed(3) + ")";
  }

  function nextCard(): void {
    idxRef.current += 1;
    swipeCountRef.current += 1;
    posRef.current = 0; velRef.current = 0; phaseRef.current = "idle";
    if (swipeCountRef.current >= REFILL_COUNT) {
      setEmpty(true);
      setStatus("카드가 소진됨 — 다시 채워 주세요");
      return;
    }
    setLabel(CARDS[idxRef.current % CARDS.length]);
    render();
    setStatus("대기 중");
  }

  function integrateScale(dt: number): boolean {
    const accel = REFILL_SPRING_STIFFNESS * (1 - scaleRef.current) - REFILL_SPRING_DAMPING * scaleVelRef.current;
    scaleVelRef.current += accel * dt;
    scaleRef.current += scaleVelRef.current * dt;
    if (Math.abs(1 - scaleRef.current) < 0.004 && Math.abs(scaleVelRef.current) < 0.06) {
      scaleRef.current = 1; scaleVelRef.current = 0;
      return true;
    }
    return false;
  }

  function refill(): void {
    setDemo(false);
    swipeCountRef.current = 0;
    idxRef.current += 1;
    setLabel(CARDS[idxRef.current % CARDS.length]);
    setEmpty(false);
    setStatus("다시 채워짐");
    if (reduce) { scaleRef.current = 1; scaleVelRef.current = 0; render(); phaseRef.current = "idle"; return; }
    scaleRef.current = 0.2; scaleVelRef.current = 0;
    phaseRef.current = "refilling";
    render();
  }

  function judge(velocity: number, dir: number): void {
    setDemo(false);
    const flung = Math.abs(velocity) >= RELEASE_VELOCITY_MIN;
    if (reduce) {
      if (flung) { setStatus(dir > 0 ? "좋아요 처리됨" : "싫어요 처리됨"); nextCard(); }
      else { posRef.current = 0; render(); setStatus("제자리로 돌아옴"); phaseRef.current = "idle"; }
      return;
    }
    if (flung) {
      phaseRef.current = "exit"; exitDirRef.current = dir;
      setStatus(dir > 0 ? "좋아요 처리됨" : "싫어요 처리됨");
    } else {
      phaseRef.current = "settle";
      setStatus("제자리로 돌아옴");
    }
  }

  function startDrag(clientX: number): void {
    if (empty) return;
    setDemo(false);
    draggingRef.current = true; phaseRef.current = "idle";
    startXRef.current = clientX; lastXRef.current = clientX; lastTRef.current = performance.now(); velRef.current = 0;
  }
  function moveDrag(clientX: number): void {
    if (!draggingRef.current) return;
    const now = performance.now();
    const dt = Math.max(now - lastTRef.current, 1);
    velRef.current = (clientX - lastXRef.current) / dt;
    lastXRef.current = clientX; lastTRef.current = now;
    posRef.current = clientX - startXRef.current;
    render();
  }
  function endDrag(): void {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    judge(velRef.current, posRef.current >= 0 ? 1 : -1);
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>): void {
    e.currentTarget.setPointerCapture(e.pointerId);
    startDrag(e.clientX);
  }
  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>): void { moveDrag(e.clientX); }
  function onPointerUp(): void { endDrag(); }

  function keyVerdict(dir: number): void {
    if (empty) return;
    setDemo(false);
    posRef.current = dir * 40; render();
    judge(dir * (RELEASE_VELOCITY_MIN + 0.2), dir);
  }
  function onKeyDown(e: any): void {
    if (e.key === "ArrowRight") { e.preventDefault(); keyVerdict(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); keyVerdict(-1); }
  }

  function step(dt: number): void {
    const dtS = Math.min(dt / 1000, 0.032);
    if (phaseRef.current === "exit") {
      const speed = Math.max(Math.abs(velRef.current), RELEASE_VELOCITY_MIN * 1.4);
      posRef.current += exitDirRef.current * speed * dt;
      render();
      if (Math.abs(posRef.current) > EXIT_PX) nextCard();
    } else if (phaseRef.current === "settle") {
      posRef.current += (0 - posRef.current) * 0.22;
      render();
      if (Math.abs(posRef.current) < 0.5) { posRef.current = 0; phaseRef.current = "idle"; render(); }
    } else if (phaseRef.current === "refilling") {
      const done = integrateScale(dtS);
      render();
      if (done) phaseRef.current = "idle";
    }
  }

  function synth(t: number, synthPhaseRef: Box<string>): void {
    if (t > 0.35 && t < 0.6 && synthPhaseRef.current === "wait") synthPhaseRef.current = "swipe1";
    if (synthPhaseRef.current === "swipe1") {
      const p = clamp((t - 0.35) / 0.25, 0, 1);
      posRef.current = p * 100; render();
      if (t >= 0.6) { synthPhaseRef.current = "after1"; judge(RELEASE_VELOCITY_MIN + 0.3, 1); }
    }
    if (t > 1.1 && synthPhaseRef.current === "after1" && empty) { synthPhaseRef.current = "refill"; refill(); }
    if (t < 0.2 && synthPhaseRef.current !== "wait" && synthPhaseRef.current !== "refill") synthPhaseRef.current = "wait";
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
  }, [reduce, demo, empty]);

  return (
    <main className={styles.stage}>
      <div className={styles.er}>
        <p className={styles.caption}>스프링으로 튀어 들어오는 다시 채우기</p>
        <div className={styles.scene}>
          {!empty && (
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
          )}
          {empty && (
            <div className={styles.empty}>
              <p className={styles.emptyText}>카드를 모두 봤어요</p>
              <button className={styles.refillBtn} type="button" onClick={refill}>다시 채우기</button>
            </div>
          )}
          {!empty && (
            <>
              <button className={styles.btnNope} type="button" aria-label="싫어요" onClick={() => keyVerdict(-1)}>✕</button>
              <button className={styles.btnLike} type="button" aria-label="좋아요" onClick={() => keyVerdict(1)}>♥</button>
            </>
          )}
        </div>
        <p className={styles.status} aria-live="polite">{status}</p>
      </div>
    </main>
  );
}
