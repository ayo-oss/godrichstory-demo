import { useEffect, useRef } from "react";
import styles from "./LeaderboardElevationShadowLift.module.scss";

type Box<T> = { current: T };

const LEADERBOARD_ELEVATION_BLUR_MAX_PX = 26;
const LEADERBOARD_ELEVATION_OFFSET_MAX_PX = 15;
const LEADERBOARD_ELEVATION_ALPHA_MAX = 0.34;
const LEADERBOARD_ELEVATION_LIFT_MAX_PX = 7;
const LEADERBOARD_ELEVATION_TICK_MS = 900;

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

export default function LeaderboardElevationShadowLift() {
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
      { id: "p1", name: "CORAL5", score: 910 },
      { id: "p2", name: "FABLE2", score: 872 },
      { id: "p3", name: "TALON8", score: 834 },
      { id: "p4", name: "OPAL_6", score: 796 },
      { id: "p5", name: "RUNE_1", score: 758 }
    ];

    const nodes: Record<string, RowNodes> = {};
    const rankX: Record<string, number> = {};
    const N = players.length;
    let timer: number | undefined;

    function human() {
      if (root.classList.contains("is-demo")) root.classList.remove("is-demo");
    }

    function sortedPlayers() {
      return players.slice().sort((a, b) => b.score - a.score);
    }

    function xForRank(rank: number) {
      return N > 1 ? (N - rank) / (N - 1) : 1;
    }

    // 계산 겹: 순위를 0~1 로 정규화한 x 값 하나로 그림자의 세 속성(blur·offset·alpha)과
    // 카드의 들뜨는 높이(lift)를 동시에 만든다 — 상수 네 개가 그 값의 상한을 정한다.
    function elevationFor(rank: number) {
      return elevationForX(xForRank(rank));
    }

    function elevationForX(x: number) {
      return {
        blur: 4 + x * LEADERBOARD_ELEVATION_BLUR_MAX_PX,
        offset: 2 + x * LEADERBOARD_ELEVATION_OFFSET_MAX_PX,
        alpha: 0.08 + x * LEADERBOARD_ELEVATION_ALPHA_MAX,
        lift: x * LEADERBOARD_ELEVATION_LIFT_MAX_PX
      };
    }

    function paintElevation(row: RowNodes, e: { blur: number; offset: number; alpha: number; lift: number }) {
      row.li.style.boxShadow = "0 " + e.offset.toFixed(1) + "px " + e.blur.toFixed(1) + "px rgba(23,20,26," + e.alpha.toFixed(2) + ")";
      row.li.style.transform = "translateY(-" + e.lift.toFixed(1) + "px)";
    }

    function applyElevation(row: RowNodes, rank: number) {
      paintElevation(row, elevationFor(rank));
    }

    // x 를 직접 requestAnimationFrame 으로 보간한다 — CSS transition 은 재정렬(appendChild)과
    // 같은 동기 실행 안에서 값을 다시 쓰면 페인트 전이라 순간이동해 버릴 때가 있어(브라우저가
    // "이전 값"을 페인트한 적이 없으면 transition 이 안 걸린다), 계산 겹을 프레임마다 직접 찍는다.
    function tweenRow(row: RowNodes, id: string, toRank: number) {
      const fromX = rankX[id] != null ? rankX[id] : xForRank(toRank);
      const toX = xForRank(toRank);
      rankX[id] = toX;
      if (reduce || fromX === toX) { paintElevation(row, elevationForX(toX)); return; }
      const t0 = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / tweenMs);
        const eased = 1 - Math.pow(1 - t, 3);
        paintElevation(row, elevationForX(fromX + (toX - fromX) * eased));
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }

    function relayout(announce: boolean) {
      const order = sortedPlayers();
      order.forEach((p, i) => {
        list.appendChild(nodes[p.id].li);
        nodes[p.id].rank.textContent = String(i + 1);
        nodes[p.id].score.textContent = String(p.score);
        tweenRow(nodes[p.id], p.id, i + 1);
      });
      if (announce) sr.textContent = order[0].name + " 이(가) 1위입니다";
      return order;
    }

    function bump(id: string) {
      const p = players.filter((x) => x.id === id)[0];
      p.score += 20 + Math.floor(rand() * 25);
      relayout(true);
    }

    players.forEach((p) => {
      const li = document.createElement("li");
      li.className = styles.lbe__row;
      li.setAttribute("role", "listitem");
      li.tabIndex = 0;

      const rank = document.createElement("span");
      rank.className = styles.lbe__rank;
      const name = document.createElement("span");
      name.className = styles.lbe__name;
      name.textContent = p.name;
      const score = document.createElement("span");
      score.className = styles.lbe__score;

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

    // $duration 토큰을 CSS 변수로 받아 그대로 rAF 트윈 길이로 쓴다 — 변형이 $duration 을
    // 바꾸면 여기서도 같이 바뀐다.
    const tweenMs = parseFloat(getComputedStyle(nodes[players[0].id].li).getPropertyValue("--lbe-duration")) || 650;

    players.forEach((p, i) => {
      rankX[p.id] = xForRank(i + 1);
      applyElevation(nodes[p.id], i + 1);
    });

    if (!reduce) {
      const loop = () => {
        if (root.classList.contains("is-demo")) {
          // 마지막 순위를 1위 점수보다 높게 올려 순위 범위를 끝까지 오가게 한다 —
          // 그래야 elevationFor() 의 x(0~1) 가 매 틱 전체 구간을 지나며 그림자가 크게 움직인다.
          const order = sortedPlayers();
          const last = order[order.length - 1];
          const top = order[0];
          last.score = top.score + 15 + Math.floor(rand() * 20);
          relayout(true);
        }
        timer = window.setTimeout(loop, LEADERBOARD_ELEVATION_TICK_MS);
      };
      // 첫 틱도 setTimeout 으로 미룬다 — 초기 정적 렌더가 한 번 페인트된 뒤에 순위를 바꿔야
      // tweenRow() 가 "이전 x" 를 기억한 상태에서 보간을 시작한다.
      timer = window.setTimeout(loop, LEADERBOARD_ELEVATION_TICK_MS);
    }

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.lbe + " is-demo"} ref={rootRef}>
        <ul className={styles.lbe__list} ref={listRef} role="list" />
        <p className={styles.lbe__sr} ref={srRef} aria-live="polite" />
      </div>
    </main>
  );
}
