import { useEffect, useRef } from "react";
import styles from "./LeaderboardGoldGlossSweep.module.scss";

type Box<T> = { current: T };

const LEADERBOARD_GOLD_SWEEP_FAST_MS = 520;
const LEADERBOARD_GOLD_SWEEP_SLOW_MS = 1300;
const LEADERBOARD_GOLD_TICK_MS = 460;
const LEADERBOARD_GOLD_RGB = "255,210,63";

function seedRand(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function smoothstep(x: number) {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
}

type Player = { id: string; name: string; score: number };
type RowNodes = { li: HTMLLIElement; rank: HTMLSpanElement; score: HTMLSpanElement; sweep: HTMLSpanElement };

export default function LeaderboardGoldGlossSweep() {
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
      { id: "p1", name: "AMBER7", score: 940 },
      { id: "p2", name: "FLARE2", score: 905 },
      { id: "p3", name: "QUILL8", score: 870 },
      { id: "p4", name: "NOMAD5", score: 835 },
      { id: "p5", name: "WISP_3", score: 800 }
    ];

    const nodes: Record<string, RowNodes> = {};
    let timer: number | undefined;
    let raf: number | undefined;

    function human() {
      if (root.classList.contains("is-demo")) root.classList.remove("is-demo");
    }

    function sortedPlayers() {
      return players.slice().sort((a, b) => b.score - a.score);
    }

    let prevGoldId: string | null = null;

    function relayout(announce: boolean) {
      const order = sortedPlayers();
      order.forEach((p, i) => {
        list.appendChild(nodes[p.id].li);
        nodes[p.id].rank.textContent = String(i + 1);
        nodes[p.id].score.textContent = String(p.score);
        nodes[p.id].li.classList.toggle(styles["lbg__row--gold"], i === 0);
      });
      if (order[0].id !== prevGoldId) {
        if (prevGoldId && nodes[prevGoldId]) {
          nodes[prevGoldId].li.style.boxShadow = "";
          nodes[prevGoldId].li.style.background = "";
        }
        prevGoldId = order[0].id;
      }
      if (announce) sr.textContent = order[0].name + " 이(가) 1위, 점수 " + order[0].score;
      return order;
    }

    function bump(id: string) {
      const p = players.filter((x) => x.id === id)[0];
      p.score += 15 + Math.floor(rand() * 30);
      relayout(true);
    }

    players.forEach((p) => {
      const li = document.createElement("li");
      li.className = styles.lbg__row;
      li.setAttribute("role", "listitem");
      li.tabIndex = 0;

      const rank = document.createElement("span");
      rank.className = styles.lbg__rank;
      const name = document.createElement("span");
      name.className = styles.lbg__name;
      name.textContent = p.name;
      const score = document.createElement("span");
      score.className = styles.lbg__score;
      const sweep = document.createElement("span");
      sweep.className = styles.lbg__sweep;
      sweep.setAttribute("aria-hidden", "true");

      li.appendChild(rank);
      li.appendChild(name);
      li.appendChild(score);
      li.appendChild(sweep);

      nodes[p.id] = { li, rank, score, sweep };

      li.addEventListener("click", () => {
        human();
        bump(p.id);
      });
      li.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          human();
          bump(p.id);
        }
      });

      list.appendChild(li);
    });

    relayout(false);

    function sweepFrame(now: number) {
      const order = sortedPlayers();
      const goldNode = nodes[order[0].id];
      const margin = order.length > 1
        ? Math.max(0, Math.min(1, (order[0].score - order[1].score) / order[0].score))
        : 1;
      const period = LEADERBOARD_GOLD_SWEEP_FAST_MS + margin * (LEADERBOARD_GOLD_SWEEP_SLOW_MS - LEADERBOARD_GOLD_SWEEP_FAST_MS);
      const phase = (now % period) / period;
      const pos = smoothstep(phase) * 160 - 30;
      goldNode.sweep.style.transform = "translateX(" + pos.toFixed(1) + "%) skewX(-18deg)";
      const hump = Math.sin(phase * Math.PI);
      goldNode.li.style.boxShadow =
        "0 0 " + (6 + hump * 22).toFixed(1) + "px rgba(" + LEADERBOARD_GOLD_RGB + "," + (0.25 + hump * 0.45).toFixed(3) + "), " +
        "0 " + (2 + hump * 9).toFixed(1) + "px " + (10 + hump * 16).toFixed(1) + "px rgba(0,0,0," + (0.22 * hump).toFixed(3) + ")";
      goldNode.li.style.background = "rgba(" + LEADERBOARD_GOLD_RGB + "," + (0.12 + hump * 0.26).toFixed(3) + ")";
      raf = requestAnimationFrame(sweepFrame);
    }

    if (!reduce) {
      raf = requestAnimationFrame(sweepFrame);
      const loop = () => {
        if (root.classList.contains("is-demo")) {
          const order = sortedPlayers();
          const idx = Math.floor(rand() * order.length);
          order[idx].score += 12 + Math.floor(rand() * 24);
          relayout(true);
        }
        timer = window.setTimeout(loop, LEADERBOARD_GOLD_TICK_MS);
      };
      timer = window.setTimeout(loop, LEADERBOARD_GOLD_TICK_MS);
    }

    return () => {
      if (timer) window.clearTimeout(timer);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.lbg + " is-demo"} ref={rootRef}>
        <ul className={styles.lbg__list} ref={listRef} role="list" />
        <p className={styles.lbg__sr} ref={srRef} aria-live="polite" />
      </div>
    </main>
  );
}
