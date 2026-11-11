// StackDepthPerspectiveSwipeCard — vanilla 판(run/422/demo/04-swipe-deck-precision-stack-depth-perspective/index.html) 의 React 포트.
// 값 하나: 뒤 카드 STACK_SIZE 장을 원근 투영(FOCAL)으로 축소·이동시켜 쌓고,
// 앞 카드가 빠지면 화가 알고리즘 순서(뒤→앞)로 한 칸씩 당겨 다시 그린다.
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./StackDepthPerspectiveSwipeCard.module.scss";

type Box<T> = { current: T };

const STACK_PERSPECTIVE_SCALE = 0.14;
const FOCAL = 260;
const STACK_SIZE = 3;
const RELEASE_VELOCITY_MIN = 0.4;
const EXIT_PX = 320;
const CYCLE_S = 2;
const CARDS = ["여행 메모", "아침 루틴", "저녁 산책", "주말 카페", "홈트 기록", "독서 목록", "메모 정리", "습관 체크"];

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

export default function StackDepthPerspectiveSwipeCard() {
  const frontRef = useRef<HTMLDivElement | null>(null);
  const peekRefs = useRef<Array<HTMLDivElement | null>>([null, null, null]) as Box<Array<HTMLDivElement | null>>;
  const posRef = useRef<number>(0) as Box<number>;
  const velRef = useRef<number>(0) as Box<number>;
  const phaseRef = useRef<string>("idle") as Box<string>;
  const exitDirRef = useRef<number>(1) as Box<number>;
  const draggingRef = useRef<boolean>(false) as Box<boolean>;
  const startXRef = useRef<number>(0) as Box<number>;
  const lastXRef = useRef<number>(0) as Box<number>;
  const lastTRef = useRef<number>(0) as Box<number>;
  const idxRef = useRef<number>(Math.floor(seedRand(41)() * CARDS.length)) as Box<number>;
  const frameRef = useRef<number>(0) as Box<number>;
  const [front, setFront] = useState(CARDS[idxRef.current % CARDS.length]);
  const [peeks, setPeeks] = useState<string[]>(
    Array.from({ length: STACK_SIZE }, (_, i) => CARDS[(idxRef.current + i + 1) % CARDS.length])
  );
  const [status, setStatus] = useState("대기 중");
  const [demo, setDemo] = useState(true);
  const [reduce, setReduce] = useState(false);

  function layoutStack(): void {
    for (let i = 0; i < STACK_SIZE; i += 1) {
      const el = peekRefs.current[i];
      if (!el) continue;
      const depth = i + 1;
      const scale = FOCAL / (FOCAL + depth * STACK_PERSPECTIVE_SCALE * FOCAL);
      const y = depth * STACK_PERSPECTIVE_SCALE * 22;
      el.style.transform = "translateY(" + y.toFixed(1) + "px) scale(" + scale.toFixed(3) + ")";
      el.style.zIndex = String(STACK_SIZE - i);
    }
  }

  useEffect(() => { layoutStack(); }, []);

  function render(): void {
    const card = frontRef.current;
    if (!card) return;
    const rot = clamp(posRef.current * 0.05, -16, 16);
    card.style.transform = "translateX(" + posRef.current.toFixed(1) + "px) rotate(" + rot.toFixed(2) + "deg)";
  }

  function nextCard(): void {
    idxRef.current += 1;
    setFront(CARDS[idxRef.current % CARDS.length]);
    setPeeks(Array.from({ length: STACK_SIZE }, (_, i) => CARDS[(idxRef.current + i + 1) % CARDS.length]));
    posRef.current = 0; velRef.current = 0; phaseRef.current = "idle";
    render();
    setStatus("대기 중");
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
    setDemo(false);
    posRef.current = dir * 40; render();
    judge(dir * (RELEASE_VELOCITY_MIN + 0.2), dir);
  }
  function onKeyDown(e: any): void {
    if (e.key === "ArrowRight") { e.preventDefault(); keyVerdict(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); keyVerdict(-1); }
  }

  function step(dt: number): void {
    if (phaseRef.current === "exit") {
      const speed = Math.max(Math.abs(velRef.current), RELEASE_VELOCITY_MIN * 1.4);
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
    if (t > 0.4 && t < 0.7 && synthPhaseRef.current === "wait") synthPhaseRef.current = "drop";
    if (synthPhaseRef.current === "drop") {
      const p = clamp((t - 0.4) / 0.3, 0, 1);
      posRef.current = p * 90; render();
      if (t >= 0.7) { synthPhaseRef.current = "afterDrop"; judge(RELEASE_VELOCITY_MIN + 0.3, 1); }
    }
    if (t > 1.3 && t < 1.6 && synthPhaseRef.current === "afterDrop") synthPhaseRef.current = "drop2";
    if (synthPhaseRef.current === "drop2") {
      const q = clamp((t - 1.3) / 0.3, 0, 1);
      posRef.current = -q * 90; render();
      if (t >= 1.6) { synthPhaseRef.current = "done"; judge(-(RELEASE_VELOCITY_MIN + 0.3), -1); }
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
      <div className={styles.sd}>
        <p className={styles.caption}>원근 투영으로 쌓이는 카드 더미</p>
        <div className={styles.scene}>
          {peeks.map((txt, i) => (
            <div
              className={styles.peek}
              key={i}
              ref={(el: HTMLDivElement | null) => { peekRefs.current[i] = el; }}
              aria-hidden="true"
            >
              <p className={styles.label}>{txt}</p>
            </div>
          ))}
          <div
            className={styles.card}
            ref={frontRef}
            tabIndex={0}
            role="group"
            aria-roledescription="스와이프 카드"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onKeyDown={onKeyDown}
          >
            <p className={styles.label}>{front}</p>
          </div>
          <button className={styles.btnNope} type="button" aria-label="싫어요" onClick={() => keyVerdict(-1)}>✕</button>
          <button className={styles.btnLike} type="button" aria-label="좋아요" onClick={() => keyVerdict(1)}>♥</button>
        </div>
        <p className={styles.status} aria-live="polite">{status}</p>
      </div>
    </main>
  );
}
