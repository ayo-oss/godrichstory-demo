import { useEffect, useRef } from "react";
import styles from "./LeaderboardDeltaArrowFlash.module.scss";

type Box<T> = { current: T };

const LEADERBOARD_DELTA_DECAY_TAU_MS = 260;
const LEADERBOARD_DELTA_FLOOR = 0.03;
const LEADERBOARD_DELTA_MAX_REF = 40;
// 시연 스케줄: 2초 구간 안에서 여러 행의 순위 변동이 겹쳐 일어나게 하는 고정 시각표.
// rAF 타임스탬프 차이(dt)만 쓴다 — new Date·Date.now·Math.random 없음.
const DEMO_SCHEDULE: { t: number; id: string }[] = [
  { t: 0, id: "p2" }, { t: 220, id: "p4" }, { t: 460, id: "p1" }, { t: 740, id: "p3" },
  { t: 1000, id: "p5" }, { t: 1280, id: "p2" }, { t: 1560, id: "p4" }, { t: 1840, id: "p1" }
];
const DEMO_LOOP_MS = 2000;
const UP_RGB = "91,140,255";   // $subject-blue-light 와 맞춘다
const DOWN_RGB = "194,54,26";  // $error
const INK_HEX = "#17141a";     // $subject-ink

function seedRand(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

type Player = { id: string; name: string; score: number };
type RowNodes = { li: HTMLLIElement; score: HTMLSpanElement; arrow: HTMLSpanElement };

export default function LeaderboardDeltaArrowFlash() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const listRef = useRef(null) as unknown as Box<HTMLUListElement>;
  const srRef = useRef(null) as unknown as Box<HTMLParagraphElement>;

  useEffect(() => {
    const root = rootRef.current;
    const list = listRef.current;
    const sr = srRef.current;
    const rand = seedRand(418);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const players: Player[] = [
      { id: "p1", name: "ONYX_4", score: 860 },
      { id: "p2", name: "LUMEN7", score: 828 },
      { id: "p3", name: "BASIN2", score: 796 },
      { id: "p4", name: "HAZE_9", score: 764 },
      { id: "p5", name: "VOLT_5", score: 732 }
    ];

    const nodes: Record<string, RowNodes> = {};
    let raf: number | undefined;

    function human() {
      if (root.classList.contains("is-demo")) root.classList.remove("is-demo");
    }

    function flashArrow(row: RowNodes, delta: number) {
      const el = row.arrow;
      const mag = Math.min(1, Math.abs(delta) / LEADERBOARD_DELTA_MAX_REF);
      const scale = 0.7 + mag * 0.7;
      const up = delta >= 0;
      const rgb = up ? UP_RGB : DOWN_RGB;
      el.classList.toggle(styles["lbf__arrow--down"], !up);
      el.style.transform = "translateY(-50%) scale(" + scale.toFixed(2) + ") rotate(" + (up ? 0 : 180) + "deg)";
      if (reduce) {
        el.style.opacity = "0";
        row.li.style.background = "";
        row.li.style.boxShadow = "";
        return;
      }
      let start: number | null = null;
      el.style.opacity = "1";
      function frame(now: number) {
        if (start === null) start = now;
        const t = now - start;
        const alpha = Math.exp(-t / LEADERBOARD_DELTA_DECAY_TAU_MS);
        if (alpha < LEADERBOARD_DELTA_FLOOR) {
          el.style.opacity = "0";
          row.li.style.background = "";
          row.li.style.boxShadow = "";
          return;
        }
        el.style.opacity = alpha.toFixed(3);
        const a = alpha * mag;
        row.li.style.background = "linear-gradient(90deg, rgba(" + rgb + "," + (a * 0.55).toFixed(3) + "), rgba(" + rgb + ",0) 78%), " + INK_HEX;
        row.li.style.boxShadow = "0 " + (2 + a * 6).toFixed(1) + "px " + (10 + a * 16).toFixed(1) + "px -4px rgba(" + rgb + "," + (a * 0.5).toFixed(3) + ")";
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    function updateRow(id: string, delta: number) {
      const row = nodes[id];
      const p = players.filter((x) => x.id === id)[0];
      row.score.textContent = String(p.score);
      flashArrow(row, delta);
      sr.textContent = p.name + " 점수 " + (delta >= 0 ? "+" : "") + delta + ", 현재 " + p.score;
    }

    function bump(id: string) {
      const p = players.filter((x) => x.id === id)[0];
      const delta = 8 + Math.floor(rand() * 30);
      p.score += delta;
      updateRow(id, delta);
    }

    players.forEach((p) => {
      const li = document.createElement("li");
      li.className = styles.lbf__row;
      li.setAttribute("role", "listitem");
      li.tabIndex = 0;

      const name = document.createElement("span");
      name.className = styles.lbf__name;
      name.textContent = p.name;
      const score = document.createElement("span");
      score.className = styles.lbf__score;
      score.textContent = String(p.score);
      const arrow = document.createElement("span");
      arrow.className = styles.lbf__arrow;
      arrow.setAttribute("aria-hidden", "true");

      li.appendChild(name);
      li.appendChild(score);
      li.appendChild(arrow);

      nodes[p.id] = { li, score, arrow };

      li.addEventListener("click", () => { human(); bump(p.id); });
      li.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); human(); bump(p.id); }
      });

      list.appendChild(li);
    });

    function scheduledBump(id: string) {
      const p = players.filter((x) => x.id === id)[0];
      const down = rand() < 0.35;
      const delta = (10 + Math.floor(rand() * 30)) * (down ? -1 : 1);
      p.score = Math.max(0, p.score + delta);
      updateRow(id, delta);
    }

    if (!reduce) {
      let demoElapsed = 0, demoLast: number | null = null, demoIdx = 0, demoLap = 0;
      const demoLoop = (ts: number) => {
        if (root.classList.contains("is-demo")) {
          if (demoLast === null) demoLast = ts;
          demoElapsed += ts - demoLast;
          demoLast = ts;
          while (true) {
            const entry = DEMO_SCHEDULE[demoIdx];
            const target = demoLap * DEMO_LOOP_MS + entry.t;
            if (demoElapsed < target) break;
            scheduledBump(entry.id);
            demoIdx++;
            if (demoIdx >= DEMO_SCHEDULE.length) { demoIdx = 0; demoLap++; }
          }
        } else {
          demoLast = null;
        }
        raf = requestAnimationFrame(demoLoop);
      };
      raf = requestAnimationFrame(demoLoop);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.lbf + " is-demo"} ref={rootRef}>
        <ul className={styles.lbf__list} ref={listRef} role="list" />
        <p className={styles.lbf__sr} ref={srRef} aria-live="polite" />
      </div>
    </main>
  );
}
