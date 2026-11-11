import { useEffect, useRef } from "react";
import styles from "./TwoFactor.module.scss";

// 2단계 인증(05) — 여섯 자리 칸 중 채워진 자리수를 매 프레임 다시 세어 전체 대비 채움 비율을
// 직접 구하고, 그 비율이 100%에 닿아야 확인 버튼의 불투명도와 눌림 가능 여부가 함께 바뀐다.
// 코드 자체는 mulberry32 고정 시드로 만든 데모용 가짜 값이며 실제 인증 서버와 무관하다.
const DIGITS = 6;
const DIGIT_MS = 250; // 6 * 250 = 1500, 남는 500ms 는 완료 상태 유지
const CYCLE_MS = 2000;

function mulberry32(seed: number) {
  let s = seed;
  return function () {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function filled(t: number): number {
  return Math.min(Math.max(Math.floor(t / DIGIT_MS), 0), DIGITS);
}

export default function TwoFactor() {
  const groupRef = useRef<HTMLDivElement>(null);
  const proxyRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const group = groupRef.current;
    const proxy = proxyRef.current;
    const confirmBtn = confirmRef.current;
    if (!group || !proxy || !confirmBtn) return;
    const boxes = group.querySelectorAll<HTMLSpanElement>("." + styles.digitBox);
    if (boxes.length !== DIGITS) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const rand = mulberry32(42);
    const code: number[] = [];
    for (let i = 0; i < DIGITS; i++) code.push(Math.floor(rand() * 10));

    function apply(t: number) {
      const n = filled(t);
      const ratio = n / DIGITS;
      for (let i = 0; i < DIGITS; i++) {
        const box = boxes[i];
        if (i < n) {
          box.textContent = String(code[i]);
          box.classList.add(styles.filled);
        } else {
          box.textContent = "";
          box.classList.remove(styles.filled);
        }
      }
      if (proxy) proxy.value = code.slice(0, n).join("");
      const ready = ratio >= 1;
      if (confirmBtn) {
        confirmBtn.disabled = !ready;
        confirmBtn.setAttribute("aria-disabled", String(!ready));
        confirmBtn.style.opacity = ready ? "1" : ".4";
      }
    }

    let start: number | null = null;
    let raf = 0;
    function frame(ts: number) {
      if (start === null) start = ts;
      const t = (ts - start) % CYCLE_MS;
      apply(t);
      raf = requestAnimationFrame(frame);
    }

    if (reduce) {
      apply(0);
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <section className={styles.panel}>
        <p className={styles.title} id="tfaTitle">
          2단계 인증 코드 입력
        </p>
        <div className={styles.digitGroup} role="group" aria-labelledby="tfaTitle" ref={groupRef}>
          <span className={styles.digitBox} />
          <span className={styles.digitBox} />
          <span className={styles.digitBox} />
          <span className={styles.digitBox} />
          <span className={styles.digitBox} />
          <span className={styles.digitBox} />
        </div>
        <label className={styles.srOnly} htmlFor="otpProxy">
          인증 코드 6자리
        </label>
        <input
          ref={proxyRef}
          className={styles.srOnly}
          type="text"
          id="otpProxy"
          inputMode="numeric"
          autoComplete="one-time-code"
          tabIndex={-1}
          defaultValue=""
        />
        <button ref={confirmRef} className={styles.submit} type="button" disabled aria-disabled="true">
          확인
        </button>
        <p className={styles.hint}>코드를 모두 입력하면 확인 버튼이 활성화됩니다</p>
      </section>
    </main>
  );
}
