// DropPreviewGrid — vanilla 판(run/337/demo/04-drop-preview-grid/index.html) 의 React 포트.
// 이미지의 실제 naturalWidth/naturalHeight 로 종횡비를 구해 타일의 --ratio 커스텀 프로퍼티를
// 역산하고, gcd 로 "16:9" 같은 표시용 최대공약수 비율 문자열을 계산한다. 썸네일 최대 변은
// 변형 칩 값(160px)을 그대로 문구에 반영한다.
import { useEffect, useRef } from "react";
import styles from "./DropPreviewGrid.module.scss";

export type DropPreviewGridProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Box<T> = { current: T };

const HINT = "이미지의 실제 가로세로 비율을 읽어 타일 폭을 역산하고, 최대공약수로 화면비를 계산합니다";
const ARIA_LABEL = "미리보기 그리드 드롭존";

function mulberry32(a: number): () => number {
  return function (): number {
    a |= 0; a = a + 0x6d2b79f5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

type ImgSpec = { name: string; w: number; h: number; seed: number };
const IMGS: ImgSpec[] = [
  { name: "a-wide.png", w: 640, h: 360, seed: 11 },
  { name: "b-tall.png", w: 360, h: 640, seed: 23 },
  { name: "c-square.jpg", w: 480, h: 480, seed: 37 },
  { name: "d-photo.png", w: 800, h: 500, seed: 51 },
  { name: "e-poster.jpg", w: 400, h: 700, seed: 67 },
  { name: "f-pano.png", w: 960, h: 320, seed: 83 }
];
const HEXES = ["#9fc9ec", "#93d9c0", "#b9a0ff", "#f6c6d3", "#cfd8f5", "#f0dfae"];
const T_MAX = 160;   // 변형: 큐 변형 칩 04(320px→160px) 적용값
const MAX_TILES = 6;

// gcd 로 최대공약수 화면비 문자열("16:9") 계산
function ratioLabel(w: number, h: number): string {
  const g = (a: number, b: number): number => (b === 0 ? a : g(b, a % b));
  const d = g(Math.round(w), Math.round(h)) || 1;
  return Math.round(w / d) + ":" + Math.round(h / d);
}

export default function DropPreviewGrid({
  duration = "300ms",
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6"
}: DropPreviewGridProps) {
  const zoneRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const unitRef = useRef<HTMLSpanElement | null>(null);
  const rafRef = useRef(0) as Box<number>;

  useEffect(() => {
    const zone = zoneRef.current;
    const input = inputRef.current;
    const grid = gridRef.current;
    const unitEl = unitRef.current;
    if (!zone || !input || !grid || !unitEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 시드 패턴을 오프스크린 캔버스에 그려 픽셀을 실제로 읽는다(외부 이미지 0)
    function paintSeed(cv: HTMLCanvasElement, w: number, h: number, seed: number): void {
      const x = cv.getContext("2d");
      if (!x) return;
      const rnd = mulberry32(seed);
      cv.width = w; cv.height = h;
      x.fillStyle = HEXES[Math.floor(rnd() * HEXES.length)];
      x.fillRect(0, 0, w, h);
      for (let i = 0; i < 24; i++) {
        x.fillStyle = HEXES[Math.floor(rnd() * HEXES.length)];
        x.globalAlpha = 0.5;
        x.beginPath();
        x.arc(rnd() * w, rnd() * h, rnd() * (Math.min(w, h) * 0.18), 0, Math.PI * 2);
        x.fill();
      }
      x.globalAlpha = 1;
    }

    function addTile(w: number, h: number, seed: number): void {
      const ratio = w / h;
      if (grid!.children.length >= MAX_TILES) grid!.removeChild(grid!.children[0]);
      const tile = document.createElement("div");
      tile.className = styles.tile;
      tile.style.setProperty("--ratio", String(ratio));
      const srcCv = document.createElement("canvas");
      paintSeed(srcCv, w, h, seed);
      const thumb = document.createElement("canvas");
      thumb.className = styles.thumb;
      const tw = 64;
      const th = Math.round(tw / ratio);
      thumb.width = tw; thumb.height = th;
      const tx = thumb.getContext("2d");
      if (tx) tx.drawImage(srcCv, 0, 0, tw, th);
      const meta = document.createElement("p");
      meta.className = styles.meta;
      const tag = document.createElement("span");
      tag.className = styles.tag;
      tag.style.color = color;
      tag.textContent = ratioLabel(w, h);
      meta.appendChild(tag);
      tile.appendChild(thumb);
      tile.appendChild(meta);
      grid!.appendChild(tile);
      if (!reduce) {
        requestAnimationFrame(() => tile.classList.add(styles.tileIn));
      } else {
        tile.classList.add(styles.tileIn);
      }
      unitEl!.textContent = "tiles " + grid!.children.length + " · max " + T_MAX + "px";
    }

    function fromReal(f: File): void {
      const u = URL.createObjectURL(f);
      const img = new Image();
      img.onload = () => {
        const seed = (f.name.length * 7 + f.size) % 97;
        addTile(img.naturalWidth || 1, img.naturalHeight || 1, seed);
        URL.revokeObjectURL(u);
      };
      img.onerror = () => URL.revokeObjectURL(u);
      img.src = u;
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
      if (f && f.type && f.type.indexOf("image/") === 0) fromReal(f);
    }
    function onChange(): void {
      const f = input!.files && input!.files[0];
      if (f && f.type && f.type.indexOf("image/") === 0) fromReal(f);
      input!.value = "";
    }
    zone.addEventListener("dragover", onOver as EventListener);
    zone.addEventListener("dragleave", onLeave);
    zone.addEventListener("drop", onDrop as EventListener);
    input.addEventListener("change", onChange);

    let cur = -1;
    if (reduce) {
      addTile(IMGS[0].w, IMGS[0].h, IMGS[0].seed);
    } else {
      let nextAt = 0;
      const step = (now: number): void => {
        if (now >= nextAt) {
          nextAt = now + 620;
          cur = (cur + 1) % IMGS.length;
          const p = IMGS[cur];
          addTile(p.w, p.h, p.seed);
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
      <div className={styles.pg}>
        <p className={styles.hint} id="pgHintReact">{HINT}</p>
        <div
          className={styles.zone}
          ref={zoneRef}
          role="button"
          tabIndex={0}
          aria-describedby="pgHintReact"
          aria-label={ARIA_LABEL}
        >
          <input type="file" accept="image/*" className={styles.file} ref={inputRef} aria-label="파일 선택" />
          <svg className={styles.ic} viewBox="0 0 256 256" aria-hidden="true">
            <g fill="currentColor">
              <path d="M216 40H40a16 16 0 0 0-16 16v144a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16" opacity=".2" />
              <path d="M216 40H40a16 16 0 0 0-16 16v144a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16m0 16v102.75l-26.07-26.06a16 16 0 0 0-22.63 0l-20 20-44-44a16 16 0 0 0-22.62 0L40 149.37V56Zm-176 144v-14.37l52-52l80 80H40Zm176 0h-98.75l-36-36l20-20L200 172.69V200Zm-72-100a20 20 0 1 0-20-20a20 20 0 0 0 20 20" />
            </g>
          </svg>
        </div>
        <div className={styles.grid} ref={gridRef} aria-live="polite" />
        <p className={styles.metaRow}>
          <span className={styles.unit} ref={unitRef}>tiles 0 · max 160px</span>
        </p>
      </div>
    </main>
  );
}
