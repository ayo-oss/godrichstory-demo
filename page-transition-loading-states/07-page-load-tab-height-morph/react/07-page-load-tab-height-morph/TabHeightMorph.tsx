import { useState, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./TabHeightMorph.module.scss";

export type TabHeightMorphItem = { tab: string; price: string; desc: string };

export type TabHeightMorphProps = {
  /** 탭 라벨과 그 안의 내용. 설명 길이가 제각각이어도 높이가 따라 늘어난다 */
  items?: TabHeightMorphItem[];
  groupLabel?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// ambient 가 얇아 KeyboardEvent·HTMLElement 를 못 쓴다 — 필요한 꼴만 로컬 타입으로 선언
type KeyEvt = { key: string; preventDefault(): void };
type Focusable = { focus(o: { preventScroll: boolean }): void };
type Box<T> = { current: T };

const DEFAULT_ITEMS: TabHeightMorphItem[] = [
  { tab: "Free", price: "$0", desc: "Enough when it is just you." },
  {
    tab: "Pro",
    price: "$9 / month",
    desc:
      "Keep an unlimited history, use every export format, and roll back anything you changed in the last 30 days. Replies arrive within a day.",
  },
  { tab: "Team", price: "$24 / month", desc: "Up to five people share one workspace." },
];

let seq = 0;

export default function TabHeightMorph({
  items = DEFAULT_ITEMS,
  groupLabel = "Pricing tabs",
  demo = true,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: TabHeightMorphProps) {
  const [current, setCurrent] = useState(0);
  const [live, setLive] = useState(demo);
  const [uid] = useState<string>(() => "tab-height-morph-" + String(++seq));
  // useRef 는 { current: T | null } 이라 배열로 쓸 땐 단언이 필요하다
  const tabRefs = useRef<(Focusable | null)[]>([]) as Box<(Focusable | null)[]>;

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function select(i: number) {
    setLive(false);
    setCurrent(i);
  }

  function onKeyDown(e: KeyEvt, i: number) {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) return;
    e.preventDefault();
    const next = (i + step + items.length) % items.length;
    select(next);
    const el = tabRefs.current[next];
    // iframe 안에서 무가드 focus 는 부모 페이지를 끌어당긴다
    if (el) el.focus({ preventScroll: true });
  }

  const cls = [styles.th, live ? styles.isDemo : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars}>
      <div className={styles.tabs} role="tablist" aria-label={groupLabel}>
        {items.map((it, i) => (
          <button
            key={it.tab}
            className={styles.tab}
            type="button"
            role="tab"
            id={`${uid}-t${i}`}
            aria-controls={`${uid}-p${i}`}
            aria-selected={i === current}
            tabIndex={i === current ? 0 : -1}
            ref={(el: Focusable | null) => {
              tabRefs.current[i] = el;
            }}
            onClick={() => select(i)}
            onKeyDown={(e: KeyEvt) => onKeyDown(e, i)}
          >
            {it.tab}
          </button>
        ))}
      </div>

      <div className={styles.panels}>
        {items.map((it, i) => (
          <div
            key={it.tab}
            className={[styles.panel, i === current ? styles.isOpen : ""].filter(Boolean).join(" ")}
            role="tabpanel"
            id={`${uid}-p${i}`}
            aria-labelledby={`${uid}-t${i}`}
            aria-hidden={i !== current}
          >
            {/* 0fr 칸이 실제로 접히려면 이 래퍼에 min-height: 0 과 overflow: hidden 이 둘 다 있어야 한다 */}
            <div className={styles.clip}>
              <div className={styles.body}>
                <p className={styles.price}>{it.price}</p>
                <p className={styles.desc}>{it.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
