// UndoReverseInterpSwipeCard — vanilla 판(run/422/demo/06-swipe-deck-precision-undo-reverse-interp/index.html) 의 React 포트.
// 값 하나: 드래그·퇴장 중 PATH_SAMPLE_MS 간격으로 {t,x} 경로를 기록해 두고,
// "되돌리기" 를 누르면 그 경로를 시간 역순으로 선형보간(sampleReverse)해 그대로 되감는다.
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./UndoReverseInterpSwipeCard.module.scss";

type Box<T> = { current: T };
type Sample = { t: number; x: number };

const PATH_SAMPLE_MS = 40;
const RELEASE_VELOCITY_MIN = 0.4;
const EXIT_PX = 320;
const UNDO_DURATION_MS = 420;
const CYCLE_S = 2;
const CARDS = ["독서 목록", "여행 메모", "아침 루틴", "저녁 산책", "주말 카페", "홈트 기록"];

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
function sampleReverse(path: Sample[], u: number): number {
  if (path.length === 0) return 0;
  if (path.length === 1) return path[0].x;
  const t0 = path[0].t;
  const t1 = path[path.length - 1].t;
  const span = t1 - t0;
  const targetT = t1 - clamp(u, 0, 1) * span;
  for (let i = 0; i < path.length - 1; i += 1) {
    const a = path[i];
    const b = path[i + 1];
    if (targetT >= a.t && targetT <= b.t) {
      const frac = b.t === a.t ? 0 : (targetT - a.t) / (b.t - a.t);
      return a.x + (b.x - a.x) * frac;
    }
  }
  return path[0].x;
}

