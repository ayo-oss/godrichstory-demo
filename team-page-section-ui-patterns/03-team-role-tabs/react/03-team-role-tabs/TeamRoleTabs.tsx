// TeamRoleTabs — vanilla 판(run/338/demo/03-team-role-tabs/index.html) 의 React 포트.
// 팀원 배열을 role 값으로 filter 해 탭 라벨의 인원수를 계산하고, 선택된 탭의 getBoundingClientRect
// 로 좌표·너비를 읽어 밑줄 인디케이터의 translateX·width 를 맞춘다(계산 한 겹).
import { useEffect, useRef } from "react";
import styles from "./TeamRoleTabs.module.scss";

export type TeamRoleTabsProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "필터 결과 인원수를 탭 라벨에 계산해 붙이고 밑줄은 선택된 탭의 실측 좌표를 따라갑니다";
const BAR_LABEL = "역할 필터";
const PANEL_LABEL = "필터 결과";

type Role = "all" | "design" | "dev" | "ops";
type Member = { id: number; role: "design" | "dev" | "ops" };

const TAB_TEXT: { key: Role; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "design", label: "디자인" },
  { key: "dev", label: "개발" },
  { key: "ops", label: "운영" }
];

const ROLES: Member["role"][] = ["design", "design", "design", "design", "dev", "dev", "dev", "dev", "ops", "ops"];
const MEMBERS: Member[] = ROLES.map((role, i) => ({ id: i, role }));
const KEYS: Role[] = ["all", "design", "dev", "ops"];

function mulberry32(a: number): () => number {
  return function (): number {
    a |= 0; a = a + 0x6d2b79f5 | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HEXES = ["#9fc9ec", "#93d9c0", "#b9a0ff", "#f6c6d3"];

function drawAvatar(cv: HTMLCanvasElement, seed: number, label: string): void {
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  const rnd = mulberry32(seed);
  const s = cv.width;
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

function countFor(key: Role): number {
  return key === "all" ? MEMBERS.length : MEMBERS.filter((m) => m.role === key).length;
}

export default function TeamRoleTabs({
  duration = "220ms",
  easing = "ease-out",
  color = "#17141a"
}: TeamRoleTabsProps) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const indicatorRef = useRef<HTMLSpanElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const bar = barRef.current;
    const indicator = indicatorRef.current;
    const panel = panelRef.current;
    if (!bar || !indicator || !panel) return;
    const tabs = Array.prototype.slice.call(bar.querySelectorAll("." + styles.tab)) as HTMLButtonElement[];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function moveIndicator(tab: HTMLElement): void {
      const barRect = bar!.getBoundingClientRect();
      const tabRect = tab.getBoundingClientRect();
      const ix = tabRect.left - barRect.left;
      const iw = tabRect.width;
      indicator!.style.setProperty("--ix", ix.toFixed(1) + "px");
      indicator!.style.setProperty("--iw", iw.toFixed(1) + "px");
    }

    function renderPanel(key: Role): void {
      const list = key === "all" ? MEMBERS : MEMBERS.filter((m) => m.role === key);
      panel!.innerHTML = "";
      list.slice(0, 6).forEach((m) => {
        const chip = document.createElement("div");
        chip.className = styles.chip;
        chip.setAttribute("role", "listitem");
        const cv = document.createElement("canvas");
        cv.width = 22; cv.height = 22; cv.className = styles.cv;
        cv.setAttribute("aria-hidden", "true");
        chip.appendChild(cv);
        panel!.appendChild(chip);
        drawAvatar(cv, 5 + m.id * 9, "M" + (m.id + 1));
      });
      panel!.classList.remove(styles.panelIn);
      void panel!.offsetWidth;
      panel!.classList.add(styles.panelIn);
    }

    function selectTab(key: Role): void {
      const target = bar!.querySelector('[data-key="' + key + '"]') as HTMLElement | null;
      if (!target) return;
      tabs.forEach((t) => t.setAttribute("aria-selected", t === target ? "true" : "false"));
      moveIndicator(target);
      renderPanel(key);
    }

    let idx = 0;
    tabs.forEach((t) => {
      t.addEventListener("click", () => {
        const key = t.getAttribute("data-key") as Role;
        idx = KEYS.indexOf(key);
        selectTab(key);
      });
    });

    selectTab(KEYS[0]);
    const onResize = (): void => selectTab(KEYS[idx]);
    window.addEventListener("resize", onResize);

    let timer = 0;
    if (!reduce) {
      timer = window.setInterval(() => {
        idx = (idx + 1) % KEYS.length;
        selectTab(KEYS[idx]);
      }, 340);
    }

    return () => {
      window.removeEventListener("resize", onResize);
      if (timer) window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <section className={styles.tabs}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.bar} ref={barRef} role="tablist" aria-label={BAR_LABEL}>
          {TAB_TEXT.map((t, i) => (
            <button
              key={t.key}
              className={styles.tab}
              data-key={t.key}
              role="tab"
              aria-selected={i === 0 ? "true" : "false"}
              type="button"
            >
              {t.label + " "}
              <span className={styles.count}>{countFor(t.key)}</span>
            </button>
          ))}
          <span className={styles.indicator} ref={indicatorRef} aria-hidden="true" />
        </div>
        <div className={styles.panel} ref={panelRef} role="list" aria-label={PANEL_LABEL} />
      </section>
    </main>
  );
}
