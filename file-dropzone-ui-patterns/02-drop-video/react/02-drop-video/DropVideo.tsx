// DropVideo — vanilla 판(run/337/demo/02-drop-video/index.html) 의 React 포트. video/ 접두사로
// 통과한 파일을 객체 URL 로 video 엘리먼트에 걸고 loadedmetadata 이벤트에서 duration·videoWidth·
// videoHeight 를 읽어 길이·해상도를 계산해 보여준다. 비트레이트 = 파일크기(비트) ÷ 길이(초) — 이
// 나눗셈이 계산 한 겹이다. 자동 시연(시나리오)과 실제 드롭(진짜 File)의 표시 경로를 완전히 분리해
// 둘이 뒤섞여 값이 서로 어긋나는 일이 없게 한다.
import { useEffect, useRef } from "react";
import styles from "./DropVideo.module.scss";

export type DropVideoProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Box<T> = { current: T };

const HINT = "video/ 만 통과 — 메타데이터를 먼저 읽어 길이·해상도·비트레이트를 계산합니다";
const ARIA_LABEL = "영상 드롭존";

type VideoSpec = { name: string; type: string; dur: number; w: number; h: number; bytes: number };
const FILES: VideoSpec[] = [
  { name: "lecture-week3.mp4", type: "video/mp4", dur: 128.4, w: 1920, h: 1080, bytes: 469762048 * 0.0957 },
  { name: "shorts-intro.webm", type: "video/webm", dur: 27.9, w: 1080, h: 1920, bytes: 10485760 * 0.582 },
  { name: "demo-4k-clip.mp4", type: "video/mp4", dur: 64.2, w: 3840, h: 2160, bytes: 1073741824 * 0.0423 }
];

// 사람 단위 환산 — 1024(2의 10제곱) 나눗셈
function human(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let i = 0, v = bytes;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return Math.floor(v * 10) / 10 + " " + units[i];
}

