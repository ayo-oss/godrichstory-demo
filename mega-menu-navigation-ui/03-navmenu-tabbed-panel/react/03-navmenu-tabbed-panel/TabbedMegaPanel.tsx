import { useState, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./TabbedMegaPanel.module.scss";

export type TabbedCard = { name: string; price: string; badge?: string };

export type TabbedMegaPanelLabels = {
  brand: string;
  trigger: string;
  tabsLabel: string;
  tabs: string[];
  cards: TabbedCard[][];
};

export type TabbedMegaPanelProps = {
  labels?: TabbedMegaPanelLabels;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault(): void };
type Box<T> = { current: T };
type BtnRef = (el: HTMLButtonElement | null) => void;

const DEFAULT_LABELS: TabbedMegaPanelLabels = {
  brand: "Homeware",
  trigger: "Shop",
  tabsLabel: "Shop menu",
  tabs: ["Popular", "New", "Sale"],
  cards: [
    [
      { name: "Wall shelf", price: "24,000" },
      { name: "Mini planter", price: "9,800" },
      { name: "Mood lamp", price: "16,500" },
    ],
    [
      { name: "Bamboo desk", price: "89,000" },
      { name: "Glass cup set", price: "19,900" },
      { name: "Drawer unit", price: "42,000" },
    ],
    [
      { name: "Rug", price: "27,300", badge: "30%" },
      { name: "Hanger", price: "31,200", badge: "20%" },
      { name: "Mirror", price: "15,400", badge: "45%" },
    ],
  ],
};

function CaretDown() {
  return (
    <svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true">
      <g fill="currentColor">
        <path d="m208 96l-80 80l-80-80Z" opacity=".2" />
        <path d="M215.39 92.94A8 8 0 0 0 208 88H48a8 8 0 0 0-5.66 13.66l80 80a8 8 0 0 0 11.32 0l80-80a8 8 0 0 0 1.73-8.72M128 164.69L67.31 104h121.38Z" />
      </g>
    </svg>
  );
}

function CardView({ card, j }: { card: TabbedCard; j: number; key?: string }) {
  return (
    <li className={styles.card}>
      <span className={[styles.block, styles["block" + (j % 3)]].join(" ")}>
        {card.badge ? <span className={styles.badge}>{card.badge}</span> : null}
      </span>
      <strong className={styles.name}>{card.name}</strong>
      <span className={styles.price}>{card.price}</span>
    </li>
  );
}

export default function TabbedMegaPanel({
  labels = DEFAULT_LABELS,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: TabbedMegaPanelProps) {
  const [live, setLive] = useState(true);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]) as Box<(HTMLButtonElement | null)[]>;

  function wake() {
    setLive(false);
  }
  function openPanel() {
    wake();
    setOpen(true);
  }
  function closePanel() {
    wake();
    setOpen(false);
  }
  function select(i: number) {
    wake();
    setTab(i);
  }
  function setTabRef(i: number): BtnRef {
    return (el: HTMLButtonElement | null) => {
      tabRefs.current[i] = el;
    };
  }
  function onTabsKey(e: KeyEvt) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = e.key === "ArrowRight" ? (tab + 1) % 3 : (tab + 2) % 3;
    select(next);
    const btn = tabRefs.current[next];
    if (btn) btn.focus({ preventScroll: true });
  }

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div
      className={[styles.tmp, live ? styles.isDemo : "", open ? styles.isOpen : ""].join(" ")}
      style={vars}
      onPointerDownCapture={wake}
      onKeyDownCapture={wake}
      onKeyDown={(e: KeyEvt) => {
        if (e.key === "Escape") closePanel();
      }}
    >
      <header className={styles.tmpBar}>
        <span className={styles.tmpBrand}>{labels.brand}</span>
        <button
          type="button"
          className={styles.tmpTrigger}
          aria-expanded={open}
          aria-haspopup="true"
          onClick={() => (open ? closePanel() : openPanel())}
        >
          {labels.trigger}
          <span className={styles.tmpCaret}>
            <CaretDown />
          </span>
        </button>
      </header>
      <div className={styles.tmpPanel}>
        <div className={styles.tmpTabs} role="tablist" aria-label={labels.tabsLabel} onKeyDown={onTabsKey}>
          {labels.tabs.map((t, i) => (
            <button
              key={t}
              type="button"
              role="tab"
              id={"tmp-tab-" + i}
              aria-controls={"tmp-set-" + i}
              className={live ? [styles.tab, styles["tab" + i]].join(" ") : styles.tab}
              aria-selected={live ? undefined : tab === i}
              tabIndex={live ? -1 : tab === i ? 0 : -1}
              ref={setTabRef(i)}
              onClick={() => select(i)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className={styles.tmpBody}>
          {live ? (
            labels.cards.map((set, i) => (
              <ul
                key={i}
                id={"tmp-set-" + i}
                role="tabpanel"
                aria-labelledby={"tmp-tab-" + i}
                className={[styles.set, styles["set" + i]].join(" ")}
              >
                {set.map((c, j) => (
                  <CardView card={c} j={j} key={c.name} />
                ))}
              </ul>
            ))
          ) : (
            <ul
              key={tab}
              id={"tmp-set-" + tab}
              role="tabpanel"
              aria-labelledby={"tmp-tab-" + tab}
              className={styles.set}
            >
              {labels.cards[tab].map((c, j) => (
                <CardView card={c} j={j} key={c.name} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
