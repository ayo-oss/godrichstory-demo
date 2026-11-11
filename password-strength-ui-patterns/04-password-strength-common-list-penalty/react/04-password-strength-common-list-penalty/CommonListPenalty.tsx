import { useEffect, useRef } from "react";
import styles from "./CommonListPenalty.module.scss";

type Box<T> = { current: T };

const PENALTY = 40;

export default function CommonListPenalty() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const input = root.querySelector(`.${styles.input}`) as HTMLInputElement | null;
    const fill = root.querySelector(`.${styles.fill}`) as HTMLElement | null;
    const scoreEl = root.querySelector(`.${styles.scoreNum}`) as HTMLElement | null;
    const warn = root.querySelector(`.${styles.warn}`) as HTMLElement | null;
    if (!input || !fill || !scoreEl || !warn) return;

    // 계산 겹: 가상 흔한 값 소형 목록(일반 패턴형 10개, 외부 유출 목록 아님) — 실제 서비스명 0.
    const COMMON = ["password", "123456", "qwerty", "111111", "abc123",
      "letmein", "iloveyou", "admin", "welcome", "monkey"];

    function scoreOf(value: string) {
      const base = Math.min(100, value.length * 8);
      const hit = value.length > 0 && COMMON.indexOf(value.toLowerCase()) !== -1;
      const score = hit ? Math.max(0, base - PENALTY) : base;
      return { score, hit };
    }

    function paint(value: string) {
      const r = scoreOf(value);
      fill!.style.transform = "scaleX(" + r.score / 100 + ")";
      root!.classList.toggle(styles["cl--hit"], r.hit);
      scoreEl!.textContent = String(r.score);
      warn!.style.opacity = r.hit ? "1" : "0";
      warn!.style.transform = r.hit ? "scale(1)" : "scale(.7)";
    }

    function onInput() {
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
      paint(input!.value);
    }
    input.addEventListener("input", onInput);
    paint(input.value);

    // 자동 루프: 시드 고정 문자열 배열 — 흔한 값과 일반 값을 번갈아 입력한다.
    const SEQ = ["", "x7Ba9K2", "password", "x7Ba9K2Q", "123456", "GreenTiger42", "qwerty", ""];
    let si = 0;
    let autoTimer: number | null = null;
    function autoTick() { input!.value = SEQ[si]; paint(SEQ[si]); si = (si + 1) % SEQ.length; }
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(autoTick, 360); autoTick(); }

    return () => {
      stopAutoplay();
      input.removeEventListener("input", onInput);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.cl} ${styles["is-demo"]}`}>
      <label className={styles.field}>
        <input className={styles.input} type="text" autoComplete="off" spellCheck={false} defaultValue="" />
      </label>
      <div className={styles.track}><div className={styles.fill} /></div>
      <div className={styles.row}>
        <span className={styles.score}>값 <b className={styles.scoreNum}>0</b>/100</span>
        <span className={styles.warn}>흔한 값 <b>-{PENALTY}</b></span>
      </div>
    </div>
  );
}
