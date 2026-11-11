import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./MultilevelSlide.module.scss";

export type MultilevelSlideLabels = {
  menuLabel: string;
  trigger: string;
  start: string;
  features: string;
  pricing: string;
  contact: string;
  makeList: string;
  share: string;
  importItems: string;
  copyLink: string;
  embed: string;
};

export type MultilevelSlideProps = {
  labels?: MultilevelSlideLabels;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string };
type BlurEvt = { relatedTarget: Node | null; currentTarget: Node };

const DEFAULT_LABELS: MultilevelSlideLabels = {
  menuLabel: "Library menu",
  trigger: "Library",
  start: "Get started",
  features: "Features",
  pricing: "Pricing",
  contact: "Contact",
  makeList: "Make a list",
  share: "Share",
  importItems: "Import",
  copyLink: "Copy link",
  embed: "Embed code",
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

function CaretRight() {
  return (
    <svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true">
      <g fill="currentColor">
        <path d="m176 128l-80 80V48Z" opacity=".2" />
        <path d="m181.66 122.34l-80-80A8 8 0 0 0 88 48v160a8 8 0 0 0 13.66 5.66l80-80a8 8 0 0 0 0-11.32M104 188.69V67.31L164.69 128Z" />
      </g>
    </svg>
  );
}

export default function MultilevelSlide({
  labels = DEFAULT_LABELS,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ffd23f",
}: MultilevelSlideProps) {
  const [live, setLive] = useState(true);
  const [l1, setL1] = useState(false);
  const [feat, setFeat] = useState(false);
  const [share, setShare] = useState(false);

  function wake() {
    setLive(false);
  }
  function closeAll() {
    wake();
    setL1(false);
    setFeat(false);
    setShare(false);
  }
  function leftSub(e: BlurEvt) {
    if (!e.currentTarget.contains(e.relatedTarget)) closeAll();
  }

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div
      className={[styles.mls, live ? styles.isDemo : "", l1 ? styles.isOpen : ""].join(" ")}
      style={vars}
      onPointerDownCapture={wake}
      onKeyDownCapture={wake}
      onKeyDown={(e: KeyEvt) => {
        if (e.key === "Escape") closeAll();
      }}
      onBlurCapture={leftSub}
    >
      <button
        type="button"
        className={styles.mlsTrigger}
        aria-expanded={l1}
        aria-haspopup="true"
        onClick={() => {
          wake();
          setL1(!l1);
        }}
        onFocus={() => {
          wake();
          setL1(true);
        }}
      >
        {labels.trigger}
        <span className={styles.mlsCaret}>
          <CaretDown />
        </span>
      </button>
      <nav className={styles.mlsL1} aria-label={labels.menuLabel}>
        <ul className={styles.mlsU}>
          <li className={styles.mlsI}>
            <a className={styles.mlsA} href="#">{labels.start}</a>
          </li>
          <li
            className={[styles.mlsI, styles.mlsParent, styles.iFeat].join(" ")}
            onMouseEnter={() => {
              wake();
              setFeat(true);
            }}
            onMouseLeave={() => setFeat(false)}
            onFocusCapture={() => setFeat(true)}
            onBlurCapture={(e: BlurEvt) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setFeat(false);
            }}
          >
            <button type="button" className={styles.mlsB} aria-expanded={feat} aria-haspopup="true">
              {labels.features}
              <span className={styles.mlsSubCaret}>
                <CaretRight />
              </span>
            </button>
            <ul className={[styles.mlsU, styles.mlsL2].join(" ")}>
              <li className={styles.mlsI}>
                <a className={styles.mlsA} href="#">{labels.makeList}</a>
              </li>
              <li
                className={[styles.mlsI, styles.mlsParent, styles.iShare].join(" ")}
                onMouseEnter={() => {
                  wake();
                  setShare(true);
                }}
                onMouseLeave={() => setShare(false)}
                onFocusCapture={() => setShare(true)}
                onBlurCapture={(e: BlurEvt) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) setShare(false);
                }}
              >
                <button type="button" className={styles.mlsB} aria-expanded={share} aria-haspopup="true">
                  {labels.share}
                  <span className={styles.mlsSubCaret}>
                    <CaretRight />
                  </span>
                </button>
                <ul className={[styles.mlsU, styles.mlsL3].join(" ")}>
                  <li className={styles.mlsI}>
                    <a className={styles.mlsA} href="#">{labels.copyLink}</a>
                  </li>
                  <li className={styles.mlsI}>
                    <a className={styles.mlsA} href="#">{labels.embed}</a>
                  </li>
                </ul>
              </li>
              <li className={styles.mlsI}>
                <a className={styles.mlsA} href="#">{labels.importItems}</a>
              </li>
            </ul>
          </li>
          <li className={styles.mlsI}>
            <a className={styles.mlsA} href="#">{labels.pricing}</a>
          </li>
          <li className={styles.mlsI}>
            <a className={styles.mlsA} href="#">{labels.contact}</a>
          </li>
        </ul>
      </nav>
    </div>
  );
}
