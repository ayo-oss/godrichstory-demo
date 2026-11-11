// DropSizeLimit — vanilla 판(run/337/demo/08-drop-size-limit/index.html) 의 React 포트.
// ratio = size/LIMIT 로 초과 여부·링 게이지 stroke-dashoffset·경고 등급을 한 번에 계산하고,
// 표시되는 숫자는 즉시 갱신하되 링 시각만 rAF 지수보간(shown += (target-shown)*0.18)으로 늦게
// 따라오게 분리한다 — 이 디커플링이 계산 한 겹.
import { useEffect, useRef } from "react";
import styles from "./DropSizeLimit.module.scss";

export type DropSizeLimitProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Box<T> = { current: T };

const HINT = "size ÷ LIMIT 비율로 링 게이지를 계산하고, 링 시각만 지수보간으로 늦게 따라오게 합니다";
const ARIA_LABEL = "용량 제한 드롭존";

const K = Math.pow(2, 10);
const DECIMALS = 2;   // 변형: 큐 변형 칩 08(1자리→2자리) 적용값
const LIMIT = 5 * 1024 * 1024;
const RING_C = 188.5;   // 2πr, r=30

type FileSpec = { name: string; bytes: number };
const FILES: FileSpec[] = [
  { name: "intro.mp4", bytes: Math.round(1.8 * 1024 * 1024) },
  { name: "clip-720.mov", bytes: Math.round(4.6 * 1024 * 1024) },
  { name: "master-raw.mov", bytes: Math.round(8.3 * 1024 * 1024) },
  { name: "sticker.png", bytes: Math.round(0.3 * 1024 * 1024) }
];

function fmt(bytes: number): string {
  const units = ["B", "KB", "MB"];
  let i = 0, v = bytes;
  while (v >= K && i < units.length - 1) { v /= K; i++; }
  const f = Math.pow(10, DECIMALS);
  const truncated = Math.floor(v * f) / f;
  return truncated.toFixed(DECIMALS) + " " + units[i];
}

