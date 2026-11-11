import { useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./LanguageTabSwitch.module.scss";

export type LanguageTabSwitchProps = {
  tablistLabel?: string;
  /** 자동 재생 루프 (갤러리용). 사람이 누르면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T | null };
type KeyEvt = { key: string; preventDefault(): void };

const LANGS = ["css", "scss", "tailwind"] as const;
type Lang = (typeof LANGS)[number];
const LABELS: Record<Lang, string> = { css: "CSS", scss: "SCSS", tailwind: "Tailwind" };
const TAB_CLASS_KEY: Record<Lang, "tabCss" | "tabScss" | "tabTw"> = { css: "tabCss", scss: "tabScss", tailwind: "tabTw" };

function CssCode() {
  return (
    <code>
      <span className={styles.k}>.btn</span> {"{"}
      {"\n  "}
      <span className={styles.k}>display</span>: <span className={styles.s}>flex</span>;
      {"\n  "}
      <span className={styles.k}>align-items</span>: <span className={styles.s}>center</span>;
      {"\n  "}
      <span className={styles.k}>gap</span>: <span className={styles.n}>8px</span>;
      {"\n  "}
      <span className={styles.k}>padding</span>: <span className={styles.n}>8px</span> <span className={styles.n}>16px</span>;
      {"\n}"}
    </code>
  );
}
function ScssCode() {
  return (
    <code>
      <span className={styles.k}>.btn</span> {"{"}
      {"\n  "}
      <span className={styles.k}>display</span>: <span className={styles.s}>flex</span>;
      {"\n  "}
      <span className={styles.k}>gap</span>: <span className={styles.n}>8px</span>;
      {"\n  "}
      <span className={styles.k}>&amp;:hover</span> {"{ "}
      <span className={styles.k}>opacity</span>: <span className={styles.n}>.8</span>; {"}"}
      {"\n}"}
    </code>
  );
}
function TailwindCode() {
  return (
    <code>
      <span className={styles.c}>{'<button class="'}</span>
      {"\n  "}
      <span className={styles.s}>flex items-center gap-2</span>
      {"\n  "}
      <span className={styles.s}>px-4 py-2 rounded-xl</span>
      {"\n"}
      <span className={styles.c}>{'">'}</span>
      {"\n  Copy\n"}
      <span className={styles.c}>{"</button>"}</span>
    </code>
  );
}
const CODES: Record<Lang, () => ReactNode> = { css: CssCode, scss: ScssCode, tailwind: TailwindCode };

export default function LanguageTabSwitch({
  tablistLabel = "Select language",
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: LanguageTabSwitchProps) {
  const [live, setLive] = useState(demo);
  const [active, setActive] = useState<Lang>("css");
  const [ind, setInd] = useState<{ left: number; scale: number }>({ left: 0, scale: 1 });
  const tablistRef = useRef<HTMLDivElement>(null) as Box<HTMLDivElement>;
  const tabRefs = useRef<Record<Lang, HTMLButtonElement | null>>({ css: null, scss: null, tailwind: null }) as Box<
    Record<Lang, HTMLButtonElement | null>
  >;

  function measure(lang: Lang) {
    const list = tablistRef.current;
    const map = tabRefs.current;
    if (!list || !map) return;
    const base = map.css;
    const tab = map[lang];
    if (!base || !tab) return;
    const listRect = list.getBoundingClientRect();
    const baseRect = base.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();
    setInd({ left: tabRect.left - listRect.left, scale: tabRect.width / baseRect.width });
  }

  function select(lang: Lang) {
    setLive(false);
    setActive(lang);
    measure(lang);
  }

  function onKeyDown(e: KeyEvt) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = LANGS.indexOf(active);
    const next = e.key === "ArrowRight" ? (i + 1) % LANGS.length : (i - 1 + LANGS.length) % LANGS.length;
    select(LANGS[next]);
    const btn = tabRefs.current ? tabRefs.current[LANGS[next]] : null;
    if (btn) btn.focus({ preventScroll: true });
  }

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const ActiveCode = CODES[active];

  function setTabRef(lang: Lang, el: HTMLButtonElement | null) {
    const map = tabRefs.current;
    if (map) map[lang] = el;
  }

  return (
    <div className={[styles.lts, live ? styles.isDemo : ""].join(" ")} style={vars}>
      <div className={styles.pane}>
        <div className={styles.paneHead}>
          <div
            className={styles.tabs}
            role="tablist"
            aria-label={tablistLabel}
            ref={tablistRef}
            onKeyDown={onKeyDown}
          >
            {LANGS.map((lang) => (
              <button
                key={lang}
                className={[styles.tab, styles[TAB_CLASS_KEY[lang]]].join(" ")}
                role="tab"
                type="button"
                aria-selected={live ? undefined : active === lang}
                tabIndex={live ? -1 : active === lang ? 0 : -1}
                ref={(el: HTMLButtonElement | null) => setTabRef(lang, el)}
                onClick={() => select(lang)}
              >
                {LABELS[lang]}
              </button>
            ))}
            <span
              className={styles.tabsIndicator}
              aria-hidden="true"
              style={live ? undefined : { transform: `translateX(${ind.left}px) scaleX(${ind.scale})` }}
            />
          </div>
        </div>
        <div className={styles.paneBody}>
          {live ? (
            <>
              <pre className={[styles.panel, styles.panelCss].join(" ")}>
                <CssCode />
              </pre>
              <pre className={[styles.panel, styles.panelScss].join(" ")}>
                <ScssCode />
              </pre>
              <pre className={[styles.panel, styles.panelTw].join(" ")}>
                <TailwindCode />
              </pre>
            </>
          ) : (
            <pre className={styles.panel}>
              <ActiveCode />
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
