// UploadProgressSuccessMorph — vanilla 판(run/329/demo/06-upload-progress-success-morph/index.html) 의 React 포트.
// 100% 가 되는 프레임에 링을 즉시 숨기고 체크 path 를 즉시 보이게 스왑한 뒤 체크의 stroke-dashoffset 을
// transition 으로 0 까지 되감아(draw-in) 원이 체크로 이어져 그려진 것처럼 보이게 만든다.
// d 속성 자체는 절대 보간되지 않으므로 스왑은 항상 순간적이다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./UploadProgressSuccessMorph.module.scss";

export type UploadProgressSuccessMorphProps = {
  duration?: string;
  easing?: string;
  color?: string;
  seed?: number;      // mulberry32 시드
  stepBase?: number;  // 매 틱 기본 증가분(퍼센트 포인트)
  stepJitter?: number; // 매 틱 랜덤 증가분 상한
  tickMs?: number;    // 진행 틱 주기(ms)
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };

const LABEL = "업로드 완료";
const META = "stroke-dasharray · path · transition";
const SEED = 0x9917cf;

function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    const t = Math.imul(a ^ (a >>> 15), 1 | a);
    const u = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((u ^ (u >>> 14)) >>> 0) / 4294967296;
  };
}

export default function UploadProgressSuccessMorph({
  duration = "2s",
  easing = "ease-out",
  color = "#0a4fe8",
  seed = SEED,
  stepBase = 6,
  stepJitter = 10,
  tickMs = 220
}: UploadProgressSuccessMorphProps) {
  const [demo, setDemo] = useState(true);
  const [done, setDone] = useState(false);
  const ringRef = useRef<SVGCircleElement | null>(null);
  const checkRef = useRef<SVGPathElement | null>(null);
  const targetRef = useRef(0) as Box<number>;
  const shownRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const timerRef = useRef(0) as Box<number>;
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
    const ring = ringRef.current;
    const check = checkRef.current;
    if (!ring || !check) return;
    const rand = mulberry32(seed);

    const ringBox = ring.getBoundingClientRect();
    const ringR = ringBox.width > 0 ? ringBox.width / 2 : ring.r.baseVal.value;
    const circ = 2 * Math.PI * ringR;
    ring.style.setProperty("--circ", String(circ));
    const checkLen = check.getTotalLength();
    check.style.setProperty("--checklen", String(checkLen));

    function paint(): void {
      shownRef.current += (targetRef.current - shownRef.current) * 0.2;
      if (Math.abs(targetRef.current - shownRef.current) < 0.1) shownRef.current = targetRef.current;
      ring!.style.setProperty("--p", shownRef.current.toFixed(2));
      if (shownRef.current >= 100) {
        setDone(true);
        return;
      }
      rafRef.current = requestAnimationFrame(paint);
    }
    function tick(): void {
      targetRef.current = Math.min(100, targetRef.current + stepBase + rand() * stepJitter);
      if (targetRef.current >= 100) window.clearInterval(timerRef.current);
    }
    timerRef.current = window.setInterval(tick, tickMs);
    rafRef.current = requestAnimationFrame(paint);
  }

  const rootCls = [styles.sm, demo ? styles.isDemo : "", done ? styles.isDone : ""].filter(Boolean).join(" ");

  return (
    <main className={styles.stage}>
      <div
        className={rootCls}
        style={vars}
        role="group"
        tabIndex={0}
        aria-label="파일 업로드 완료 표시"
        onPointerDown={live}
        onFocus={live}
      >
        <svg className={styles.svg} viewBox="0 0 120 120" width="72" height="72" aria-hidden="true">
          <circle className={styles.track} cx="60" cy="60" r="50"></circle>
          <circle className={styles.ring} cx="60" cy="60" r="50" ref={ringRef}></circle>
          <path className={styles.check} d="M40 62 L54 76 L82 46" ref={checkRef}></path>
        </svg>
        <div className={styles.bar}>
          <span className={styles.label}>{LABEL}</span>
          <span className={styles.meta}>{META}</span>
        </div>
      </div>
    </main>
  );
}
