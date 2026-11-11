import { useEffect, useRef } from "react";
import styles from "./LeaderboardScoreDigitRoll.module.scss";

type Box<T> = { current: T };

const LEADERBOARD_DIGIT_ROLL_STAGGER_MS = 30;
const LEADERBOARD_DIGIT_ROLL_MS = 380;
const LEADERBOARD_DIGIT_H = 22;
const LEADERBOARD_DIGIT_TICK_MS = 300;

function seedRand(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

type Player = { id: string; name: string; score: number };
type RowNodes = {
  li: HTMLLIElement;
  reels: HTMLSpanElement[];
  digitBoxes: HTMLSpanElement[];
  prevDigits: number[];
};

export default function LeaderboardScoreDigitRoll() {
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
      { id: "p1", name: "AXIS_4", score: 780 },
      { id: "p2", name: "MIRA_Q", score: 742 },
      { id: "p3", name: "TROVE1", score: 705 },
      { id: "p4", name: "HALO_9", score: 668 },
      { id: "p5", name: "SABLE2", score: 631 }
    ];

    const nodes: Record<string, RowNodes> = {};
    let timer: number | undefined;

    function human() {
      if (root.classList.contains("is-demo")) root.classList.remove("is-demo");
    }

    function buildReel(container: HTMLElement) {
      for (let d = 0; d <= 9; d++) {
        const s = document.createElement("span");
        s.textContent = String(d);
        container.appendChild(s);
      }
    }

    function rollTo(row: RowNodes, score: number) {
      let str = String(score);
      while (str.length < 3) str = "0" + str;
      let changed = false;
      for (let i = 0; i < 3; i++) {
        const digit = parseInt(str[i], 10);
        const delay = reduce ? 0 : i * LEADERBOARD_DIGIT_ROLL_STAGGER_MS;
        const dur = reduce ? 0 : LEADERBOARD_DIGIT_ROLL_MS;
        const reel = row.reels[i];
        const box = row.digitBoxes[i];
        reel.style.transitionDelay = delay + "ms";
        reel.style.transitionDuration = dur + "ms";
        reel.style.transform = "translateY(-" + digit * LEADERBOARD_DIGIT_H + "px)";
        if (!reduce && row.prevDigits[i] !== digit) {
          changed = true;
          box.style.setProperty("--roll-delay", delay + "ms");
          box.style.setProperty("--roll-ms", dur + "ms");
          box.classList.remove("is-rolling");
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          box.offsetWidth;
          box.classList.add("is-rolling");
          window.setTimeout(() => box.classList.remove("is-rolling"), delay + dur + 60);
        }
        row.prevDigits[i] = digit;
      }
      if (!reduce && changed) {
        const span = 2 * LEADERBOARD_DIGIT_ROLL_STAGGER_MS + LEADERBOARD_DIGIT_ROLL_MS + 60;
        row.li.style.setProperty("--row-glow-ms", span + "ms");
        row.li.classList.remove("is-hot");
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        row.li.offsetWidth;
        row.li.classList.add("is-hot");
        window.setTimeout(() => row.li.classList.remove("is-hot"), span);
      }
    }

    function bump(id: string) {
      const p = players.filter((x) => x.id === id)[0];
      p.score = Math.min(999, p.score + 30 + Math.floor(rand() * 70));
      rollTo(nodes[id], p.score);
      sr.textContent = p.name + " 점수 " + p.score + "점";
    }

    // 한 틱에 서로 다른 참가자 여러 명의 점수를 동시에 올려, 여러 행의 여러 자릿수가
    // 한꺼번에 돌아가게 한다.
    function bumpMany() {
      const pool = players.slice();
      const picks: Player[] = [];
      for (let n = 0; n < 5 && pool.length; n++) {
        const i = Math.floor(rand() * pool.length);
        picks.push(pool.splice(i, 1)[0]);
      }
      picks.forEach((p) => {
        p.score = Math.min(999, p.score + 55 + Math.floor(rand() * 120));
        rollTo(nodes[p.id], p.score);
      });
    }

    players.forEach((p) => {
      const li = document.createElement("li");
      li.className = styles.lbd__row;
      li.setAttribute("role", "listitem");
      li.tabIndex = 0;

      const name = document.createElement("span");
      name.className = styles.lbd__name;
      name.textContent = p.name;

      const scoreWrap = document.createElement("span");
      scoreWrap.className = styles.lbd__score;
      const reels: HTMLSpanElement[] = [];
      const digitBoxes: HTMLSpanElement[] = [];
      for (let i = 0; i < 3; i++) {
        const digitBox = document.createElement("span");
        digitBox.className = styles.lbd__digit;
        const reel = document.createElement("span");
        reel.className = styles.lbd__reel;
        buildReel(reel);
        digitBox.appendChild(reel);
        scoreWrap.appendChild(digitBox);
        reels.push(reel);
        digitBoxes.push(digitBox);
      }

      li.appendChild(name);
      li.appendChild(scoreWrap);

      let initStr = String(p.score);
      while (initStr.length < 3) initStr = "0" + initStr;
      nodes[p.id] = {
        li, reels, digitBoxes,
        prevDigits: [parseInt(initStr[0], 10), parseInt(initStr[1], 10), parseInt(initStr[2], 10)]
      };

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

    players.forEach((p) => rollTo(nodes[p.id], p.score));
    Object.keys(nodes).forEach((id) => {
      nodes[id].reels.forEach((r) => {
        r.style.transitionDuration = "0ms";
      });
    });
    window.setTimeout(() => {
      Object.keys(nodes).forEach((id) => {
        nodes[id].reels.forEach((r) => {
          r.style.transitionDuration = "";
        });
      });
    }, 30);

    if (!reduce) {
      const loop = () => {
        if (root.classList.contains("is-demo")) {
          bumpMany();
        }
        timer = window.setTimeout(loop, LEADERBOARD_DIGIT_TICK_MS);
      };
      timer = window.setTimeout(loop, LEADERBOARD_DIGIT_TICK_MS);
    }

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.lbd + " is-demo"} ref={rootRef}>
        <ul className={styles.lbd__list} ref={listRef} role="list" />
        <p className={styles.lbd__sr} ref={srRef} aria-live="polite" />
      </div>
    </main>
  );
}
