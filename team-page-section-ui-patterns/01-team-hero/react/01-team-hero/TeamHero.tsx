// TeamHero — vanilla 판(run/338/demo/01-team-hero/index.html) 의 React 포트.
// IntersectionObserver 로 섹션이 화면에 들어온 시점 하나만 기준을 잡고, 등장 예산(ENTRANCE_MS)을
// 그 순간의 인원수로 나눠 인덱스마다 곱하는 간격(step)을 매번 계산한다(계산 한 겹). 자동 시연은
// 인원수를 5·7·4·6 으로 순환시켜 매번 다시 계산되는 것을 보여준다.
import { useEffect, useRef } from "react";
import styles from "./TeamHero.module.scss";

export type TeamHeroProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "섹션이 화면에 들어온 시점 하나만 기준으로 인원수에 맞춰 등장 간격을 압축합니다";
const ROW_LABEL = "팀원 사진 줄";

function mulberry32(a: number): () => number {
  return function (): number {
    a |= 0; a = a + 0x6d2b79f5 | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HEXES = ["#9fc9ec", "#93d9c0", "#b9a0ff", "#f6c6d3"];
const ENTRANCE_MS = 480;
const COUNTS = [5, 7, 4, 6];
const MEMBER_MAX = 7;

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
  const cell = 8;
  for (let y = 0; y < s; y += cell) {
    for (let x = 0; x < s; x += cell) {
      const v = rnd();
      ctx.fillStyle = v > 0.5 ? HEXES[Math.floor(rnd() * HEXES.length)] : "rgba(23,20,26,.10)";
      ctx.fillRect(x, y, cell, cell);
    }
  }
  ctx.restore();
  ctx.fillStyle = "rgba(23,20,26,.55)";
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff7e6";
  ctx.font = "700 " + Math.round(s * 0.38) + 'px -apple-system, "Segoe UI", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, s / 2, s / 2 + 1);
}

export default function TeamHero({
  duration = "600ms",
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#0a4fe8"
}: TeamHeroProps) {
  const heroRef = useRef<HTMLElement | null>(null);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const chipRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const hero = heroRef.current;
    const row = rowRef.current;
    const chip = chipRef.current;
    if (!hero || !row || !chip) return;
    const avatars = Array.prototype.slice.call(row.querySelectorAll("." + styles.avatar)) as HTMLElement[];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    avatars.forEach((el, i) => {
      const cv = el.querySelector("." + styles.cv) as HTMLCanvasElement | null;
      if (cv) drawAvatar(cv, 31 + i * 17, "M" + (i + 1));
    });

    function layout(count: number): void {
      const step = ENTRANCE_MS / count;
      avatars.forEach((el, i) => {
        const visible = i < count;
        el.style.display = visible ? "" : "none";
        if (visible) el.style.setProperty("--delay", ((i % count) * step).toFixed(1) + "ms");
      });
      chip!.textContent = "n=" + count + " · step " + Math.round(step) + "ms";
      row!.classList.remove(styles.rowIn);
      void row!.offsetWidth;
      row!.classList.add(styles.rowIn);
    }

    let fired = false;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !fired) { fired = true; layout(COUNTS[0]); }
      });
    }, { threshold: 0.3 });
    io.observe(hero);

    let idx = 0;
    let timer = 0;
    if (reduce) {
      layout(COUNTS[0]);
    } else {
      layout(COUNTS[0]);
      timer = window.setInterval(() => {
        idx = (idx + 1) % COUNTS.length;
        layout(COUNTS[idx]);
      }, 650);
    }

    return () => {
      io.disconnect();
      if (timer) window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const members = Array.from({ length: MEMBER_MAX }, (_, i) => i);

  return (
    <main className={styles.stage}>
      <section className={styles.hero} ref={heroRef}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.row} ref={rowRef} role="list" aria-label={ROW_LABEL}>
          {members.map((i) => (
            <div className={styles.avatar} role="listitem" key={i}>
              <canvas className={styles.cv} width={48} height={48} aria-hidden="true" />
              <span className={styles.tag}>{"M" + (i + 1)}</span>
            </div>
          ))}
        </div>
        <p className={styles.meta}>
          <span className={styles.chip} ref={chipRef} style={{ background: color }}>n=5 · step 96ms</span>
        </p>
      </section>
    </main>
  );
}
