import { useEffect, useRef } from "react";
import styles from "./LeaderboardTieMergeFlash.module.scss";

type Box<T> = { current: T };

const LEADERBOARD_TIE_STEP = 10;
const LEADERBOARD_TIE_TICK_MS = 780;

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

export default function LeaderboardTieMergeFlash() {
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
      { id: "p1", name: "ORCA_6", score: 680 },
      { id: "p2", name: "FINCH3", score: 660 },
      { id: "p3", name: "CROW_8", score: 640 },
      { id: "p4", name: "HARE_2", score: 620 },
      { id: "p5", name: "WREN_5", score: 600 }
    ];

    const nodes: Record<string, RowNodes> = {};
    let timer: number | undefined;

    function human() {
      if (root.classList.contains("is-demo")) root.classList.remove("is-demo");
    }

    function sortedPlayers() {
      return players.slice().sort((a, b) => b.score - a.score);
    }

    function computeRanks(order: Player[]) {
      const ranks: number[] = [];
      for (let i = 0; i < order.length; i++) {
        if (i > 0 && order[i].score === order[i - 1].score) ranks.push(ranks[i - 1]);
        else ranks.push(i + 1);
      }
      return ranks;
    }

    function relayout(announce: boolean) {
      const order = sortedPlayers();
      const ranks = computeRanks(order);
      const tieRanks: Record<number, number> = {};
      ranks.forEach((r) => {
        tieRanks[r] = (tieRanks[r] || 0) + 1;
      });
      order.forEach((p, i) => {
        list.appendChild(nodes[p.id].li);
        nodes[p.id].rank.textContent = String(ranks[i]);
        nodes[p.id].score.textContent = String(p.score);
        const isTie = tieRanks[ranks[i]] > 1;
        nodes[p.id].li.classList.toggle(styles["lbt__row--tie"], isTie && !reduce);
        nodes[p.id].li.classList.toggle(styles["lbt__row--tie-static"], isTie && reduce);
      });
      if (announce) {
        const tieNames = order.filter((p, i) => tieRanks[ranks[i]] > 1).map((p) => p.name);
        sr.textContent = tieNames.length ? tieNames.join(", ") + " 공동 순위" : order[0].name + " 이(가) 1위";
      }
    }

    function bump(id: string) {
      const p = players.filter((x) => x.id === id)[0];
      const steps = 1 + Math.floor(rand() * 3);
      p.score += steps * LEADERBOARD_TIE_STEP;
      relayout(true);
    }

    players.forEach((p) => {
      const li = document.createElement("li");
      li.className = styles.lbt__row;
      li.setAttribute("role", "listitem");
      li.tabIndex = 0;

      const rank = document.createElement("span");
      rank.className = styles.lbt__rank;
      const name = document.createElement("span");
      name.className = styles.lbt__name;
      name.textContent = p.name;
      const score = document.createElement("span");
      score.className = styles.lbt__score;

      li.appendChild(rank);
      li.appendChild(name);
      li.appendChild(score);

      nodes[p.id] = { li, rank, score };

      li.addEventListener("click", () => { human(); bump(p.id); });
      li.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); human(); bump(p.id); }
      });

      list.appendChild(li);
    });

    relayout(false);

    if (!reduce) {
      const loop = () => {
        if (root.classList.contains("is-demo")) {
          const idx = Math.floor(rand() * players.length);
          const steps = 1 + Math.floor(rand() * 3);
          players[idx].score += steps * LEADERBOARD_TIE_STEP;
          relayout(true);
        }
        timer = window.setTimeout(loop, LEADERBOARD_TIE_TICK_MS);
      };
      timer = window.setTimeout(loop, LEADERBOARD_TIE_TICK_MS);
    }

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.lbt + " is-demo"} ref={rootRef}>
        <ul className={styles.lbt__list} ref={listRef} role="list" />
        <p className={styles.lbt__sr} ref={srRef} aria-live="polite" />
      </div>
    </main>
  );
}
