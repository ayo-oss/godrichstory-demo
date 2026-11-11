// UploadProgressRingPercent — vanilla 판(run/329/demo/02-upload-progress-ring-percent/index.html) 의 React 포트.
// 반지름을 실측(getBoundingClientRect)해 둘레(2πr)를 구하고 stroke-dasharray 에 그 값을 그대로 넣는다.
// 진행률은 stroke-dashoffset 을 둘레에서 되감는 비율로 계산하므로 숫자 라벨과 링은 항상 같은 값을 가리킨다.
// 실제 전송 속도는 매 틱 일정하지 않다 — 시드 난수(mulberry32)로 목표치를 흔들고
// 화면 값은 목표를 향해 관성으로 lerp 되어 뚝뚝 끊기지 않는다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./UploadProgressRingPercent.module.scss";

export type UploadProgressRingPercentProps = {
  duration?: string;
  easing?: string;
  color?: string;
  seed?: number;   // mulberry32 시드 — 흔들림 패턴을 고정한다
  step?: number;   // 매 틱 기본 증가분(퍼센트 포인트)
  jitter?: number; // 매 틱 랜덤 증가분 상한
  tickMs?: number; // 진행 틱 주기(ms)
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };

const LABEL = "업로드 중";
const META = "stroke-dashoffset · getBoundingClientRect";
const SEED = 0x9e77a1;

function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    const t = Math.imul(a ^ (a >>> 15), 1 | a);
    const u = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((u ^ (u >>> 14)) >>> 0) / 4294967296;
  };
}

export default function UploadProgressRingPercent({
  duration = "2s",
  easing = "ease-out",
  color = "#0a4fe8",
  seed = SEED,
  step = 3,
  jitter = 9,
  tickMs = 220
}: UploadProgressRingPercentProps) {
  const [demo, setDemo] = useState(true);
  const progRef = useRef<SVGCircleElement | null>(null);
  const pctRef = useRef<HTMLSpanElement | null>(null);
  const targetRef = useRef(0) as Box<number>;
  const shownRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const timerRef = useRef(0) as Box<number>;
  const randRef = useRef<(() => number) | null>(null);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  useEffect(() => {
    return () => {
      window.clearInterval(timerRef.current);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function live(): void {
    if (!demo) return;
    setDemo(false);
    const prog = progRef.current;
    const pct = pctRef.current;
    if (!prog) return;
    const rand = mulberry32(seed);
    randRef.current = rand;
    // 둘레 — 반지름을 실측해 한 번만 계산하는 상수(vanilla 판과 같은 절차)
    const r = prog.r.baseVal.value;
    const box = prog.getBoundingClientRect();
    const measuredR = box.width > 0 ? box.width / 2 : r;
    const circ = 2 * Math.PI * measuredR;
    prog.style.setProperty("--circ", String(circ));

    const stepFn = (): void => {
      targetRef.current = Math.min(100, targetRef.current + step + rand() * jitter);
      const target = targetRef.current;
      if (target >= 100) window.clearInterval(timerRef.current);
      const frame = (): void => {
        shownRef.current += (target - shownRef.current) * 0.18;
        if (Math.abs(target - shownRef.current) < 0.05) shownRef.current = target;
        prog.style.setProperty("--p", shownRef.current.toFixed(2));
        if (pct) pct.style.setProperty("--n", String(Math.round(shownRef.current)));
        if (shownRef.current < 100) rafRef.current = requestAnimationFrame(frame);
      };
      frame();
    };
    timerRef.current = window.setInterval(stepFn, tickMs);
    stepFn();
  }

  const rootCls = demo ? `${styles.rp} ${styles.isDemo}` : styles.rp;

  return (
    <main className={styles.stage}>
      <div
        className={rootCls}
        style={vars}
        role="group"
        tabIndex={0}
        aria-label="파일 업로드 진행률 링"
        onPointerDown={live}
        onFocus={live}
      >
        <div className={styles.ringwrap}>
          <svg className={styles.svg} viewBox="0 0 120 120" width="92" height="92" aria-hidden="true">
            <circle className={styles.track} cx="60" cy="60" r="52"></circle>
            <circle className={styles.prog} cx="60" cy="60" r="52" ref={progRef}></circle>
          </svg>
          <span className={styles.pct} ref={pctRef} aria-hidden="true"><b className={styles.n}></b><i>%</i></span>
        </div>
        <div className={styles.bar}>
          <span className={styles.label}>{LABEL}</span>
          <span className={styles.meta}>{META}</span>
        </div>
      </div>
    </main>
  );
}
