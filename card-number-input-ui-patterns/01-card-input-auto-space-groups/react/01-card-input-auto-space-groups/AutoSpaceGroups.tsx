import { useEffect, useRef } from "react";
import styles from "./AutoSpaceGroups.module.scss";

type Box<T> = { current: T };

export default function AutoSpaceGroups() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const input = root.querySelector(`.${styles.input}`) as HTMLInputElement | null;
    const segFills = root.querySelectorAll(`.${styles.segFill}`);
    const gaps = root.querySelectorAll(`.${styles.gap}`);
    if (!input || segFills.length === 0) return;

    // 계산 겹: 자릿수 값을 4개씩 묶어 다시 조립하고, 커서 위치 값을 digit count 로
    // 환산해 삽입된 간격 값 개수만큼 보정한다 — 그냥 재대입하면 커서가 맨 끝으로 튄다.
    function digitsBefore(str: string, upto: number) {
      return str.slice(0, upto).replace(/\D/g, "").length;
    }

    function groupsOf(rawDigits: string) {
      const g: string[] = rawDigits.match(/.{1,4}/g) || [];
      while (g.length < 4) g.push("");
      return g;
    }

    function paintTrack(rawDigits: string) {
      const g = groupsOf(rawDigits);
      for (let i = 0; i < 4; i++) {
        (segFills[i] as HTMLElement).style.transform = "scaleX(" + g[i].length / 4 + ")";
      }
      for (let j = 0; j < 3; j++) {
        const on = rawDigits.length > (j + 1) * 4;
        gaps[j].classList.toggle(styles["gap--on"], on);
      }
    }

    function reformat(prevCaret: number) {
      const prevDigits = digitsBefore(input!.value, prevCaret);
      const rawDigits = input!.value.replace(/\D/g, "").slice(0, 16);
      const groups = rawDigits.match(/.{1,4}/g) || [];
      input!.value = groups.join(" ");
      // 커서 위치 보정: 앞선 자릿수 값 개수 + 그 앞에 이미 생긴 간격 값 개수(4자리마다 1개)
      const spacesBefore = Math.floor(Math.max(prevDigits - 1, 0) / 4);
      const newCaret = Math.min(prevDigits + spacesBefore, input!.value.length);
      input!.setSelectionRange(newCaret, newCaret);
      paintTrack(rawDigits);
    }

    function onInput() {
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
      reformat(input!.selectionStart || 0);
    }
    input.addEventListener("input", onInput);

    // 자동 루프: 시드 고정 자릿수 값을 한 자리씩 늘렸다 줄인다.
    const FULL = "9999999999999995";
    const SEQ: string[] = [];
    for (let i = 0; i <= FULL.length; i++) SEQ.push(FULL.slice(0, i));
    for (let k = FULL.length - 1; k >= 0; k--) SEQ.push(FULL.slice(0, k));
    let si = 0;
    let autoTimer: number | null = null;
    function autoTick() {
      const rawDigits = SEQ[si];
      const groups = rawDigits.match(/.{1,4}/g) || [];
      input!.value = groups.join(" ");
      paintTrack(rawDigits);
      si = (si + 1) % SEQ.length;
    }
    function stopAutoplay() {
      if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; }
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(autoTick, 160); autoTick(); }
    else { autoTick(); }

    return () => {
      stopAutoplay();
      input.removeEventListener("input", onInput);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.ci} ${styles["is-demo"]}`}>
      <label className={styles.field}>
        <input className={styles.input} type="text" inputMode="numeric" autoComplete="off" spellCheck={false} maxLength={19} defaultValue="" />
      </label>
      <div className={styles.track} aria-hidden="true">
        <span className={styles.seg}><span className={styles.segFill} /></span>
        <span className={styles.gap} />
        <span className={styles.seg}><span className={styles.segFill} /></span>
        <span className={styles.gap} />
        <span className={styles.seg}><span className={styles.segFill} /></span>
        <span className={styles.gap} />
        <span className={styles.seg}><span className={styles.segFill} /></span>
      </div>
    </div>
  );
}
