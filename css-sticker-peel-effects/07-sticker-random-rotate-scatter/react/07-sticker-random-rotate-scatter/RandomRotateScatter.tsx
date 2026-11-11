// RandomRotateScatter — vanilla 판(run/378/demo/07-sticker-random-rotate-scatter/index.html) 의
// React 포트. deterministic scatter (seeded, no Math.random) — 사인 해시(hash)로 씨앗값 하나에서
// 항상 같은 소수부를 뽑아 회전·이동값을 만든다. 고정된 SEEDS 배열만 순환한다.
import { useEffect, useRef } from "react";
import styles from "./RandomRotateScatter.module.scss";

type Box<T> = { current: T };

const SCATTER_ROTATE_RANGE = 30; // 변형: 10deg
const SCATTER_POS_RANGE = 22;
const LERP_RATE = 0.22;
const SEEDS = [3, 17, 41, 8, 26];
const STEP_MS = 700;

function hash(seed: number) {
  const v = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return v - Math.floor(v);
}

function layoutFor(seed: number) {
  const h1 = hash(seed);
  const h2 = hash(seed + 100);
  const h3 = hash(seed + 200);
  return {
    rot: (h1 * 2 - 1) * SCATTER_ROTATE_RANGE,
    dx: (h2 * 2 - 1) * SCATTER_POS_RANGE,
    dy: (h3 * 2 - 1) * SCATTER_POS_RANGE,
  };
}

export default function RandomRotateScatter() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const shuffleRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const chipARef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const chipBRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const chipCRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const chipDRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const chipERef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wrap = rootRef.current;
    const shuffleBtn = shuffleRef.current;
    const chips = [chipARef.current, chipBRef.current, chipCRef.current, chipDRef.current, chipERef.current];
    if (!wrap || !shuffleBtn || chips.some((c) => !c)) return;

    let isDemo = true;
    let round = 0;
    let targets = chips.map((_, i) => layoutFor(SEEDS[i] + round * 1000));
    const shown = chips.map(() => ({ rot: 0, dx: 0, dy: 0 }));

    function human() { if (isDemo) { wrap!.classList.remove(styles.isDemo); isDemo = false; } }
    function reshuffle() {
      round += 1;
      targets = chips.map((_, i) => layoutFor(SEEDS[i] + round * 1000));
    }
    function onShuffle() { human(); reshuffle(); }
    shuffleBtn.addEventListener("click", onShuffle);

    let last = 0;
    function autoAdvance(ts: number) {
      if (ts - last < STEP_MS) return;
      last = ts;
      reshuffle();
    }

    function loop(ts: number) {
      if (!last) last = ts;
      if (isDemo && !reduce) autoAdvance(ts);
      chips.forEach((chip, i) => {
        const t = targets[i], s = shown[i];
        if (reduce) { s.rot = t.rot; s.dx = t.dx; s.dy = t.dy; }
        else {
          s.rot += (t.rot - s.rot) * LERP_RATE;
          s.dx += (t.dx - s.dx) * LERP_RATE;
          s.dy += (t.dy - s.dy) * LERP_RATE;
        }
        chip!.style.transform = "translate(" + s.dx.toFixed(2) + "px, " + s.dy.toFixed(2) + "px) rotate(" + s.rot.toFixed(2) + "deg)";
      });
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      shuffleBtn!.removeEventListener("click", onShuffle);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.tray}>
          <span className={styles.chip + " " + styles.chipA} ref={chipARef} aria-hidden="true"></span>
          <span className={styles.chip + " " + styles.chipB} ref={chipBRef} aria-hidden="true"></span>
          <span className={styles.chip + " " + styles.chipC} ref={chipCRef} aria-hidden="true"></span>
          <span className={styles.chip + " " + styles.chipD} ref={chipDRef} aria-hidden="true"></span>
          <span className={styles.chip + " " + styles.chipE} ref={chipERef} aria-hidden="true"></span>
        </div>
        <button className={styles.shuffleBtn} ref={shuffleRef} type="button">다시 흩뿌리기</button>
      </div>
    </main>
  );
}
