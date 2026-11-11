import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FullwideHoverPanel.module.scss";

export type FullwideHoverPanelLabels = {
  navLabel: string;
  brand: string;
  navAll: string;
  trigger: string;
  navFurniture: string;
  navHelp: string;
  colSeasonal: string;
  colPrice: string;
  colRecipient: string;
  itemsSeasonal: string[];
  itemsPrice: string[];
  itemsRecipient: string[];
  pickLabel: string;
  pickTitle: string;
  pickLink: string;
};

export type FullwideHoverPanelProps = {
  labels?: FullwideHoverPanelLabels;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string };

const DEFAULT_LABELS: FullwideHoverPanelLabels = {
  navLabel: "Main menu",
  brand: "Gift Box",
  navAll: "All",
  trigger: "Gifts",
  navFurniture: "Furniture",
  navHelp: "Help",
  colSeasonal: "Seasonal",
  colPrice: "Price range",
  colRecipient: "Recipient",
  itemsSeasonal: ["New Year set", "Summer cooler", "Winter blanket"],
  itemsPrice: ["$20 range", "$50 range", "$100 and up"],
  itemsRecipient: ["Family", "Coworkers", "Friends"],
  pickLabel: "This week's pick",
  pickTitle: "Cooler gift set",
  pickLink: "See details",
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

function ArrowUpRight() {
  return (
    <svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true">
      <g fill="currentColor">
        <path d="M192 64v104L88 64Z" opacity=".2" />
        <path d="M192 56H88a8 8 0 0 0-5.66 13.66L128.69 116l-70.35 70.34a8 8 0 0 0 11.32 11.32L140 127.31l46.34 46.35A8 8 0 0 0 200 168V64a8 8 0 0 0-8-8m-8 92.69l-38.34-38.34L107.31 72H184Z" />
      </g>
    </svg>
  );
}

export default function FullwideHoverPanel({
  labels = DEFAULT_LABELS,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: FullwideHoverPanelProps) {
  const [live, setLive] = useState(true);
  const [open, setOpen] = useState(false);

  function wake() {
    setLive(false);
  }
  function show() {
    wake();
    setOpen(true);
  }
  function hide() {
    wake();
    setOpen(false);
  }

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cols = [
    { title: labels.colSeasonal, items: labels.itemsSeasonal },
    { title: labels.colPrice, items: labels.itemsPrice },
    { title: labels.colRecipient, items: labels.itemsRecipient },
  ];

  return (
    <div
      className={[styles.fwp, live ? styles.isDemo : "", open ? styles.isOpen : ""].join(" ")}
      style={vars}
      onMouseLeave={hide}
      onPointerDownCapture={wake}
      onKeyDownCapture={wake}
      onKeyDown={(e: KeyEvt) => {
        if (e.key === "Escape") hide();
      }}
    >
      <header className={styles.fwpBar}>
        <span className={styles.fwpBrand}>{labels.brand}</span>
        <nav className={styles.fwpNav} aria-label={labels.navLabel}>
          <a className={styles.fwpLink} href="#">{labels.navAll}</a>
          <button
            type="button"
            className={styles.fwpTrigger}
            aria-expanded={open}
            aria-haspopup="true"
            onMouseEnter={show}
            onFocus={show}
            onClick={() => (open ? hide() : show())}
          >
            {labels.trigger}
            <span className={styles.fwpCaret}>
              <CaretDown />
            </span>
          </button>
          <a className={styles.fwpLink} href="#">{labels.navFurniture}</a>
          <a className={styles.fwpLink} href="#">{labels.navHelp}</a>
        </nav>
      </header>
      <div className={styles.fwpHints} aria-hidden="true">
        <span />
        <span />
      </div>
      <div className={styles.fwpPanel}>
        <div className={styles.fwpGrid}>
          {cols.map((c) => (
            <section className={styles.fwpCol} key={c.title}>
              <h3>{c.title}</h3>
              <ul>
                {c.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </section>
          ))}
          <aside className={styles.fwpPromo}>
            <span className={styles.fwpPromoLabel}>{labels.pickLabel}</span>
            <strong className={styles.fwpPromoTitle}>{labels.pickTitle}</strong>
            <a className={styles.fwpPromoLink} href="#">
              {labels.pickLink}
              <ArrowUpRight />
            </a>
          </aside>
        </div>
      </div>
    </div>
  );
}
