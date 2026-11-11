// DropImage — vanilla 판(run/337/demo/01-drop-image/index.html) 의 React 포트.
// drop 이벤트의 DataTransfer.files 에서 File 을 꺼내 File.type 이 image/ 접두사인지 검사하고,
// 통과하면 URL.createObjectURL 로 브라우저 메모리 안 주소를 만들어 캔버스에 그린다. 미리보기를
// 치울 때는 revokeObjectURL 로 메모리를 되돌린다. 시드 고정(mulberry32) 캔버스 패턴으로 가상
// 이미지 파일을 Blob(File) 로 만들어 실제 File 객체처럼 다룬다 — Math.random 은 쓰지 않는다.
import { useEffect, useRef } from "react";
import styles from "./DropImage.module.scss";

export type DropImageProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Box<T> = { current: T };

const HINT = "이미지를 드롭하면 DataTransfer.files 를 검사해 객체 URL 로 즉시 그립니다";
const ARIA_LABEL = "이미지 드롭존";

// 시드 고정 난수(mulberry32) — 같은 시드는 같은 그림
function mulberry32(a: number): () => number {
  return function (): number {
    a |= 0; a = a + 0x6d2b79f5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

type Palette = { name: string; w: number; h: number; type: string; seed: number };
const PALETTES: Palette[] = [
  { name: "cover-sky.png", w: 512, h: 320, type: "image/png", seed: 37 },
  { name: "profile-mint.png", w: 256, h: 256, type: "image/png", seed: 61 },
  { name: "poster-lilac.jpg", w: 640, h: 400, type: "image/jpeg", seed: 89 }
];
const DROP_MS = 240;   // 놓인 순간 스케일 정착 시간 — 프레임 하이라이트용(스프링은 rAF 계산)
const HEXES = ["#9fc9ec", "#93d9c0", "#b9a0ff", "#f6c6d3", "#cfd8f5"];

export default function DropImage({
  duration = "240ms",
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#0a4fe8"
}: DropImageProps) {
  const zoneRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const chipRef = useRef<HTMLSpanElement | null>(null);
  const urlRef = useRef<HTMLSpanElement | null>(null);
  const revRef = useRef<HTMLSpanElement | null>(null);
  const rafRef = useRef(0) as Box<number>;

  useEffect(() => {
    const zone = zoneRef.current;
    const input = inputRef.current;
    const frame = frameRef.current;
    const cv = cvRef.current;
    const labelEl = labelRef.current;
    const chipEl = chipRef.current;
    const urlEl = urlRef.current;
    const revEl = revRef.current;
    if (!zone || !input || !frame || !cv || !labelEl || !chipEl || !urlEl || !revEl) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 시드 패턴 — 셀마다 rnd() 를 소모해 같은 시드가 같은 그림을 보장
    function drawPattern(p: Palette): void {
      const rnd = mulberry32(p.seed);
      ctx!.clearRect(0, 0, cv!.width, cv!.height);
      const cell = 12;
      for (let y = 0; y < cv!.height; y += cell) {
        for (let x = 0; x < cv!.width; x += cell) {
          const v = rnd();
          if (v > 0.72) {
            ctx!.fillStyle = HEXES[Math.floor(rnd() * HEXES.length)];
            ctx!.beginPath();
            const r = 2 + rnd() * (cell / 2 - 1);
            ctx!.arc(x + cell / 2, y + cell / 2, r, 0, Math.PI * 2);
            ctx!.fill();
          } else {
            ctx!.fillStyle = v > 0.5 ? "rgba(23,20,26,.06)" : "rgba(255,247,230,.5)";
            ctx!.fillRect(x, y, cell - 1, cell - 1);
          }
        }
      }
    }

    let cur = -1;
    const objUrls: string[] = [];   // createObjectURL 발급 이력 — revoke 시뮬레이션 카운터
    let scale = 1;
    let scaleV = 0;

    // File 시뮬레이션 — new File(Blob) 로 실제 File 객체를 만들어 type/size 를 진짜로 읽게 한다
    function virtualFile(p: Palette, cb: (f: File | null) => void): void {
      try {
        cv!.toBlob(
          (b: Blob | null) => {
            if (!b) { cb(null); return; }
            try { cb(new File([b], p.name, { type: p.type })); } catch (e) { cb(null); }
          },
          p.type.split("/")[1] === "jpeg" ? "image/jpeg" : "image/png"
        );
      } catch (e) { cb(null); }
    }

    // drop 처리 — DataTransfer.files 경로와 같은 검사·URL 발급을 탄다
    function intake(files: FileList | File[] | null): void {
      const f = files && files[0];
      if (!f) return;
      const ok = f.type && f.type.indexOf("image/") === 0;   // File.type 접두사 판정
      if (!ok) return;
      if (cur >= 0) { try { URL.revokeObjectURL(objUrls[cur]); } catch (e) { /* 이미 회수됨 */ } }
      cur = (cur + 1) % PALETTES.length;
      drawPattern(PALETTES[cur]);
      const u = URL.createObjectURL(f);
      objUrls.push(u);
      chipEl!.textContent = f.type + " · " + f.size + "B";
      urlEl!.textContent = "blob:…" + u.slice(-4);
      revEl!.textContent = "revoke 후보 " + objUrls.length;
      labelEl!.textContent = PALETTES[cur].name + " · " + PALETTES[cur].w + "×" + PALETTES[cur].h;
      frame!.classList.add(styles.frameIn);
      scale = 0.82; scaleV = 0;   // 스케일 스프링 초기값(계산)
    }

    function onOver(e: DragEvent): void {
      if (!e.dataTransfer) return;
      e.preventDefault();
      zone!.classList.add(styles.zoneOver);
    }
    function onLeave(): void {
      zone!.classList.remove(styles.zoneOver);
    }
    function onDrop(e: DragEvent): void {
      e.preventDefault();
      zone!.classList.remove(styles.zoneOver);
      if (e.dataTransfer && e.dataTransfer.files) intake(e.dataTransfer.files);
    }
    function onChange(): void {
      if (input!.files) intake(input!.files);
      input!.value = "";
    }
    zone.addEventListener("dragover", onOver as EventListener);
    zone.addEventListener("dragleave", onLeave);
    zone.addEventListener("drop", onDrop as EventListener);
    input.addEventListener("change", onChange);

    // 자동 시연 — 2.4초마다 가상 파일을 "드롭". 스케일 스프링(k=0.09 감쇠 lerp)로 화면이 산다.
    let nextAt = 0;
    if (reduce) {
      drawPattern(PALETTES[0]);
      frame.classList.add(styles.frameIn);
      cur = 0;
    } else {
      const step = (now: number): void => {
        if (now >= nextAt) {
          nextAt = now + 2400;
          virtualFile(PALETTES[(cur + 1) % PALETTES.length], (f) => { if (f) intake([f]); });
        }
        if (frame!.classList.contains(styles.frameIn)) {
          scaleV += (1 - scale) * 0.09;
          scaleV *= 0.78;
          scale += scaleV;
          frame!.style.transform = "scale(" + scale.toFixed(4) + ")";
        }
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      objUrls.forEach((u) => { try { URL.revokeObjectURL(u); } catch (e) { /* 회수 */ } });
      zone.removeEventListener("dragover", onOver as EventListener);
      zone.removeEventListener("dragleave", onLeave);
      zone.removeEventListener("drop", onDrop as EventListener);
      input.removeEventListener("change", onChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.dz}>
        <p className={styles.hint} id="dzHintReact">{HINT}</p>
        <div
          className={styles.zone}
          ref={zoneRef}
          role="button"
          tabIndex={0}
          aria-describedby="dzHintReact"
          aria-label={ARIA_LABEL}
        >
          <input
            type="file"
            accept="image/*"
            className={styles.file}
            ref={inputRef}
            aria-label="파일 선택"
          />
          <svg className={styles.ic} viewBox="0 0 256 256" aria-hidden="true">
            <g fill="currentColor">
              <path d="M216 48v160H40V48a16 16 0 0 1 16-16h144a16 16 0 0 1 16 16" opacity=".2" />
              <path d="M224 144v64a8 8 0 0 1-8 8H40a8 8 0 0 1-8-8v-64a8 8 0 0 1 16 0v56h160v-56a8 8 0 0 1 16 0M93.66 77.66L120 51.31V144a8 8 0 0 0 16 0V51.31l26.34 26.35a8 8 0 0 0 11.32-11.32l-40-40a8 8 0 0 0-11.32 0l-40 40a8 8 0 0 0 11.32 11.32" />
            </g>
          </svg>
          <div className={styles.frame} ref={frameRef} aria-hidden="true">
            <canvas className={styles.cv} ref={cvRef} width={192} height={120} />
          </div>
          <span className={styles.fileLabel} ref={labelRef}>cover-sky.png · 512×320</span>
        </div>
        <p className={styles.meta}>
          <span className={styles.chip} ref={chipRef} style={{ background: color }}>image/png</span>
          <span className={styles.chip} style={{ background: color }}>URL.createObjectURL</span>
          <span className={styles.unit} ref={urlRef}>blob:…37f2</span>
          <span className={styles.unit} ref={revRef}>revoke 후보 0</span>
        </p>
      </div>
    </main>
  );
}
