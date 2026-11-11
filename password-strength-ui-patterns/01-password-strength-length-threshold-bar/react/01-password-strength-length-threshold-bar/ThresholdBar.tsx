import { useEffect, useRef } from "react";
import styles from "./ThresholdBar.module.scss";

type Box<T> = { current: T };

const THRESHOLDS = [4, 8, 12, 16];
const STAGE_CLASS = ["pw--s0", "pw--s1", "pw--s2", "pw--s3", "pw--s4"];

export default function ThresholdBar() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;
  const inputRef = useRef(null) as unknown as Box<HTMLInputElement | null>;
  const fillRef = useRef(null) as unknown as Box<HTMLDivElement | null>;
  const labelRef = useRef(null) as unknown as Box<HTMLSpanElement | null>;
  const lenRef = useRef(null) as unknown as Box<HTMLElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    const input = inputRef.current;
    const fill = fillRef.current;
    const label = labelRef.current;
    const lenEl = lenRef.current;
    if (!root || !input || !fill || !label || !lenEl) return;

    // 계산 겹: 글자 수 값이 4개 경계(4·8·12·16)를 넘을 때마다 강도 단계(0~4)가 오른다.
    function stageOf(len: number) {
      let s = 0;
      for (let i = 0; i < THRESHOLDS.length; i++) { if (len >= THRESHOLDS[i]) s = i + 1; }
      return s;
    }

    function paint(value: string) {
      const len = value.length;
      const stage = stageOf(len);
      const ratio = stage / THRESHOLDS.length;
      fill!.style.transform = "scaleX(" + ratio + ")";
      STAGE_CLASS.forEach((c) => root!.classList.remove(styles[c]));
      root!.classList.add(styles[STAGE_CLASS[stage]]);
      label!.textContent = "경계 " + stage + "/4";
      lenEl!.textContent = String(len);
    }

    function onInput() {
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
      paint(input!.value);
    }
    input.addEventListener("input", onInput);
    paint(input.value);

    // 자동 루프: 시드 고정 문자열 배열로 글자 수를 늘렸다 줄이며 네 경계를 오간다.
    const SEQ = ["", "ab", "abcd", "abcdef", "abcdefgh", "abcdefghij", "abcdefghijkl",
      "abcdefghijklmn", "abcdefghijklmnop", "abcdefghijklmn", "abcdefghij",
      "abcdefgh", "abcd", ""];
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
    <div ref={rootRef} className={`${styles.stage} ${styles.pw} ${styles["is-demo"]} ${styles["pw--s0"]}`}>
      <label className={styles.field}>
        <input ref={inputRef} className={styles.input} type="text" autoComplete="off" spellCheck={false} defaultValue="" />
      </label>
      <div className={styles.track}>
        <span className={styles.tick} style={{ left: "25%" }} />
        <span className={styles.tick} style={{ left: "50%" }} />
        <span className={styles.tick} style={{ left: "75%" }} />
        <div ref={fillRef} className={styles.fill} />
      </div>
      <div className={styles.readout}>
        <span ref={labelRef} className={styles.label}>경계 0/4</span>
        <span className={styles.len}>글자 수 <b ref={lenRef}>0</b></span>
      </div>
    </div>
  );
}
