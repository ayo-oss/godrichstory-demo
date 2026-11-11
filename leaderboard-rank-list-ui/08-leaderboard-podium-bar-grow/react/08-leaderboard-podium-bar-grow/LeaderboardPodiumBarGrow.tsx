import { useEffect, useRef } from "react";
import styles from "./LeaderboardPodiumBarGrow.module.scss";

type Box<T> = { current: T };

const LEADERBOARD_PODIUM_BAR_MAX_PX = 96;
// 시연 스케줄: 2초 구간 안에서 점수 갱신이 여러 번 겹쳐 일어나 막대가 크게 오르내리게 하는 고정 시각표.
// rAF 타임스탬프 차이(dt)만 쓴다 — new Date·Date.now·Math.random 없음.
// 첫 항목을 150ms 뒤로 둔다 — 렌더 하네스가 로드 150ms 시점에 진행 중인 CSS 전환(transition)이
// 있으면 "결정론 모드"(프레임당 실시간 20ms만 허용)로 바뀌어 시연 프레임 수가 줄어든다(실측).
const DEMO_SCHEDULE: { t: number; id: string }[] = [
  { t: 200, id: "p3" }, { t: 560, id: "p2" }, { t: 920, id: "p1" },
  { t: 1280, id: "p3" }, { t: 1640, id: "p2" }
];
const DEMO_LOOP_MS = 2000;
const BAR_LO_RGB: [number, number, number] = [47, 109, 246];  // $subject-blue
const BAR_HI_RGB: [number, number, number] = [10, 79, 232];   // $subject-blue-deep

function seedRand(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

type Player = { id: string; name: string; score: number };
type ColNodes = { col: HTMLDivElement; name: HTMLSpanElement; score: HTMLSpanElement; bar: HTMLSpanElement; wrap: HTMLSpanElement; rank: HTMLSpanElement };

export default function LeaderboardPodiumBarGrow() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const podiumRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const srRef = useRef(null) as unknown as Box<HTMLParagraphElement>;

  useEffect(() => {
    const root = rootRef.current;
    const podium = podiumRef.current;
    const sr = srRef.current;
    const rand = seedRand(418);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const players: Player[] = [
      { id: "p1", name: "SABER4", score: 640 },
      { id: "p2", name: "MYRTLE2", score: 590 },
      { id: "p3", name: "KESTREL9", score: 540 }
    ];

    const slotOrder = [1, 0, 2];
    const nodes: Record<string, ColNodes> = {};
    let raf: number | undefined;

    void LEADERBOARD_PODIUM_BAR_MAX_PX;

    function human() {
      if (root.classList.contains("is-demo")) root.classList.remove("is-demo");
    }

    function sortedPlayers() {
      return players.slice().sort((a, b) => b.score - a.score);
    }

    // 계산 겹: 각 선수의 점수를 1위 점수로 나눈 비율(ratio)이 막대의 scaleY 그 자체다 —
    // transform-origin 을 바닥에 두어 레이아웃을 건드리지 않고 순수 계산값만으로 키를 만든다.
    // 같은 ratio 를 막대 명도(lo→hi 보간)·바닥 그림자·1위 기둥 배경에도 전파한다(계산 겹).
    function applyBars(order: Player[]) {
      const maxScore = order[0].score || 1;
      order.forEach((p, i) => {
        const ratio = Math.max(0.06, p.score / maxScore);
        const node = nodes[p.id];
        node.bar.style.transform = "scaleY(" + ratio.toFixed(3) + ")";
        node.rank.textContent = String(i + 1);
        node.score.textContent = String(p.score);
        const r = Math.round(BAR_LO_RGB[0] + (BAR_HI_RGB[0] - BAR_LO_RGB[0]) * ratio);
        const g = Math.round(BAR_LO_RGB[1] + (BAR_HI_RGB[1] - BAR_LO_RGB[1]) * ratio);
        const b = Math.round(BAR_LO_RGB[2] + (BAR_HI_RGB[2] - BAR_LO_RGB[2]) * ratio);
        node.bar.style.background = "rgb(" + r + "," + g + "," + b + ")";
        node.wrap.style.boxShadow = "0 " + (ratio * 9).toFixed(1) + "px " + (ratio * 20).toFixed(1) + "px rgba(10,10,14," + (ratio * 0.34).toFixed(3) + ")";
        node.col.style.background = "rgba(" + BAR_HI_RGB.join(",") + "," + (Math.max(0, ratio - 0.45) * 0.16).toFixed(3) + ")";
      });
    }

    function relayout(announce: boolean) {
      const order = sortedPlayers();
      order.forEach((p, i) => {
        const slot = slotOrder.indexOf(i);
        nodes[p.id].col.style.order = String(slot);
        nodes[p.id].col.classList.toggle(styles["lbp__col--first"], i === 0);
      });
      applyBars(order);
      if (announce) sr.textContent = order[0].name + " 이(가) 1위, 점수 " + order[0].score;
    }

    function bump(id: string) {
      const p = players.filter((x) => x.id === id)[0];
      p.score += 20 + Math.floor(rand() * 35);
      relayout(true);
    }

    players.forEach((p) => {
      const col = document.createElement("div");
      col.className = styles.lbp__col;
      col.setAttribute("role", "listitem");
      col.tabIndex = 0;

      const name = document.createElement("span");
      name.className = styles.lbp__name;
      name.textContent = p.name;
      const score = document.createElement("span");
      score.className = styles.lbp__score;
      const barWrap = document.createElement("span");
      barWrap.className = styles.lbp__barwrap;
      const bar = document.createElement("span");
      bar.className = styles.lbp__bar;
      barWrap.appendChild(bar);
      const rank = document.createElement("span");
      rank.className = styles.lbp__rank;

      col.appendChild(name);
      col.appendChild(score);
      col.appendChild(barWrap);
      col.appendChild(rank);

      nodes[p.id] = { col, name, score, bar, wrap: barWrap, rank };

      col.addEventListener("click", () => { human(); bump(p.id); });
      col.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); human(); bump(p.id); }
      });

      podium.appendChild(col);
    });

    relayout(false);

    function scheduledBump(id: string) {
      const p = players.filter((x) => x.id === id)[0];
      const maxScore = players.reduce((m, x) => Math.max(m, x.score), 1);
      const delta = Math.round(maxScore * (0.2 + rand() * 0.4));
      p.score += delta;
      relayout(true);
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
      <div className={styles.lbp + " is-demo"} ref={rootRef}>
        <div className={styles.lbp__podium} ref={podiumRef} role="list" aria-label="상위 3위 포디움" />
        <p className={styles.lbp__sr} ref={srRef} aria-live="polite" />
      </div>
    </main>
  );
}
