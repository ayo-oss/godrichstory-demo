import { useEffect, useRef } from "react";
import styles from "./LeaderboardRankupSpringPop.module.scss";

type Box<T> = { current: T };

const LEADERBOARD_RANKUP_OVERSHOOT_PERCENT = 15;
const LEADERBOARD_RANKUP_POP_MS = 620;
const LEADERBOARD_RANKUP_TICK_MS = 820;

function seedRand(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

type Player = { id: string; name: string; score: number };
type RowNodes = { li: HTMLLIElement; rank: HTMLSpanElement; score: HTMLSpanElement };

function springScale(t: number, overshootPercent: number, popMs: number) {
  const os = Math.max(0.001, Math.min(0.9, overshootPercent / 100));
  const lnOs = Math.log(os);
  const zeta = -lnOs / Math.sqrt(Math.PI * Math.PI + lnOs * lnOs);
  const wn = 11.5;
  const wd = wn * Math.sqrt(Math.max(0.0001, 1 - zeta * zeta));
  const tt = Math.min(1, t) * (popMs / 1000);
  return 1 - Math.exp(-zeta * wn * tt) * (Math.cos(wd * tt) + ((zeta * wn) / wd) * Math.sin(wd * tt));
}

export default function LeaderboardRankupSpringPop() {
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
      { id: "p1", name: "PULSE_7", score: 970 },
      { id: "p2", name: "VERA_X", score: 935 },
      { id: "p3", name: "KITE_3", score: 900 },
      { id: "p4", name: "ONYX_S", score: 865 },
      { id: "p5", name: "DRIFT9", score: 830 }
    ];

    const nodes: Record<string, RowNodes> = {};
    let timer: number | undefined;

    function human() {
      if (root.classList.contains("is-demo")) root.classList.remove("is-demo");
    }

    function sortedPlayers() {
      return players.slice().sort((a, b) => b.score - a.score);
    }

    function relayout() {
      const order = sortedPlayers();
      order.forEach((p, i) => {
        list.appendChild(nodes[p.id].li);
        nodes[p.id].rank.textContent = String(i + 1);
        nodes[p.id].score.textContent = String(p.score);
      });
      return order;
    }

    function popRow(id: string) {
      const el = nodes[id].li;
      if (reduce) return;
      let start: number | null = null;
      function frame(now: number) {
        if (start === null) start = now;
        const t = (now - start) / LEADERBOARD_RANKUP_POP_MS;
        const s = springScale(t, LEADERBOARD_RANKUP_OVERSHOOT_PERCENT, LEADERBOARD_RANKUP_POP_MS);
        el.style.transform = "scale(" + s.toFixed(4) + ")";
        if (t < 1) requestAnimationFrame(frame);
        else el.style.transform = "scale(1)";
      }
      requestAnimationFrame(frame);
    }

    function bump(id: string) {
      const order0 = sortedPlayers();
      const p = players.filter((x) => x.id === id)[0];
      const oldRank = order0.indexOf(p);
      p.score += 25 + Math.floor(rand() * 25);
      const newOrder = relayout();
      const newRank = newOrder.indexOf(p);
      if (newRank < oldRank) {
        popRow(id);
        sr.textContent = p.name + " 이(가) " + (newRank + 1) + "위로 올랐습니다";
      }
    }

    players.forEach((p) => {
      const li = document.createElement("li");
      li.className = styles.lbs__row;
      li.setAttribute("role", "listitem");
      li.tabIndex = 0;

      const rank = document.createElement("span");
      rank.className = styles.lbs__rank;
      const name = document.createElement("span");
      name.className = styles.lbs__name;
      name.textContent = p.name;
      const score = document.createElement("span");
      score.className = styles.lbs__score;

      li.appendChild(rank);
      li.appendChild(name);
      li.appendChild(score);

      nodes[p.id] = { li, rank, score };

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
    });

    relayout();

    if (!reduce) {
      const loop = () => {
        if (root.classList.contains("is-demo")) {
          const order = sortedPlayers();
          const idx = 1 + Math.floor(rand() * (order.length - 1));
          const target = order[idx];
          const oldRank = idx;
          target.score += 35 + Math.floor(rand() * 20);
          const newOrder = relayout();
          const newRank = newOrder.indexOf(target);
          if (newRank < oldRank) popRow(target.id);
        }
        timer = window.setTimeout(loop, LEADERBOARD_RANKUP_TICK_MS);
      };
      timer = window.setTimeout(loop, LEADERBOARD_RANKUP_TICK_MS);
    }

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.lbs + " is-demo"} ref={rootRef}>
        <ul className={styles.lbs__list} ref={listRef} role="list" />
        <p className={styles.lbs__sr} ref={srRef} aria-live="polite" />
      </div>
    </main>
  );
}
