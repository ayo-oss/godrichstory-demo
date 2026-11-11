import { useEffect, useRef } from "react";
import styles from "./CaptchaSlot.module.scss";

// 캡차 위젯(08, 아이디어형) — 정답 칸(ANSWER)과 시간이 흐르며 자동으로 골라지는 칸(PICK_ORDER)을
// 매 프레임 다시 비교해 일치율(matchRatio)을 구하고, 그 값이 기준(MATCH_THRESHOLD)을
// 넘어야 확인 버튼을 실제로 활성화한다. 실제 클릭 리스너는 넣지 않는다 — 자동 선택 시뮬레이션만.
// 실키·실서버 요청 없음.
const ANSWER = [1, 3, 5, 7];
const PICK_ORDER = [1, 4, 3, 7, 5]; // 일부러 오답 4 를 포함한 고정 순서
const PICK_MS = 350; // 5 * 350 = 1750
const MATCH_THRESHOLD = 1; // 100% 일치해야 활성화
const CYCLE_MS = 2000;
const TILE_INDEXES = [0, 1, 2, 3, 4, 5, 6, 7, 8];

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function selectedSoFar(t: number) {
  const count = clamp(Math.floor(t / PICK_MS), 0, PICK_ORDER.length);
  return PICK_ORDER.slice(0, count);
}

function matchRatioOf(selected: number[]) {
  let hit = 0;
  for (let i = 0; i < ANSWER.length; i++) {
    if (selected.indexOf(ANSWER[i]) !== -1) hit += 1;
  }
  return clamp(hit / ANSWER.length, 0, 1);
}

export default function CaptchaSlot() {
  const tileRefs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ];
  const matchRef = useRef<HTMLSpanElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const tiles = tileRefs.map((r) => r.current);
    const matchEl = matchRef.current;
    const submitEl = submitRef.current;
    if (tiles.some((t) => !t) || !matchEl || !submitEl) return;

    function apply(t: number) {
      const selected = selectedSoFar(t);
      tiles.forEach((tile, idx) => {
        if (!tile) return;
        tile.classList.toggle(styles.isPicked, selected.indexOf(idx) !== -1);
      });
      const ratio = matchRatioOf(selected);
      matchEl!.textContent = String(Math.round(ratio * 100));
      submitEl!.disabled = ratio < MATCH_THRESHOLD;
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      apply(PICK_ORDER.length * PICK_MS);
      return;
    }

    let start: number | null = null;
    let raf = 0;
    function loop(ts: number) {
      if (start === null) start = ts;
      const t = (ts - start) % CYCLE_MS;
      apply(t);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <section className={styles.wrap}>
        <p className={styles.eyebrow}>사람 확인</p>
        <div className={styles.grid}>
          {TILE_INDEXES.map((idx) => (
            <div key={idx} className={styles.tile} ref={tileRefs[idx]} />
          ))}
        </div>
        <p className={styles.hint}>
          일치율 <span ref={matchRef}>0</span>%
        </p>
        <button type="button" className={styles.btn} ref={submitRef} disabled>확인</button>
      </section>
    </main>
  );
}
