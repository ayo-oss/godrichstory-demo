// DragRotateLerpSwipeCard — vanilla 판(run/422/demo/01-swipe-deck-precision-drag-rotate-lerp/index.html) 의 React 포트.
// 값 하나: 놓는 순간 속도(px/ms) 가 SWIPE_VELOCITY_THRESHOLD_PX_MS 를 넘는지로 스와이프를 판정한다.
// 드래그 중 각도는 카드 폭 대비 이동 비율(pctX)에 ROTATE_LERP_RATIO 를 곱해 정한다.
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./DragRotateLerpSwipeCard.module.scss";

type Box<T> = { current: T };

const SWIPE_VELOCITY_THRESHOLD_PX_MS = 0.3;
const ROTATE_LERP_RATIO = 0.55;
const ROTATE_MAX_DEG = 26;
const SETTLE_RATE = 0.24;
const EXIT_PCT = 165;
const CARD_WIDTH = 160;
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

export default function DragRotateLerpSwipeCard() {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const pctXRef = useRef<number>(0) as Box<number>;
  const vxRef = useRef<number>(0) as Box<number>;
  const phaseRef = useRef<string>("idle") as Box<string>;
  const exitDirRef = useRef<number>(1) as Box<number>;
  const draggingRef = useRef<boolean>(false) as Box<boolean>;
  const startXRef = useRef<number>(0) as Box<number>;
  const lastXRef = useRef<number>(0) as Box<number>;
  const lastTRef = useRef<number>(0) as Box<number>;
  const idxRef = useRef<number>(Math.floor(seedRand(11)() * CARDS.length)) as Box<number>;
  const frameRef = useRef<number>(0) as Box<number>;
  const [label, setLabel] = useState(CARDS[idxRef.current % CARDS.length]);
  const [status, setStatus] = useState("대기 중");
  const [demo, setDemo] = useState(true);
  const [reduce, setReduce] = useState(false);

  function render(): void {
    const card = cardRef.current;
    if (!card) return;
    const rot = clamp(pctXRef.current * ROTATE_LERP_RATIO, -ROTATE_MAX_DEG, ROTATE_MAX_DEG);
    const xPx = (pctXRef.current / 100) * CARD_WIDTH;
    card.style.transform = "translateX(" + xPx.toFixed(1) + "px) rotate(" + rot.toFixed(2) + "deg)";
  }

  function nextCard(): void {
    idxRef.current += 1;
    setLabel(CARDS[idxRef.current % CARDS.length]);
    pctXRef.current = 0; vxRef.current = 0; phaseRef.current = "idle";
    render();
    setStatus("대기 중");
  }

  function judge(velocity: number, dir: number): void {
    setDemo(false);
    const flung = Math.abs(velocity) >= SWIPE_VELOCITY_THRESHOLD_PX_MS;
    if (reduce) {
      if (flung) { setStatus(dir > 0 ? "좋아요 처리됨" : "싫어요 처리됨"); nextCard(); }
      else { pctXRef.current = 0; render(); setStatus("제자리로 돌아옴"); phaseRef.current = "idle"; }
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
    setDemo(false);
    draggingRef.current = true; phaseRef.current = "idle";
    startXRef.current = clientX; lastXRef.current = clientX; lastTRef.current = performance.now(); vxRef.current = 0;
  }
  function moveDrag(clientX: number): void {
    if (!draggingRef.current) return;
    const now = performance.now();
    const dt = Math.max(now - lastTRef.current, 1);
    vxRef.current = (clientX - lastXRef.current) / dt;
    lastXRef.current = clientX; lastTRef.current = now;
    pctXRef.current = ((clientX - startXRef.current) / CARD_WIDTH) * 100;
    render();
  }
  function endDrag(): void {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    judge(vxRef.current, pctXRef.current >= 0 ? 1 : -1);
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>): void {
    e.currentTarget.setPointerCapture(e.pointerId);
    startDrag(e.clientX);
  }
  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>): void { moveDrag(e.clientX); }
  function onPointerUp(): void { endDrag(); }

  function keyVerdict(dir: number): void {
    setDemo(false);
    pctXRef.current = dir * 40; render();
    judge(dir * (SWIPE_VELOCITY_THRESHOLD_PX_MS + 0.2), dir);
  }
  function onKeyDown(e: any): void {
    if (e.key === "ArrowRight") { e.preventDefault(); keyVerdict(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); keyVerdict(-1); }
  }

  function step(dt: number): void {
    if (phaseRef.current === "exit") {
      pctXRef.current += exitDirRef.current * Math.max(Math.abs(vxRef.current) * 100, SWIPE_VELOCITY_THRESHOLD_PX_MS * 140) * (dt / 6);
      render();
      if (Math.abs(pctXRef.current) > EXIT_PCT) nextCard();
    } else if (phaseRef.current === "settle") {
      pctXRef.current += (0 - pctXRef.current) * SETTLE_RATE;
      render();
      if (Math.abs(pctXRef.current) < 0.6) { pctXRef.current = 0; phaseRef.current = "idle"; render(); }
    }
  }

  function synth(t: number, synthPhaseRef: Box<string>): void {
    if (t > 0.5 && t < 0.85 && synthPhaseRef.current === "wait") synthPhaseRef.current = "dragLike";
    if (synthPhaseRef.current === "dragLike") {
      const p = clamp((t - 0.5) / 0.35, 0, 1);
      pctXRef.current = p * 70; render();
      if (t >= 0.85) { synthPhaseRef.current = "afterLike"; judge(SWIPE_VELOCITY_THRESHOLD_PX_MS + 0.35, 1); }
    }
    if (t > 1.25 && t < 1.55 && synthPhaseRef.current === "afterLike") synthPhaseRef.current = "dragWeak";
    if (synthPhaseRef.current === "dragWeak") {
      const q = clamp((t - 1.25) / 0.3, 0, 1);
      pctXRef.current = -q * 30; render();
      if (t >= 1.55) { synthPhaseRef.current = "done"; judge(0.05, -1); }
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
      <div className={styles.dr}>
        <p className={styles.caption}>드래그 비율에 회전을 곱하는 카드</p>
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
          </div>
          <button className={styles.btnNope} type="button" aria-label="싫어요" onClick={() => keyVerdict(-1)}>✕</button>
          <button className={styles.btnLike} type="button" aria-label="좋아요" onClick={() => keyVerdict(1)}>♥</button>
        </div>
        <p className={styles.status} aria-live="polite">{status}</p>
      </div>
    </main>
  );
}
