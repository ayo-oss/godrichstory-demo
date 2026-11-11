// KeyboardFallbackSwipeCard — vanilla 판(run/422/demo/07-swipe-deck-precision-keyboard-fallback/index.html) 의 React 포트.
// 값 하나: 드래그·버튼·키보드 세 입력이 전부 같은 judge(strength, dir, releaseMin) 를 부른다.
// 화살표 키는 누르고 있는 동안 CHARGE_RATE 로 충전되고 떼면(release) CHARGE_RELEASE_MIN 기준으로 판정한다.
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./KeyboardFallbackSwipeCard.module.scss";

type Box<T> = { current: T };

const CHARGE_RATE = 1.6;
const CHARGE_DECAY = 3.2;
const CHARGE_RELEASE_MIN = 0.55;
const CHARGE_MAX = 1;
const DRAG_RELEASE_MIN = 0.38;
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

export default function KeyboardFallbackSwipeCard() {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const meterFillRef = useRef<HTMLDivElement | null>(null);
  const posRef = useRef<number>(0) as Box<number>;
  const velRef = useRef<number>(0) as Box<number>;
  const phaseRef = useRef<string>("idle") as Box<string>;
  const exitDirRef = useRef<number>(1) as Box<number>;
  const draggingRef = useRef<boolean>(false) as Box<boolean>;
  const startXRef = useRef<number>(0) as Box<number>;
  const lastXRef = useRef<number>(0) as Box<number>;
  const lastTRef = useRef<number>(0) as Box<number>;
  const chargeRef = useRef<number>(0) as Box<number>;
  const chargingDirRef = useRef<number>(0) as Box<number>;
  const idxRef = useRef<number>(Math.floor(seedRand(67)() * CARDS.length)) as Box<number>;
  const frameRef = useRef<number>(0) as Box<number>;
  const [label, setLabel] = useState(CARDS[idxRef.current % CARDS.length]);
  const [status, setStatus] = useState("대기 중 — 방향키를 누르고 있으면 충전됩니다");
  const [demo, setDemo] = useState(true);
  const [reduce, setReduce] = useState(false);

  function render(): void {
    const card = cardRef.current;
    if (!card) return;
    const rot = clamp(posRef.current * 0.05, -16, 16);
    card.style.transform = "translateX(" + posRef.current.toFixed(1) + "px) rotate(" + rot.toFixed(2) + "deg)";
  }
  function renderMeter(): void {
    const fill = meterFillRef.current;
    if (!fill) return;
    fill.style.width = (chargeRef.current * 100).toFixed(1) + "%";
  }

  function nextCard(): void {
    idxRef.current += 1;
    setLabel(CARDS[idxRef.current % CARDS.length]);
    posRef.current = 0; velRef.current = 0; phaseRef.current = "idle";
    render();
    setStatus("대기 중 — 방향키를 누르고 있으면 충전됩니다");
  }

  // 세 입력(드래그·버튼·키보드 충전)이 전부 이 함수 하나로 판정한다.
  function judge(strength: number, dir: number, releaseMin: number): void {
    setDemo(false);
    const flung = strength >= releaseMin;
    if (reduce) {
      if (flung) { setStatus(dir > 0 ? "좋아요 처리됨" : "싫어요 처리됨"); nextCard(); }
      else { posRef.current = 0; render(); setStatus("충전 부족 — 되돌아옴"); phaseRef.current = "idle"; }
      return;
    }
    if (flung) {
      phaseRef.current = "exit"; exitDirRef.current = dir;
      setStatus(dir > 0 ? "좋아요 처리됨" : "싫어요 처리됨");
    } else {
      phaseRef.current = "settle";
      setStatus("충전 부족 — 되돌아옴");
    }
  }

  function startDrag(clientX: number): void {
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
    judge(Math.abs(velRef.current), posRef.current >= 0 ? 1 : -1, DRAG_RELEASE_MIN);
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>): void {
    e.currentTarget.setPointerCapture(e.pointerId);
    startDrag(e.clientX);
  }
  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>): void { moveDrag(e.clientX); }
  function onPointerUp(): void { endDrag(); }

  function buttonVerdict(dir: number): void {
    setDemo(false);
    posRef.current = dir * 40; render();
    judge(1, dir, CHARGE_RELEASE_MIN);
  }

  function onKeyDown(e: any): void {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    setDemo(false);
    const dir = e.key === "ArrowRight" ? 1 : -1;
    if (chargingDirRef.current !== dir) { chargingDirRef.current = dir; }
  }
  function onKeyUp(e: any): void {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const dir = e.key === "ArrowRight" ? 1 : -1;
    if (chargingDirRef.current === dir) {
      const strength = chargeRef.current;
      chargingDirRef.current = 0;
      posRef.current = dir * 30 * strength; render();
      judge(strength, dir, CHARGE_RELEASE_MIN);
      chargeRef.current = 0; renderMeter();
    }
  }

  function step(dt: number): void {
    const dtS = dt / 1000;
    if (chargingDirRef.current !== 0 && phaseRef.current === "idle") {
      chargeRef.current = clamp(chargeRef.current + CHARGE_RATE * dtS, 0, CHARGE_MAX);
    } else if (chargeRef.current > 0) {
      chargeRef.current = clamp(chargeRef.current - CHARGE_DECAY * dtS, 0, CHARGE_MAX);
    }
    renderMeter();
    if (phaseRef.current === "exit") {
      const speed = Math.max(Math.abs(velRef.current), CHARGE_RELEASE_MIN * 1.2);
      posRef.current += exitDirRef.current * speed * dt;
      render();
      if (Math.abs(posRef.current) > EXIT_PX) nextCard();
    } else if (phaseRef.current === "settle") {
      posRef.current += (0 - posRef.current) * 0.22;
      render();
      if (Math.abs(posRef.current) < 0.5) { posRef.current = 0; phaseRef.current = "idle"; render(); }
    }
  }

  function synth(t: number, synthPhaseRef: Box<string>): void {
    if (t > 0.3 && t < 0.85 && synthPhaseRef.current === "wait") synthPhaseRef.current = "charge";
    if (synthPhaseRef.current === "charge") {
      const p = clamp((t - 0.3) / 0.55, 0, 1);
      chargeRef.current = p; renderMeter();
      if (t >= 0.85) { synthPhaseRef.current = "afterCharge"; judge(chargeRef.current, 1, CHARGE_RELEASE_MIN); chargeRef.current = 0; renderMeter(); }
    }
    if (t > 1.35 && t < 1.5 && synthPhaseRef.current === "afterCharge") synthPhaseRef.current = "tap";
    if (synthPhaseRef.current === "tap") { synthPhaseRef.current = "done"; buttonVerdict(-1); }
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
      <div className={styles.kf}>
        <p className={styles.caption}>충전해서 놓는 키보드 판정</p>
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
            onKeyUp={onKeyUp}
          >
            <p className={styles.label}>{label}</p>
          </div>
          <div className={styles.meter} aria-hidden="true">
            <div className={styles.meterFill} ref={meterFillRef} />
          </div>
          <button className={styles.btnNope} type="button" aria-label="싫어요" onClick={() => buttonVerdict(-1)}>✕</button>
          <button className={styles.btnLike} type="button" aria-label="좋아요" onClick={() => buttonVerdict(1)}>♥</button>
        </div>
        <p className={styles.status} aria-live="polite">{status}</p>
      </div>
    </main>
  );
}
