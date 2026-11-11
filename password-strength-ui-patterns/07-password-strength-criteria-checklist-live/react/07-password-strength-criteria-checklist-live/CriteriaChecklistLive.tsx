import { useEffect, useRef } from "react";
import styles from "./CriteriaChecklistLive.module.scss";

type Box<T> = { current: T };

const CHECKS: Record<string, (v: string) => boolean> = {
  len: (v) => v.length >= 8,
  upper: (v) => /[A-Z]/.test(v),
  digit: (v) => /[0-9]/.test(v),
  special: (v) => /[^A-Za-z0-9]/.test(v),
};

const CHECK_ICON = "M4 10.5l3.5 3.5L16 5.5";

export default function CriteriaChecklistLive() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const input = root.querySelector(`.${styles.input}`) as HTMLInputElement | null;
    const items = root.querySelectorAll(`.${styles.item}`);
    const fill = root.querySelector(`.${styles.fill}`) as HTMLElement | null;
    if (!input || !fill || items.length === 0) return;

    // 계산 겹: 4개 기준을 각각 판정해 참인 개수를 세고, 그 비율(개수/4)로
    // 막대 채움을 맞춘다 — 배지는 개수가 아니라 각 기준의 참/거짓으로 켜진다.
    function paint(value: string) {
      let met = 0;
      items.forEach((li) => {
        const key = (li as HTMLElement).getAttribute("data-key") || "";
        const ok = CHECKS[key] ? CHECKS[key](value) : false;
        li.classList.toggle(styles["item--on"], ok);
        if (ok) met++;
      });
      fill!.style.transform = "scaleX(" + met / items.length + ")";
    }

    function onInput() {
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
      paint(input!.value);
    }
    input.addEventListener("input", onInput);
    paint(input.value);

    // 자동 루프: 시드 고정 문자열 배열로 기준을 하나씩 채웠다 되돌린다.
    const SEQ = ["", "short", "longenough", "longenoughA", "longenoughA1", "longenoughA1!",
      "longenoughA1", "longenoughA", "longenough", "short", ""];
    let si = 0;
    let autoTimer: number | null = null;
    function autoTick() { input!.value = SEQ[si]; paint(SEQ[si]); si = (si + 1) % SEQ.length; }
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(autoTick, 380); autoTick(); }

    return () => {
      stopAutoplay();
      input.removeEventListener("input", onInput);
    };
  }, []);

  const rows: Array<[string, string]> = [
    ["len", "8자 이상"],
    ["upper", "대문자 포함"],
    ["digit", "숫자 포함"],
    ["special", "특수문자 포함"],
  ];

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.cx} ${styles["is-demo"]}`}>
      <label className={styles.field}>
        <input className={styles.input} type="text" autoComplete="off" spellCheck={false} defaultValue="" />
      </label>
      <ul className={styles.list}>
        {rows.map(([key, label]) => (
          <li key={key} className={styles.item} data-key={key}>
            <span className={styles.badge}>
              <svg viewBox="0 0 20 20" width="12" height="12" aria-hidden="true">
                <path d={CHECK_ICON} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span>{label}</span>
          </li>
        ))}
      </ul>
      <div className={styles.track}><div className={styles.fill} /></div>
    </div>
  );
}
