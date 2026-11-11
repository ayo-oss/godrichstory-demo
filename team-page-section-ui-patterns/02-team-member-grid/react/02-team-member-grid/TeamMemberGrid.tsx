// TeamMemberGrid — vanilla 판(run/338/demo/02-team-member-grid/index.html) 의 React 포트.
// 인원수를 열 수로 나눈 나머지로 마지막 줄에 몇 명이 남는지 계산하고, 나머지가 1~2명일 때만
// 그 인원을 별도 flex 줄로 떼어 가운데로 모은다. ResizeObserver 로 컨테이너 폭이 바뀌어 열 수
// 자체가 바뀔 때도 같은 계산을 다시 돌린다(계산 한 겹).
import { useEffect, useRef } from "react";
import styles from "./TeamMemberGrid.module.scss";

export type TeamMemberGridProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "마지막 줄에 남는 인원을 계산해 외톨이 카드 없이 가운데로 모읍니다";
const HEAD_LABEL = "팀원 목록";
const TAIL_LABEL = "마지막 줄";

function mulberry32(a: number): () => number {
  return function (): number {
    a |= 0; a = a + 0x6d2b79f5 | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HEXES = ["#9fc9ec", "#93d9c0", "#b9a0ff", "#f6c6d3"];
const COUNTS = [7, 8, 9, 10];
const MIN_CARD = 76;

function drawAvatar(cv: HTMLCanvasElement, seed: number, label: string): void {
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  const rnd = mulberry32(seed);
  const s = cv.width;
  ctx.clearRect(0, 0, s, s);
  ctx.save();
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
  ctx.clip();
  const cell = 6;
  for (let y = 0; y < s; y += cell) {
    for (let x = 0; x < s; x += cell) {
      const v = rnd();
      ctx.fillStyle = v > 0.5 ? HEXES[Math.floor(rnd() * HEXES.length)] : "rgba(23,20,26,.08)";
      ctx.fillRect(x, y, cell, cell);
    }
  }
  ctx.restore();
  ctx.fillStyle = "rgba(23,20,26,.55)";
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff7e6";
  ctx.font = "700 " + Math.round(s * 0.4) + 'px -apple-system, "Segoe UI", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, s / 2, s / 2 + 1);
}

function computeCols(width: number): number {
  const c = Math.floor(width / MIN_CARD);
  return Math.max(2, Math.min(5, c || 4));
}

function makeCard(i: number): HTMLDivElement {
  const el = document.createElement("div");
  el.className = styles.card;
  el.setAttribute("role", "listitem");
  const cv = document.createElement("canvas");
  cv.className = styles.cv;
  cv.width = 28;
  cv.height = 28;
  cv.setAttribute("aria-hidden", "true");
  const tag = document.createElement("span");
  tag.className = styles.tag;
  tag.textContent = "M" + (i + 1);
  el.appendChild(cv);
  el.appendChild(tag);
  drawAvatar(cv, 11 + i * 13, "M" + (i + 1));
  return el;
}

export default function TeamMemberGrid({
  duration = "300ms",
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#0a4fe8"
}: TeamMemberGridProps) {
  const gridRef = useRef<HTMLElement | null>(null);
  const headRef = useRef<HTMLDivElement | null>(null);
  const tailRef = useRef<HTMLDivElement | null>(null);
  const chipRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const grid = gridRef.current;
    const head = headRef.current;
    const tail = tailRef.current;
    const chip = chipRef.current;
    if (!grid || !head || !tail || !chip) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let cols = 4;
    let idx = 0;

    function layout(count: number): void {
      const remainder = count % cols;
      const tailCount = remainder === 1 || remainder === 2 ? remainder : 0;
      const headCount = count - tailCount;
      head!.style.setProperty("--cols", String(cols));
      head!.innerHTML = "";
      tail!.innerHTML = "";
      for (let i = 0; i < headCount; i++) head!.appendChild(makeCard(i));
      for (let j = 0; j < tailCount; j++) tail!.appendChild(makeCard(headCount + j));
      tail!.style.display = tailCount > 0 ? "flex" : "none";
      chip!.textContent = "n=" + count + " · cols " + cols + " · 나머지 " + tailCount;
      grid!.classList.remove(styles.gridIn);
      void grid!.offsetWidth;
      grid!.classList.add(styles.gridIn);
    }

    const ro = new ResizeObserver((entries) => {
      const w = entries[0] ? entries[0].contentRect.width : grid!.clientWidth;
      const next = computeCols(w);
      if (next !== cols) { cols = next; layout(COUNTS[idx]); }
    });
    ro.observe(grid);

    layout(COUNTS[0]);

    let timer = 0;
    if (!reduce) {
      timer = window.setInterval(() => {
        idx = (idx + 1) % COUNTS.length;
        layout(COUNTS[idx]);
      }, 700);
    }

    return () => {
      ro.disconnect();
      if (timer) window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <section className={styles.grid} ref={gridRef}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.head} ref={headRef} role="list" aria-label={HEAD_LABEL} />
        <div className={styles.tail} ref={tailRef} role="list" aria-label={TAIL_LABEL} />
        <p className={styles.meta}>
          <span className={styles.chip} ref={chipRef} style={{ background: color }}>n=8 · cols 4 · 나머지 0</span>
        </p>
      </section>
    </main>
  );
}
