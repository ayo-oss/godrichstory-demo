import { useEffect, useRef } from "react";
import styles from "./ColorGradientMorph.module.scss";

type Box<T> = { current: T };

type Stop = { t: number; rgb: [number, number, number] };
const STOPS: Stop[] = [
  { t: 0, rgb: [194, 54, 26] },
  { t: 0.5, rgb: [255, 210, 63] },
  { t: 1, rgb: [76, 212, 166] },
];

function lerp(a: number, b: number, f: number) { return a + (b - a) * f; }

function colorAt(t: number) {
  t = Math.max(0, Math.min(1, t));
  let lo = STOPS[0], hi = STOPS[STOPS.length - 1];
  for (let i = 0; i < STOPS.length - 1; i++) {
    if (t >= STOPS[i].t && t <= STOPS[i + 1].t) { lo = STOPS[i]; hi = STOPS[i + 1]; break; }
  }
  const span = hi.t - lo.t || 1;
  const f = (t - lo.t) / span;
  const r = Math.round(lerp(lo.rgb[0], hi.rgb[0], f));
  const g = Math.round(lerp(lo.rgb[1], hi.rgb[1], f));
  const b = Math.round(lerp(lo.rgb[2], hi.rgb[2], f));
  return "rgb(" + r + "," + g + "," + b + ")";
}

export default function ColorGradientMorph() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const input = root.querySelector(`.${styles.input}`) as HTMLInputElement | null;
    const fill = root.querySelector(`.${styles.fill}`) as HTMLElement | null;
    const pctEl = root.querySelector(`.${styles.pct}`) as HTMLElement | null;
    if (!input || !fill || !pctEl) return;

    function classCount(value: string) {
      let n = 0;
      if (/[a-z]/.test(value)) n++;
      if (/[A-Z]/.test(value)) n++;
      if (/[0-9]/.test(value)) n++;
      if (/[^A-Za-z0-9]/.test(value)) n++;
      return n;
    }

    // 계산 겹: 길이 비중·문자 종류 비중을 반씩 섞어 연속값(0~1)을 만들고, 그 값을
    // 3개 색 정지점(red→yellow→mint) 사이에서 RGB 선형보간해 매 입력마다 새로 계산한다.
    function scoreT(value: string) {
      const lengthPart = Math.min(1, value.length / 20);
      const classPart = classCount(value) / 4;
      return 0.5 * lengthPart + 0.5 * classPart;
    }

    function paint(value: string) {
      const t = scoreT(value);
      fill!.style.transform = "scaleX(" + t + ")";
      fill!.style.backgroundColor = colorAt(t);
      pctEl!.textContent = String(Math.round(t * 100));
    }

    function onInput() {
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
      paint(input!.value);
    }
    input.addEventListener("input", onInput);
    paint(input.value);

    // 자동 루프: 시드 고정 문자열 배열로 길이·문자 종류를 함께 늘렸다 줄인다.
    const SEQ = ["", "ab", "abcdef", "abcdefGH", "abcdefGH12", "abcdefGH12!@",
      "abcdefGH12", "abcdefGH", "abcdef", "ab", ""];
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

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.cm} ${styles["is-demo"]}`}>
      <label className={styles.field}>
        <input className={styles.input} type="text" autoComplete="off" spellCheck={false} defaultValue="" />
      </label>
      <div className={styles.track}><div className={styles.fill} /></div>
      <div className={styles.readout}>정도 <b className={styles.pct}>0</b>%</div>
    </div>
  );
}
