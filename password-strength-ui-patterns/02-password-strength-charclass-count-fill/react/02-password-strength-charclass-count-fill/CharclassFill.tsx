import { useEffect, useRef } from "react";
import styles from "./CharclassFill.module.scss";

type Box<T> = { current: T };

const CLASSES = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/];
const LABELS = ["a-z", "A-Z", "0-9", "#%!"];

export default function CharclassFill() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const input = root.querySelector(`.${styles.input}`) as HTMLInputElement | null;
    const fill = root.querySelector(`.${styles.fill}`) as HTMLElement | null;
    const label = root.querySelector(`.${styles.label}`) as HTMLElement | null;
    const badges = Array.prototype.slice.call(
      root.querySelectorAll(`.${styles["cc__badge"]}`)
    ) as HTMLElement[];
    if (!input || !fill || !label) return;

    // 계산 겹: 입력 값을 4개 문자 종류 정규식으로 각각 검사해 참인 개수를 센다.
    function countClasses(value: string) {
      let n = 0;
      for (let i = 0; i < CLASSES.length; i++) {
        const hit = CLASSES[i].test(value);
        badges[i].classList.toggle(styles["cc__badge--on"], hit);
        if (hit) n++;
      }
      return n;
    }

    function paint(value: string) {
      const n = countClasses(value);
      fill!.style.transform = "scaleX(" + (n / CLASSES.length) + ")";
      label!.textContent = "문자 종류 " + n + "/4";
    }

    function onInput() {
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
      paint(input!.value);
    }
    input.addEventListener("input", onInput);
    paint(input.value);

    // 자동 루프: 시드 고정 문자열 배열로 문자 종류를 하나씩 늘렸다 줄인다.
    const SEQ = ["", "abc", "abcABC", "abcABC123", "abcABC123!@#", "abcABC123", "abcABC", "abc", ""];
    let si = 0;
    let autoTimer: number | null = null;
    function autoTick() { input!.value = SEQ[si]; paint(SEQ[si]); si = (si + 1) % SEQ.length; }
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(autoTick, 340); autoTick(); }

    return () => {
      stopAutoplay();
      input.removeEventListener("input", onInput);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.cc} ${styles["is-demo"]}`}>
      <label className={styles.field}>
        <input className={styles.input} type="text" autoComplete="off" spellCheck={false} defaultValue="" />
      </label>
      <div className={styles.badges}>
        {LABELS.map((l) => (
          <div key={l} className={styles["cc__badge"]}>
            <span>{l}</span>
          </div>
        ))}
      </div>
      <div className={styles.track}><div className={styles.fill} /></div>
      <div className={styles.label}>문자 종류 0/4</div>
    </div>
  );
}