export default function DropSizeLimit({
  duration = "600ms",
  easing = "ease-out",
  color = "#0a4fe8"
}: DropSizeLimitProps) {
  const zoneRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const ringValRef = useRef<SVGCircleElement | null>(null);
  const ringNumRef = useRef<HTMLElement | null>(null);
  const nameRef = useRef<HTMLElement | null>(null);
  const sizeRef = useRef<HTMLElement | null>(null);
  const limitRef = useRef<HTMLElement | null>(null);
  const verdictRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef(0) as Box<number>;
  const tickRafRef = useRef(0) as Box<number>;
  const shownRef = useRef(0) as Box<number>;
  const targetRef = useRef(0) as Box<number>;

  useEffect(() => {
    const zone = zoneRef.current;
    const input = inputRef.current;
    const card = cardRef.current;
    const ringVal = ringValRef.current;
    const ringNum = ringNumRef.current;
    const nameEl = nameRef.current;
    const sizeEl = sizeRef.current;
    const limitEl = limitRef.current;
    const verdictEl = verdictRef.current;
    if (!zone || !input || !card || !ringVal || !ringNum || !nameEl || !sizeEl || !limitEl || !verdictEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function tick(): void {
      shownRef.current += (targetRef.current - shownRef.current) * 0.18;
      const r = Math.max(0, Math.min(1, shownRef.current));
      ringVal!.style.strokeDashoffset = String(RING_C * (1 - r));
      ringNum!.textContent = Math.round(r * 100) + "%";
      if (Math.abs(targetRef.current - shownRef.current) > 0.002) {
        tickRafRef.current = requestAnimationFrame(tick);
      }
    }

    function show(f: FileSpec): void {
      const ratio = f.bytes / LIMIT;
      const over = ratio > 1;
      const near = ratio >= 0.85;
      nameEl!.textContent = f.name;
      sizeEl!.textContent = fmt(f.bytes);
      limitEl!.textContent = fmt(LIMIT);
      card!.classList.toggle(styles.cardOverLimit, over);
      card!.classList.toggle(styles.cardNearLimit, !over && near);
      verdictEl!.textContent = over
        ? "초과 +" + fmt(f.bytes - LIMIT) + " — 허용 " + fmt(LIMIT) + " 까지"
        : "허용 범위 — 남음 " + fmt(LIMIT - f.bytes);
      targetRef.current = Math.min(1, ratio);
      if (reduce) {
        shownRef.current = targetRef.current;
        ringVal!.style.strokeDashoffset = String(RING_C * (1 - targetRef.current));
        ringNum!.textContent = Math.round(targetRef.current * 100) + "%";
      } else {
        cancelAnimationFrame(tickRafRef.current);
        tickRafRef.current = requestAnimationFrame(tick);
      }
    }

    function intake(f: FileSpec): void {
      show(f);
    }

    function virtualFile(spec: FileSpec): File {
      try { return new File([new Blob([new Uint8Array(spec.bytes)])], spec.name); }
      catch (e) { return new File([], spec.name); }
    }

    function onOver(e: DragEvent): void {
      e.preventDefault();
      zone!.classList.add(styles.zoneOver);
    }
    function onLeave(): void {
      zone!.classList.remove(styles.zoneOver);
    }
    function onDrop(e: DragEvent): void {
      e.preventDefault();
      zone!.classList.remove(styles.zoneOver);
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) intake({ name: f.name, bytes: f.size });
    }
    function onChange(): void {
      const f = input!.files && input!.files[0];
      if (f) intake({ name: f.name, bytes: f.size });
      input!.value = "";
    }
    zone.addEventListener("dragover", onOver as EventListener);
    zone.addEventListener("dragleave", onLeave);
    zone.addEventListener("drop", onDrop as EventListener);
    input.addEventListener("change", onChange);

    let cur = -1;
    if (reduce) {
      intake(FILES[0]);
    } else {
      let nextAt = 0;
      const step = (now: number): void => {
        if (now >= nextAt) {
          nextAt = now + 1300;
          cur = (cur + 1) % FILES.length;
          intake(FILES[cur]);
        }
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      cancelAnimationFrame(tickRafRef.current);
      zone.removeEventListener("dragover", onOver as EventListener);
      zone.removeEventListener("dragleave", onLeave);
      zone.removeEventListener("drop", onDrop as EventListener);
      input.removeEventListener("change", onChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.sl}>
        <p className={styles.hint} id="slHintReact">{HINT}</p>
        <div
          className={styles.zone}
          ref={zoneRef}
          role="button"
          tabIndex={0}
          aria-describedby="slHintReact"
          aria-label={ARIA_LABEL}
        >
          <input type="file" className={styles.file} ref={inputRef} aria-label="파일 선택" />
          <svg className={styles.ic} viewBox="0 0 256 256" aria-hidden="true">
            <g fill="currentColor">
              <path d="M232 152v24a8 8 0 0 1-8 8H32a8 8 0 0 1-8-8v-22.87C24 95.65 70.15 48.2 127.63 48A104 104 0 0 1 232 152" opacity=".2" />
              <path d="M207.06 72.67A111.24 111.24 0 0 0 128 40h-.4C66.07 40.21 16 91 16 153.13V176a16 16 0 0 0 16 16h192a16 16 0 0 0 16-16v-24a111.25 111.25 0 0 0-32.94-79.33M224 176H119.71l54.76-75.3a8 8 0 0 0-12.94-9.42L99.92 176H32v-22.87c0-3.08.15-6.12.43-9.13H56a8 8 0 0 0 0-16H35.27c10.32-38.86 44-68.24 84.73-71.66V80a8 8 0 0 0 16 0V56.33A96.14 96.14 0 0 1 221 128h-21a8 8 0 0 0 0 16h23.67c.21 2.65.33 5.31.33 8Z" />
            </g>
          </svg>
        </div>
        <div className={styles.card} ref={cardRef} aria-live="polite">
          <div className={styles.ring}>
            <svg className={styles.svg} viewBox="0 0 72 72" aria-hidden="true">
              <circle className={styles.ringBg} cx="36" cy="36" r="30" fill="none" strokeWidth="6" />
              <circle
                className={styles.ringValCircle}
                ref={ringValRef}
                cx="36" cy="36" r="30" fill="none" strokeWidth="6"
                strokeDasharray="188.5"
                strokeDashoffset="188.5"
                style={{ stroke: color }}
              />
            </svg>
            <span className={styles.ringNum} ref={ringNumRef}>0%</span>
          </div>
          <div className={styles.info}>
            <b className={styles.name} ref={nameRef}>intro.mp4</b>
            <p className={styles.size} ref={sizeRef}>0.00 MB</p>
            <p className={styles.limit} ref={limitRef}>허용 5.00 MB</p>
            <p className={styles.verdict} ref={verdictRef}>허용 범위 — 남음 5.00 MB</p>
          </div>
        </div>
      </div>
    </main>
  );
}
