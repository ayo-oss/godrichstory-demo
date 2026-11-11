import { useEffect, useRef } from "react";
import styles from "./EntropyGauge.module.scss";

type Box<T> = { current: T };

const MAX_BITS = 100;

export default function EntropyGauge() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const input = root.querySelector(`.${styles.input}`) as HTMLInputElement | null;
    const bitsEl = root.querySelector(`.${styles.bitsNum}`) as HTMLElement | null;
    const fill = root.querySelector(`.${styles.fill}`) as HTMLElement | null;
    const setEl = root.querySelector(`.${styles.setSize}`) as HTMLElement | null;
    const lenEl = root.querySelector(`.${styles.len}`) as HTMLElement | null;
    if (!input || !bitsEl || !fill || !setEl || !lenEl) return;

    // 계산 겹: 섞인 문자 종류로 문자 집합 크기 값을 구하고, 글자 수 값을 곱한 뒤
    // 밑이 2인 로그를 취해 비트 값을 만든다.
    function charsetSize(value: string) {
      let size = 0;
      if (/[a-z]/.test(value)) size += 26;
      if (/[A-Z]/.test(value)) size += 26;
      if (/[0-9]/.test(value)) size += 10;
      if (/[^A-Za-z0-9]/.test(value)) size += 32;
      return size;
    }

    function bitsOf(value: string) {
      const size = charsetSize(value);
      if (!value.length || size === 0) return { bits: 0, size };
      return { bits: value.length * (Math.log(size) / Math.log(2)), size };
    }

    function paint(value: string) {
      const r = bitsOf(value);
      bitsEl!.textContent = String(Math.round(r.bits));
      fill!.style.transform = "scaleX(" + Math.min(1, r.bits / MAX_BITS) + ")";
      setEl!.textContent = String(r.size);
      lenEl!.textContent = String(value.length);
    }

    function onInput() {
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
      paint(input!.value);
    }
    input.addEventListener("input", onInput);
    paint(input.value);

    // 자동 루프: 시드 고정 문자열 배열로 길이·문자 집합을 함께 늘렸다 줄인다.
    const SEQ = ["", "abc", "abcdef", "abcdefgh12", "abcdefgh12AB", "abcdefgh12AB!@",
      "abcdefgh12AB!@#$%^", "abcdefgh12AB!@", "abcdefgh12AB", "abcdefgh12", "abcdef", "abc", ""];
    let si = 0;
    let autoTimer: number | null = null;
    function autoTick() { input!.value = SEQ[si]; paint(SEQ[si]); si = (si + 1) % SEQ.length; }
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(autoTick, 320); autoTick(); }

    return () => {
      stopAutoplay();
      input.removeEventListener("input", onInput);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.eb} ${styles["is-demo"]}`}>
      <label className={styles.field}>
        <input className={styles.input} type="text" autoComplete="off" spellCheck={false} defaultValue="" />
      </label>
      <div className={styles.bits}><b className={styles.bitsNum}>0</b><span>bit</span></div>
      <div className={styles.track}>
        <span className={styles.tick} style={{ left: "20%" }} />
        <span className={styles.tick} style={{ left: "40%" }} />
        <span className={styles.tick} style={{ left: "60%" }} />
        <span className={styles.tick} style={{ left: "80%" }} />
        <div className={styles.fill} />
      </div>
      <div className={styles.meta}>문자 집합 <b className={styles.setSize}>0</b> · 글자 수 <b className={styles.len}>0</b></div>
    </div>
  );
}
