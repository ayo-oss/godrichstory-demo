// EmojiRecentFrequencyRank — vanilla 판(run/402/demo/01-emoji-picker-recent-frequency-rank/index.html) 의 React 포트.
// rank() 가 사용 횟수 값을 내림차순으로 정렬하고, useEffect 가 재배치 전 위치를 실측(getBoundingClientRect)해
// FLIP 으로 그 차이만큼 transform 되돌린 뒤 CSS transition 으로 0 까지 풀어 움직임을 만든다.
import { useEffect, useRef, useState } from "react";
import styles from "./EmojiRecentFrequencyRank.module.scss";

type Box<T> = { current: T };

type Emoji = { ch: string; key: string; seed: number };
const EMOJIS: Emoji[] = [
  { ch: "\u{1F600}", key: "smile", seed: 2 }, { ch: "\u{1F602}", key: "joy", seed: 5 },
  { ch: "\u{1F60D}", key: "heart-eyes", seed: 1 }, { ch: "\u{1F389}", key: "party", seed: 4 },
  { ch: "\u{1F525}", key: "fire", seed: 0 }, { ch: "\u{1F44D}", key: "thumbs-up", seed: 3 },
  { ch: "\u{1F64F}", key: "pray", seed: 0 }, { ch: "\u{1F60E}", key: "cool", seed: 1 },
  { ch: "\u{1F973}", key: "celebrate", seed: 0 }, { ch: "\u{1F914}", key: "think", seed: 0 },
  { ch: "\u{1F44F}", key: "clap", seed: 2 }, { ch: "\u{2764}\u{FE0F}", key: "love", seed: 0 },
];
const RECENT_MAX = 6;
const SEQ = [4, 6, 9, 4, 8, 6];

export default function EmojiRecentFrequencyRank() {
  const countsRef = useRef({} as Record<string, number>) as unknown as Box<Record<string, number>>;
  const lastPickedRef = useRef({} as Record<string, number>) as unknown as Box<Record<string, number>>;
  const seqRef = useRef(0) as unknown as Box<number>;
  const isDemoRef = useRef(true) as unknown as Box<boolean>;
  const timerRef = useRef(0) as unknown as Box<number>;
  const recentRef = useRef(null) as unknown as Box<HTMLUListElement>;
  const rectsRef = useRef({} as Record<string, DOMRect>) as unknown as Box<Record<string, DOMRect>>;

  if (Object.keys(countsRef.current).length === 0) {
    EMOJIS.forEach((e) => { countsRef.current[e.key] = e.seed; });
  }

  const [tick, setTick] = useState(0);
  const [isDemo, setIsDemo] = useState(true);
  const [live, setLive] = useState("");

  function rank(): Emoji[] {
    const c = countsRef.current, lp = lastPickedRef.current;
    return EMOJIS.slice().sort((a, b) => {
      const d = (c[b.key] || 0) - (c[a.key] || 0);
      return d !== 0 ? d : (lp[b.key] || 0) - (lp[a.key] || 0);
    }).slice(0, RECENT_MAX);
  }

  function human() { if (isDemoRef.current) { isDemoRef.current = false; setIsDemo(false); } }

  function pick(e: Emoji) {
    if (recentRef.current) {
      rectsRef.current = {};
      Array.prototype.forEach.call(recentRef.current.children, (li: HTMLElement) => {
        rectsRef.current[li.dataset.key as string] = li.getBoundingClientRect();
      });
    }
    countsRef.current[e.key] = (countsRef.current[e.key] || 0) + 1;
    lastPickedRef.current[e.key] = ++seqRef.current;
    setLive(e.ch + " 사용 " + countsRef.current[e.key] + "회 · 최근 사용 순위 갱신");
    setTick((t) => t + 1);
  }

  useEffect(() => {
    if (!recentRef.current) return;
    const before = rectsRef.current;
    Array.prototype.forEach.call(recentRef.current.children, (li: HTMLElement) => {
      const key = li.dataset.key as string, b = before[key];
      if (!b) { li.classList.add(styles.itemEnter); requestAnimationFrame(() => li.classList.remove(styles.itemEnter)); return; }
      const a = li.getBoundingClientRect(), dx = b.left - a.left, dy = b.top - a.top;
      if (Math.abs(dx) > .5 || Math.abs(dy) > .5) {
        li.style.transition = "none";
        li.style.transform = "translate(" + dx + "px," + dy + "px)";
        li.offsetHeight;
        li.style.transition = "";
        li.style.transform = "";
      }
    });
  }, [tick]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let i = 0;
    function loop() {
      if (!isDemoRef.current) return;
      pick(EMOJIS[SEQ[i % SEQ.length]]);
      i++;
      timerRef.current = window.setTimeout(loop, 420);
    }
    if (!reduce) { timerRef.current = window.setTimeout(loop, 380); }
    else { isDemoRef.current = false; setIsDemo(false); }
    return () => window.clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const list = rank();

  return (
    <main className={styles.stage}>
      <div className={styles.ep + " " + (isDemo ? styles.isDemo : "")}>
        <div className={styles.head}>
          <span className={styles.label}>최근 사용</span>
          <span className={styles.sub}>순위는 사용 횟수 값이 정한다</span>
        </div>
        <ul className={styles.recent} role="listbox" aria-label="최근 사용 이모지, 사용 빈도 순" ref={recentRef}>
          {list.map((e, idx) => (
            <li key={e.key} data-key={e.key} className={styles.item} role="option" aria-selected="false"
                aria-label={e.key + ", 사용 " + (countsRef.current[e.key] || 0) + "회, 순위 " + (idx + 1)}
                onClick={() => { human(); pick(e); }}>
              <b className={styles.rank}>{idx + 1}</b>
              <span className={styles.ch}>{e.ch}</span>
              <span className={styles.count}>{countsRef.current[e.key] || 0}</span>
            </li>
          ))}
        </ul>
        <div className={styles.all} role="listbox" aria-label="전체 이모지">
          {EMOJIS.map((e) => (
            <button key={e.key} type="button" className={styles.allBtn} role="option" aria-selected="false"
                    aria-label={e.key} onClick={() => { human(); pick(e); }}>{e.ch}</button>
          ))}
        </div>
        <p className={styles.sr} role="status" aria-live="polite">{live}</p>
      </div>
    </main>
  );
}
