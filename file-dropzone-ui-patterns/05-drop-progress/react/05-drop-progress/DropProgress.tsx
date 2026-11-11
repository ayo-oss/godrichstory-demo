// DropProgress — vanilla 판(run/337/demo/05-drop-progress/index.html) 의 React 포트.
// FileReader.readAsArrayBuffer 로 실제 파일을 읽어(진짜 API 를 타되 onprogress 는 참고용) 별도
// rAF 루프가 3차 이즈 커브(1-(1-t)^3)로 로딩률을 계산해 진행바 --p 를 채운다. 절반 지점에서
// 취소하는 시나리오는 curve 진행을 CANCEL_AT 비율에서 멈추고 '중단' 상태로 굳힌다.
import { useEffect, useRef } from "react";
import styles from "./DropProgress.module.scss";

export type DropProgressProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Box<T> = { current: T };

const HINT = "실제로 파일을 읽으며 3차 이즈 커브로 진행률을 계산합니다 — 절반에서 취소되면 중단 상태로 멈춥니다";
const ARIA_LABEL = "업로드 진행 드롭존";

type FileSpec = { name: string; mb: number };
const FILES: FileSpec[] = [
  { name: "invoice-041.pdf", mb: 6.2 },
  { name: "archive-photos.zip", mb: 18.4 },
  { name: "dataset-raw.csv", mb: 9.7 }
];
const DUR = 1400;        // 커브 진행 시간(ms)
const CANCEL_AT = 0.62;  // 취소 시 멈추는 진행 비율

function human(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let i = 0, v = bytes;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return Math.floor(v * 10) / 10 + " " + units[i];
}

export default function DropProgress({
  duration = "240ms",
  easing = "ease-out",
  color = "#0a4fe8"
}: DropProgressProps) {
  const zoneRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const nameRef = useRef<HTMLElement | null>(null);
  const pctRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLSpanElement | null>(null);
  const calcRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef(0) as Box<number>;
  const cycleRafRef = useRef(0) as Box<number>;

  useEffect(() => {
    const zone = zoneRef.current;
    const input = inputRef.current;
    const card = cardRef.current;
    const nameEl = nameRef.current;
    const pctEl = pctRef.current;
    const track = trackRef.current;
    const bar = barRef.current;
    const calcEl = calcRef.current;
    if (!zone || !input || !card || !nameEl || !pctEl || !track || !bar || !calcEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function setP(p: number, done: boolean, aborted: boolean): void {
      track!.style.setProperty("--p", String(p));
      pctEl!.textContent = Math.round(p * 100) + "%";
      bar!.classList.toggle(styles.barAbort, aborted);
      bar!.classList.toggle(styles.barDone, done);
    }

    // 실제 파일 읽기 — FileReader 로 진짜 API 를 타되 계산의 축은 별도 rAF 이즈 커브
    function read(f: File, cancelHalfway: boolean, size: number): void {
      card!.classList.add(styles.cardIn);
      nameEl!.textContent = f.name;
      setP(0, false, false);
      cancelAnimationFrame(rafRef.current);
      try {
        const fr = new FileReader();
        fr.onload = () => {};
        fr.onprogress = () => {};
        fr.readAsArrayBuffer(f);
      } catch (e) { /* 읽기 실패해도 표시용 커브는 계속 */ }

      const stopAt = cancelHalfway ? CANCEL_AT : 1;
      const start = performance.now();
      const step = (now: number): void => {
        const t = Math.min(1, (now - start) / DUR);
        const eased = 1 - Math.pow(1 - t, 3);
        const p = Math.min(eased, stopAt);
        const loaded = size * p;
        calcEl!.textContent = "loaded " + human(loaded) + " ÷ total " + human(size);
        const doneNow = p >= stopAt && stopAt === 1;
        const abortedNow = p >= stopAt && stopAt < 1;
        setP(p, doneNow, abortedNow);
        if (p < stopAt) rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    }

    // 가상 File — 재사용 청크로 실제 크기의 Blob 을 효율적으로 구성
    function virtualFile(spec: FileSpec): File {
      const bytes = Math.round(spec.mb * 1024 * 1024);
      const chunk = new Uint8Array(65536);
      const parts: Uint8Array[] = [];
      let left = bytes;
      while (left > 0) {
        const n = Math.min(chunk.length, left);
        parts.push(n === chunk.length ? chunk : chunk.slice(0, n));
        left -= n;
      }
      return new File(parts as BlobPart[], spec.name);
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
      if (f) read(f, false, f.size);
    }
    function onChange(): void {
      const f = input!.files && input!.files[0];
      if (f) read(f, false, f.size);
      input!.value = "";
    }
    zone.addEventListener("dragover", onOver as EventListener);
    zone.addEventListener("dragleave", onLeave);
    zone.addEventListener("drop", onDrop as EventListener);
    input.addEventListener("change", onChange);

    let cur = -1;
    if (reduce) {
      const spec = FILES[0];
      read(virtualFile(spec), false, Math.round(spec.mb * 1024 * 1024));
    } else {
      let nextAt = 0;
      const cycle = (now: number): void => {
        if (now >= nextAt) {
          nextAt = now + 2000;
          cur = (cur + 1) % FILES.length;
          const spec = FILES[cur];
          read(virtualFile(spec), cur === 1, Math.round(spec.mb * 1024 * 1024));
        }
        cycleRafRef.current = requestAnimationFrame(cycle);
      };
      cycleRafRef.current = requestAnimationFrame(cycle);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      cancelAnimationFrame(cycleRafRef.current);
      zone.removeEventListener("dragover", onOver as EventListener);
      zone.removeEventListener("dragleave", onLeave);
      zone.removeEventListener("drop", onDrop as EventListener);
      input.removeEventListener("change", onChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.rp}>
        <p className={styles.hint} id="rpHintReact">{HINT}</p>
        <div
          className={styles.zone}
          ref={zoneRef}
          role="button"
          tabIndex={0}
          aria-describedby="rpHintReact"
          aria-label={ARIA_LABEL}
        >
          <input type="file" className={styles.file} ref={inputRef} aria-label="파일 선택" />
          <svg className={styles.ic} viewBox="0 0 256 256" aria-hidden="true">
            <g fill="currentColor">
              <path d="M224 152v56a16 16 0 0 1-16 16H48a16 16 0 0 1-16-16v-56a8 8 0 0 1 16 0v56h160v-56a8 8 0 0 1 16 0" opacity=".2" />
              <path d="M80 84a8 8 0 0 1 0-11.31l40-40a8 8 0 0 1 11.31 0l40 40A8 8 0 0 1 160 84.7L136 60.69V152a8 8 0 0 1-16 0V60.69L96 84.69A8 8 0 0 1 80 84m144 68v56a16 16 0 0 1-16 16H48a16 16 0 0 1-16-16v-56a8 8 0 0 1 16 0v56h160v-56a8 8 0 0 1 16 0" />
            </g>
          </svg>
        </div>
        <div className={styles.card} ref={cardRef} aria-live="polite">
          <div className={styles.row}>
            <b className={styles.name} ref={nameRef} style={{ color }}>invoice-041.pdf</b>
            <span className={styles.pct} ref={pctRef}>0%</span>
          </div>
          <div className={styles.track} ref={trackRef}>
            <span className={styles.bar} ref={barRef} />
          </div>
          <p className={styles.calc} ref={calcRef}>loaded 0 B ÷ total 6.2 MB</p>
        </div>
      </div>
    </main>
  );
}