export default function UndoReverseInterpSwipeCard() {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const posRef = useRef<number>(0) as Box<number>;
  const velRef = useRef<number>(0) as Box<number>;
  const phaseRef = useRef<string>("idle") as Box<string>;
  const exitDirRef = useRef<number>(1) as Box<number>;
  const draggingRef = useRef<boolean>(false) as Box<boolean>;
  const startXRef = useRef<number>(0) as Box<number>;
  const lastXRef = useRef<number>(0) as Box<number>;
  const lastTRef = useRef<number>(0) as Box<number>;
  const lastSampleTRef = useRef<number>(0) as Box<number>;
  const pathRef = useRef<Sample[]>([]) as Box<Sample[]>;
  const savedPathRef = useRef<Sample[]>([]) as Box<Sample[]>;
  const prevIdxRef = useRef<number>(0) as Box<number>;
  const undoStartRef = useRef<number>(0) as Box<number>;
  const idxRef = useRef<number>(Math.floor(seedRand(61)() * CARDS.length)) as Box<number>;
  const frameRef = useRef<number>(0) as Box<number>;
  const [label, setLabel] = useState(CARDS[idxRef.current % CARDS.length]);
  const [status, setStatus] = useState("대기 중");
  const [canUndo, setCanUndo] = useState(false);
  const [demo, setDemo] = useState(true);
  const [reduce, setReduce] = useState(false);

  function render(): void {
    const card = cardRef.current;
    if (!card) return;
    const rot = clamp(posRef.current * 0.05, -16, 16);
    card.style.transform = "translateX(" + posRef.current.toFixed(1) + "px) rotate(" + rot.toFixed(2) + "deg)";
  }

  function recordSample(now: number): void {
    if (now - lastSampleTRef.current < PATH_SAMPLE_MS) return;
    lastSampleTRef.current = now;
    pathRef.current.push({ t: now, x: posRef.current });
  }

  function nextCard(keepPath: boolean): void {
    prevIdxRef.current = idxRef.current;
    if (keepPath) savedPathRef.current = pathRef.current.slice();
    idxRef.current += 1;
    setLabel(CARDS[idxRef.current % CARDS.length]);
    posRef.current = 0; velRef.current = 0; phaseRef.current = "idle"; pathRef.current = [];
    render();
    setStatus("대기 중");
    setCanUndo(keepPath && savedPathRef.current.length > 1);
  }

  function judge(velocity: number, dir: number): void {
    setDemo(false);
    const flung = Math.abs(velocity) >= RELEASE_VELOCITY_MIN;
    if (reduce) {
      if (flung) {
        const now = performance.now();
        pathRef.current = [{ t: now - 200, x: 0 }, { t: now, x: dir * EXIT_PX }];
        setStatus(dir > 0 ? "좋아요 처리됨" : "싫어요 처리됨");
        nextCard(true);
      } else {
        posRef.current = 0; render(); setStatus("제자리로 돌아옴"); phaseRef.current = "idle"; pathRef.current = [];
      }
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
    startXRef.current = clientX; lastXRef.current = clientX; lastTRef.current = performance.now(); velRef.current = 0;
    pathRef.current = [{ t: performance.now(), x: 0 }];
    lastSampleTRef.current = performance.now();
  }
  function moveDrag(clientX: number): void {
    if (!draggingRef.current) return;
    const now = performance.now();
    const dt = Math.max(now - lastTRef.current, 1);
    velRef.current = (clientX - lastXRef.current) / dt;
    lastXRef.current = clientX; lastTRef.current = now;
    posRef.current = clientX - startXRef.current;
    render();
    recordSample(now);
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
    setDemo(false);
    const now = performance.now();
    pathRef.current = [{ t: now - 160, x: 0 }, { t: now, x: dir * 40 }];
    posRef.current = dir * 40; render();
    judge(dir * (RELEASE_VELOCITY_MIN + 0.2), dir);
  }
  function onKeyDown(e: any): void {
    if (e.key === "ArrowRight") { e.preventDefault(); keyVerdict(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); keyVerdict(-1); }
  }

  function startUndo(): void {
    if (savedPathRef.current.length < 2) return;
    setDemo(false);
    if (reduce) {
      posRef.current = savedPathRef.current[0].x; render();
      idxRef.current = prevIdxRef.current;
      setLabel(CARDS[idxRef.current % CARDS.length]);
      phaseRef.current = "idle";
      savedPathRef.current = [];
      setCanUndo(false);
      setStatus("되돌림");
      return;
    }
    phaseRef.current = "undo"; setCanUndo(false);
    undoStartRef.current = performance.now();
    setStatus("경로를 거꾸로 재생해 되돌리는 중");
  }

  function step(dt: number, now: number): void {
    if (phaseRef.current === "exit") {
      const speed = Math.max(Math.abs(velRef.current), RELEASE_VELOCITY_MIN * 1.4);
      posRef.current += exitDirRef.current * speed * dt;
      render();
      recordSample(now);
      if (Math.abs(posRef.current) > EXIT_PX) nextCard(true);
    } else if (phaseRef.current === "settle") {
      posRef.current += (0 - posRef.current) * 0.22;
      render();
      if (Math.abs(posRef.current) < 0.5) { posRef.current = 0; phaseRef.current = "idle"; render(); pathRef.current = []; }
    } else if (phaseRef.current === "undo") {
      const u = clamp((now - undoStartRef.current) / UNDO_DURATION_MS, 0, 1);
      posRef.current = sampleReverse(savedPathRef.current, u);
      render();
      if (u >= 1) {
        idxRef.current = prevIdxRef.current;
        setLabel(CARDS[idxRef.current % CARDS.length]);
        posRef.current = 0; render();
        phaseRef.current = "idle";
        savedPathRef.current = [];
        setCanUndo(false);
        setStatus("되돌림");
      }
    }
  }

  function synth(t: number, synthPhaseRef: Box<string>): void {
    if (t > 0.35 && t < 0.65 && synthPhaseRef.current === "wait") synthPhaseRef.current = "swipe";
    if (synthPhaseRef.current === "swipe") {
      const p = clamp((t - 0.35) / 0.3, 0, 1);
      posRef.current = p * 110; render();
      recordSample(performance.now());
      if (t >= 0.65) { synthPhaseRef.current = "afterSwipe"; judge(RELEASE_VELOCITY_MIN + 0.3, 1); }
    }
    if (t > 1.3 && t < 1.55 && synthPhaseRef.current === "afterSwipe") { synthPhaseRef.current = "undoing"; startUndo(); }
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
      if (!reduce) step(dt, now);
      frameRef.current = requestAnimationFrame(loop);
    }
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [reduce, demo]);

  return (
    <main className={styles.stage}>
      <div className={styles.ur}>
        <p className={styles.caption}>기록한 경로를 거꾸로 되감는 되돌리기</p>
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
          <button className={styles.btnUndo} type="button" aria-label="되돌리기" disabled={!canUndo} onClick={startUndo}>↺</button>
          <button className={styles.btnLike} type="button" aria-label="좋아요" onClick={() => keyVerdict(1)}>♥</button>
        </div>
        <p className={styles.status} aria-live="polite">{status}</p>
      </div>
    </main>
  );
}
