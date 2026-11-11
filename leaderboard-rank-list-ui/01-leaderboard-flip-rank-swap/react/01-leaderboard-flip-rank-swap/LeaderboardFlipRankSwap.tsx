import { useEffect, useRef } from "react";
import styles from "./LeaderboardFlipRankSwap.module.scss";

type Box<T> = { current: T };

const LEADERBOARD_FLIP_DURATION_MS = 600;
const LEADERBOARD_FLIP_SWAP_MS = 460;
const LEADERBOARD_FLIP_HIGHLIGHT = "91,140,248";

function seedRand(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

type Player = { id: string; name: string; score: number };
type RowNodes = { li: HTMLLIElement; rank: HTMLSpanElement; score: HTMLSpanElement; anim?: Animation };

export default function LeaderboardFlipRankSwap() {
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
      { id: "p1", name: "NOVA_7", score: 980 },
      { id: "p2", name: "ECHO_K", score: 940 },
      { id: "p3", name: "RAPTOR9", score: 900 },
      { id: "p4", name: "GLIDEX", score: 860 },
      { id: "p5", name: "ZEN_44", score: 820 }
    ];

    const nodes: Record<string, RowNodes> = {};
    let timer: number | undefined;

    function human() {
      if (root.classList.contains("is-demo")) root.classList.remove("is-demo");
    }

    function sortedPlayers() {
      return players.slice().sort((a, b) => b.score - a.score);
    }

    function measureRects() {
      const map: Record<string, DOMRect> = {};
      players.forEach((p) => {
        map[p.id] = nodes[p.id].li.getBoundingClientRect();
      });
      return map;
    }

    function flipSwap(before: Record<string, DOMRect>) {
      const order = sortedPlayers();
      order.forEach((p, i) => {
        list.appendChild(nodes[p.id].li);
        nodes[p.id].rank.textContent = String(i + 1);
        nodes[p.id].score.textContent = String(p.score);
      });
      if (reduce) return;
      players.forEach((p) => {
        const node = nodes[p.id];
        const el = node.li;
        const after = el.getBoundingClientRect();
        const dy = before[p.id].top - after.top;
        if (Math.abs(dy) < 0.5) return;
        animateFlipRow(node, dy);
      });
      sr.textContent = order[0].name + " 이(가) 1위입니다";
    }

    // 계산 겹: 이동 진행률(hump = 0→1→0)을 그림자·배경 톤에 실어 Web Animations API
    // 키프레임으로 재생한다 — document.getAnimations() 로 잡혀야 demo.py 가 애니메이션
    // 시계를 프레임마다 정확히 놓아 결정론적으로 캡처한다.
    function animateFlipRow(node: RowNodes, dy: number) {
      const el = node.li;
      if (node.anim) node.anim.cancel();
      const baseShadow = "0 2px 10px rgba(10,16,32,0)";
      const peakShadow = "0 14px 30px rgba(10,16,32,.28)";
      const baseBg = "rgba(" + LEADERBOARD_FLIP_HIGHLIGHT + ",0.08)";
      const peakBg = "rgba(" + LEADERBOARD_FLIP_HIGHLIGHT + ",0.32)";
      node.anim = el.animate([
        { transform: "translateY(" + dy + "px)", boxShadow: baseShadow, background: baseBg, offset: 0 },
        { boxShadow: peakShadow, background: peakBg, offset: 0.5 },
        { transform: "translateY(0px)", boxShadow: baseShadow, background: baseBg, offset: 1 }
      ], { duration: LEADERBOARD_FLIP_DURATION_MS, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" });
      node.anim.onfinish = () => {
        el.style.transform = "";
        el.style.boxShadow = "";
        el.style.background = "";
      };
    }

    function bump(id: string) {
      const before = measureRects();
      const p = players.filter((x) => x.id === id)[0];
      p.score += 40 + Math.floor(rand() * 60);
      flipSwap(before);
    }

    // 한 틱에 서로 다른 두 참가자를 동시에 밀어올려 여러 행이 한 번에 FLIP 하게 한다.
    function bumpMany() {
      const before = measureRects();
      const pool = players.slice();
      const picks: Player[] = [];
      for (let n = 0; n < 2 && pool.length; n++) {
        const i = Math.floor(rand() * pool.length);
        picks.push(pool.splice(i, 1)[0]);
      }
      picks.forEach((p) => { p.score += 35 + Math.floor(rand() * 55); });
      flipSwap(before);
    }

    players.forEach((p) => {
      const li = document.createElement("li");
      li.className = styles.lbf__row;
      li.setAttribute("role", "listitem");
      li.tabIndex = 0;

      const rank = document.createElement("span");
      rank.className = styles.lbf__rank;
      const name = document.createElement("span");
      name.className = styles.lbf__name;
      name.textContent = p.name;
      const score = document.createElement("span");
      score.className = styles.lbf__score;

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

      list.appendChild(li);
    });

    flipSwap(measureRects());

    if (!reduce) {
      const loop = () => {
        if (root.classList.contains("is-demo")) {
          bumpMany();
        }
        timer = window.setTimeout(loop, LEADERBOARD_FLIP_SWAP_MS);
      };
      timer = window.setTimeout(loop, LEADERBOARD_FLIP_SWAP_MS);
    }

    return () => {
      if (timer) window.clearTimeout(timer);
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