export default function DropVideo({
  duration = "600ms",
  easing = "ease-out",
  color = "#17141a"
}: DropVideoProps) {
  const zoneRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const nameRef = useRef<HTMLElement | null>(null);
  const chipRef = useRef<HTMLSpanElement | null>(null);
  const durRef = useRef<HTMLElement | null>(null);
  const resRef = useRef<HTMLElement | null>(null);
  const brRef = useRef<HTMLElement | null>(null);
  const sizeRef = useRef<HTMLElement | null>(null);
  const calcRef = useRef<HTMLElement | null>(null);
  const scanbarRef = useRef<HTMLSpanElement | null>(null);
  const rafRef = useRef(0) as Box<number>;

  useEffect(() => {
    const zone = zoneRef.current;
    const input = inputRef.current;
    const panel = panelRef.current;
    const nameEl = nameRef.current;
    const chipEl = chipRef.current;
    const durEl = durRef.current;
    const resEl = resRef.current;
    const brEl = brRef.current;
    const sizeEl = sizeRef.current;
    const calcEl = calcRef.current;
    const scanbar = scanbarRef.current;
    if (!zone || !input || !panel || !nameEl || !chipEl || !durEl || !resEl || !brEl || !sizeEl || !calcEl || !scanbar) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function paint(name: string, type: string, dur: number, w: number, h: number, size: number): void {
      const mbps = (size * 8) / dur / 1000000;   // 비트레이트 = 비트 ÷ 초
      nameEl!.textContent = name;
      chipEl!.textContent = type;
      durEl!.textContent = dur.toFixed(1) + "초";
      resEl!.textContent = w + "×" + h;
      brEl!.textContent = mbps.toFixed(1) + " Mbps";
      sizeEl!.textContent = human(size);
      calcEl!.textContent = human(size) + " × 8 ÷ " + dur.toFixed(1) + "초 = " + mbps.toFixed(1) + " Mbps";
      panel!.classList.add(styles.panelIn);
      scanbar!.classList.remove(styles.scanbarRun);
      void scanbar!.offsetWidth;   // 재시작
      scanbar!.classList.add(styles.scanbarRun);
    }

    // 시연용 — 시나리오 값 그대로(가상 파일의 메타데이터를 실제로 읽을 수단이 없으므로 시나리오
    // 스펙 자체를 그 가상 파일의 '진짜' 메타데이터로 취급 — 표시값이 서로 어긋나지 않게)
    function showScenario(p: VideoSpec): void {
      paint(p.name, p.type, p.dur, p.w, p.h, p.bytes);
    }

    // 실제 드롭 — video 엘리먼트에 objectURL 을 걸고 loadedmetadata 에서 진짜 duration/해상도를
    // 읽는다. File.size 는 항상 실제 값. 진짜 파일이므로 셋이 서로 어긋날 일이 없다.
    function showReal(f: File): void {
      const u = URL.createObjectURL(f);
      const probe = document.createElement("video");
      probe.muted = true;
      probe.onloadedmetadata = () => {
        paint(f.name, f.type, probe.duration, probe.videoWidth, probe.videoHeight, f.size);
        URL.revokeObjectURL(u);
      };
      probe.onerror = () => { URL.revokeObjectURL(u); };
      probe.src = u;
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
      if (f && f.type && f.type.indexOf("video/") === 0) showReal(f);
    }
    function onChange(): void {
      const f = input!.files && input!.files[0];
      if (f && f.type && f.type.indexOf("video/") === 0) showReal(f);
      input!.value = "";
    }
    zone.addEventListener("dragover", onOver as EventListener);
    zone.addEventListener("dragleave", onLeave);
    zone.addEventListener("drop", onDrop as EventListener);
    input.addEventListener("change", onChange);

    let cur = -1;
    if (reduce) {
      showScenario(FILES[0]);
    } else {
      let nextAt = 0;
      const step = (now: number): void => {
        if (now >= nextAt) {
          nextAt = now + 2200;
          cur = (cur + 1) % FILES.length;
          showScenario(FILES[cur]);
        }
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      zone.removeEventListener("dragover", onOver as EventListener);
      zone.removeEventListener("dragleave", onLeave);
      zone.removeEventListener("drop", onDrop as EventListener);
      input.removeEventListener("change", onChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.vd}>
        <p className={styles.hint} id="vdHintReact">{HINT}</p>
        <div
          className={styles.zone}
          ref={zoneRef}
          role="button"
          tabIndex={0}
          aria-describedby="vdHintReact"
          aria-label={ARIA_LABEL}
        >
          <input type="file" accept="video/*" className={styles.file} ref={inputRef} aria-label="파일 선택" />
          <svg className={styles.ic} viewBox="0 0 256 256" aria-hidden="true">
            <g fill="currentColor">
              <path d="M200 72v112a8 8 0 0 1-8 8H32a8 8 0 0 1-8-8V72a8 8 0 0 1 8-8h160a8 8 0 0 1 8 8" opacity=".2" />
              <path d="M251.77 73a8 8 0 0 0-8.21.39L208 97.05V72a16 16 0 0 0-16-16H32a16 16 0 0 0-16 16v112a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16v-25l35.56 23.71A8 8 0 0 0 248 184a8 8 0 0 0 8-8V80a8 8 0 0 0-4.23-7M192 184H32V72h160zm48-22.95l-32-21.33v-23.44L240 95Z" />
            </g>
          </svg>
        </div>
        <div className={styles.panel} ref={panelRef} aria-live="polite">
          <div className={styles.head}>
            <b className={styles.name} ref={nameRef} style={{ color }}>lecture-week3.mp4</b>
            <span className={styles.chip} ref={chipRef}>video/mp4</span>
          </div>
          <dl className={styles.stats}>
            <div className={styles.stat}><dt>길이</dt><dd ref={durRef}>128.4초</dd></div>
            <div className={styles.stat}><dt>해상도</dt><dd ref={resRef}>1920×1080</dd></div>
            <div className={styles.stat}><dt>비트레이트</dt><dd ref={brRef}>2.8 Mbps</dd></div>
            <div className={styles.stat}><dt>크기</dt><dd ref={sizeRef}>44.9 MB</dd></div>
          </dl>
          <div className={styles.scan} aria-hidden="true"><span className={styles.scanbar} ref={scanbarRef} /></div>
          <p className={styles.calc} ref={calcRef}>44.9 MB × 8 ÷ 128.4초 = 2.8 Mbps</p>
        </div>
      </div>
    </main>
  );
}
