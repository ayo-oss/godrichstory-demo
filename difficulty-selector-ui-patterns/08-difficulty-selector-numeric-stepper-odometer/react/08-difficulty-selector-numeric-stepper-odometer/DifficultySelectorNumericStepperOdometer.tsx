import { useEffect, useRef } from 'react';
import styles from './DifficultySelectorNumericStepperOdometer.module.scss';

const MIN = 1, MAX = 12, DIGIT_H = 26;
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const SEQUENCE = [9, 10, 3, 12, 1, 7];
const TICK_MS = 850;

export default function DifficultySelectorNumericStepperOdometer() {
  const rootRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);
  const tensRef = useRef<HTMLDivElement>(null);
  const onesRef = useRef<HTMLDivElement>(null);
  const outRef = useRef<HTMLSpanElement>(null);
  const plusRef = useRef<HTMLButtonElement>(null);
  const minusRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const display = displayRef.current;
    const tensStrip = tensRef.current;
    const onesStrip = onesRef.current;
    const out = outRef.current;
    const plus = plusRef.current;
    const minus = minusRef.current;
    if (!root || !display || !tensStrip || !onesStrip || !out || !plus || !minus) return undefined;

    let value = 5;

    // 계산 겹: 값을 10^자리로 나눈 몫의 일의 자리(placeDigit)로 각 릴이 보여줄 숫자를 구하고,
    // 그 자릿값 * 칸 높이만큼 릴을 밀어 그 숫자가 창에 걸리게 한다 — 자리올림은 몫이 바뀌면서 자연히 생긴다
    function placeDigit(v: number, place: number) { return Math.floor(v / Math.pow(10, place)) % 10; }
    function paint() {
      const ones = placeDigit(value, 0), tens = placeDigit(value, 1);
      onesStrip!.style.transform = 'translateY(-' + (ones * DIGIT_H) + 'px)';
      tensStrip!.style.transform = 'translateY(-' + (tens * DIGIT_H) + 'px)';
      display!.setAttribute('aria-valuenow', String(value));
      out!.textContent = String(value);
    }
    let timer = 0;
    function human() { root!.classList.remove(styles['is-demo']); window.clearInterval(timer); }
    function set(v: number) { value = Math.max(MIN, Math.min(MAX, v)); paint(); }

    function onPlus() { human(); set(value + 1); }
    function onMinus() { human(); set(value - 1); }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); human(); set(value + 1); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); human(); set(value - 1); }
    }
    plus.addEventListener('click', onPlus);
    minus.addEventListener('click', onMinus);
    display.addEventListener('keydown', onKey);

    let si = 0;
    function tick() { set(SEQUENCE[si % SEQUENCE.length]); si++; }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) timer = window.setInterval(tick, TICK_MS);
    paint();

    return () => {
      plus!.removeEventListener('click', onPlus);
      minus!.removeEventListener('click', onMinus);
      display!.removeEventListener('keydown', onKey);
      window.clearInterval(timer);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.nso + ' ' + styles['is-demo']} ref={rootRef}>
        <div
          className={styles.nsoDisplay}
          ref={displayRef}
          role="spinbutton"
          tabIndex={0}
          aria-label="난이도 점수"
          aria-valuemin={1}
          aria-valuemax={12}
          aria-valuenow={5}
        >
          <div className={styles.nsoCol}>
            <div className={styles.nsoStrip} ref={tensRef}>
              {DIGITS.map((d) => <span key={d}>{d}</span>)}
            </div>
          </div>
          <div className={styles.nsoCol}>
            <div className={styles.nsoStrip} ref={onesRef}>
              {DIGITS.map((d) => <span key={d}>{d}</span>)}
            </div>
          </div>
        </div>
        <div className={styles.nsoRow}>
          <button type="button" className={styles.nsoBtn} ref={minusRef} aria-label="점수 낮추기">−</button>
          <button type="button" className={styles.nsoBtn} ref={plusRef} aria-label="점수 높이기">+</button>
        </div>
        <p className={styles.nsoLabel}>난이도 점수 <span ref={outRef}>5</span></p>
      </div>
    </main>
  );
}
