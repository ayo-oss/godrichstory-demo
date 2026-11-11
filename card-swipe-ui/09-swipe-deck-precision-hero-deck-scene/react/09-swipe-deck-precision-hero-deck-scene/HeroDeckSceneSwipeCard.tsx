// HeroDeckSceneSwipeCard — vanilla 판(run/422/demo/09-swipe-deck-precision-hero-deck-scene/index.html) 의 React 포트.
// 01+03+04 를 한 장면에 합친 대표편: 회전은 목표각으로 매 프레임 보간(HERO_ROTATE_LERP_RATE),
// 놓았을 때 약하면 스프링 적분(SPRING_STIFFNESS·DAMPING)으로 되돌아오고,
// 뒤에는 원근 투영 스택(HERO_STACK_PERSPECTIVE_SCALE·FOCAL)이 쌓여 있다.
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./HeroDeckSceneSwipeCard.module.scss";

type Box<T> = { current: T };

const HERO_ROTATE_LERP_RATE = 0.22;
const ROTATE_MAX_DEG = 20;
const SPRING_STIFFNESS = 130;
const SPRING_DAMPING = 13;
const SPRING_FLING_VELOCITY_MIN = 0.42;
const HERO_STACK_PERSPECTIVE_SCALE = 0.11;
const FOCAL = 240;
const STACK_SIZE = 3;
const EXIT_PX = 320;
const CYCLE_S = 2;
const CARDS = ["주말 카페", "홈트 기록", "독서 목록", "여행 메모", "아침 루틴", "저녁 산책", "메모 정리", "습관 체크"];

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

export default function HeroDeckSceneSwipeCard() {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const peekRefs = useRef<Array<HTMLDivElement | null>>([null, null, null]) as Box<Array<HTMLDivElement | null>>;
  const posRef = useRef<number>(0) as Box<number>;
  const velRef = useRef<number>(0) as Box<number>;
  const rotRef = useRef<number>(0) as Box<number>;
  const phaseRef = useRef<string>("idle") as Box<string>;
  const exitDirRef = useRef<number>(1) as Box<number>;
  const draggingRef = useRef<boolean>(false) as Box<boolean>;
  const startXRef = useRef<number>(0) as Box<number>;
  const lastXRef = useRef<number>(0) as Box<number>;
  const lastTRef = useRef<number>(0) as Box<number>;
  const idxRef = useRef<number>(Math.floor(seedRand(83)() * CARDS.length)) as Box<number>;
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
      const scale = FOCAL / (FOCAL + depth * HERO_STACK_PERSPECTIVE_SCALE * FOCAL);
      const y = depth * HERO_STACK_PERSPECTIVE_SCALE * 20;
      el.style.transform = "translateY(" + y.toFixed(1) + "px) scale(" + scale.toFixed(3) + ")";
      el.style.zIndex = String(STACK_SIZE - i);
    }
  }
  useEffect(() => { layoutStack(); }, []);

  function render(): void {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = "translateX(" + posRef.current.toFixed(1) + "px) rotate(" + rotRef.current.toFixed(2) + "deg)";
  }

  function nextCard(): void {
    idxRef.current += 1;
    setFront(CARDS[idxRef.current % CARDS.length]);
    setPeeks(Array.from({ length: STACK_SIZE }, (_, i) => CARDS[(idxRef.current + i + 1) % CARDS.length]));
    posRef.current = 0; velRef.current = 0; rotRef.current = 0; phaseRef.current = "idle";
    render();
    setStatus("대기 중");
  }

  function judge(velocity: number, dir: number): void {
    setDemo(false);
    const flung = Math.abs(velocity) >= SPRING_FLING_VELOCITY_MIN;
    if (reduce) {
      if (flung) { setStatus(dir > 0 ? "좋아요 처리됨" : "싫어요 처리됨"); nextCard(); }
      else { posRef.current = 0; rotRef.current = 0; render(); setStatus("스프링으로 되돌아옴"); phaseRef.current = "idle"; }
      return;
    }
    if (flung) {
      phaseRef.current = "exit"; exitDirRef.current = dir;
      setStatus(dir > 0 ? "좋아요 처리됨" : "싫어요 처리됨");
    } else {
      phaseRef.current = "spring";
      velRef.current = velocity * 1000;
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

  function keyVerdict(dir: number): void {
    setDemo(false);
    posRef.current = dir * 70; render();
    judge(dir * (SPRING_FLING_VELOCITY_MIN + 0.4), dir);
  }
  function onKeyDown(e: any): void {
    if (e.key === "ArrowRight") { e.preventDefault(); keyVerdict(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); keyVerdict(-1); }
  }

  function integrateSpring(dt: number): void {
    const accel = SPRING_STIFFNESS * (0 - posRef.current) - SPRING_DAMPING * velRef.current;
    velRef.current += accel * dt;
    posRef.current += velRef.current * dt;
    if (Math.abs(posRef.current) < 0.4 && Math.abs(velRef.current) < 4) { posRef.current = 0; velRef.current = 0; phaseRef.current = "idle"; }
  }

  function step(dt: number): void {
    const dtS = Math.min(dt / 1000, 0.032);
    const targetRot = clamp(posRef.current * 0.09, -ROTATE_MAX_DEG, ROTATE_MAX_DEG);
    rotRef.current += (targetRot - rotRef.current) * HERO_ROTATE_LERP_RATE;
    if (phaseRef.current === "exit") {
      posRef.current += exitDirRef.current * Math.max(Math.abs(velRef.current) / 1000, SPRING_FLING_VELOCITY_MIN * 1.3) * dt;
      render();
      if (Math.abs(posRef.current) > EXIT_PX) nextCard();
    } else if (phaseRef.current === "spring") {
      integrateSpring(dtS);
      render();
    } else {
      render();
    }
  }

  function synth(t: number, synthPhaseRef: Box<string>): void {
    if (t > 0.4 && t < 0.65 && synthPhaseRef.current === "wait") synthPhaseRef.current = "pull";
    if (synthPhaseRef.current === "pull") {
      const p = clamp((t - 0.4) / 0.25, 0, 1);
      posRef.current = p * 65; render();
      if (t >= 0.65) { synthPhaseRef.current = "afterPull"; judge(0.09, 1); }
    }
    if (t > 1.3 && t < 1.55 && synthPhaseRef.current === "afterPull") synthPhaseRef.current = "throw";
    if (synthPhaseRef.current === "throw") {
      const q = clamp((t - 1.3) / 0.25, 0, 1);
      posRef.current = -q * 150; render();
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
      <div className={styles.hs}>
        <p className={styles.caption}>회전 보간 · 스프링 · 원근 스택을 합친 대표 장면</p>
        <div className={styles.scene}>
          {peeks.map((txt, i) => (
            <div className={styles.peek} key={i} ref={(el: HTMLDivElement | null) => { peekRefs.current[i] = el; }} aria-hidden="true">
              <p className={styles.label}>{txt}</p>
            </div>
          ))}
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
