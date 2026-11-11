// DropMultiFile — vanilla 판(run/337/demo/03-drop-multi-file/index.html) 의 React 포트.
// DataTransfer.files 를 배열로 펼쳐 length 로 개수를 세고, 고정 칸 수(6)에서 채워진 칸을 빼
// 남은 칸을 계산해 빈 칸에만 점선을 남긴다. 최대를 넘는 파일은 잘리지 않고 'N개 초과' 안내와
// 함께 그리드 바깥에 따로 쌓는다. 카운터 계산이 이 데모의 축이다.
import { useEffect, useRef } from "react";
import styles from "./DropMultiFile.module.scss";

export type DropMultiFileProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Box<T> = { current: T };

const HINT = "놓인 개수를 세어 채워진 칸·빈 칸·초과분을 계산합니다 — 최대 6칸";
const ARIA_LABEL = "다중 파일 드롭존";

function mulberry32(a: number): () => number {
  return function (): number {
    a |= 0; a = a + 0x6d2b79f5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const MAX = 6;   // 고정 칸 수 — 문구·계산 전부 이 상수에서 나온다
const NAMES = ["sky-01.png", "sea-02.jpg", "forest-03.png", "desert-04.jpg", "snow-05.png", "volcano-06.jpg",
  "lake-07.png", "city-08.jpg"];
const TYPES = ["image/png", "image/jpeg"];
const HEXES = ["#9fc9ec", "#93d9c0", "#b9a0ff", "#f6c6d3", "#cfd8f5", "#f0dfae"];
const BUNDLES = [3, 5, 8];   // 시나리오 묶음 크기 — 3 → 5 → 8(2 초과)

export default function DropMultiFile({
  duration = "220ms",
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#0a4fe8"
}: DropMultiFileProps) {
  const zoneRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const slotsRef = useRef<HTMLUListElement | null>(null);
  const pileRef = useRef<HTMLUListElement | null>(null);
  const tagRef = useRef<HTMLSpanElement | null>(null);
  const remainRef = useRef<HTMLSpanElement | null>(null);
  const overFlagRef = useRef<HTMLSpanElement | null>(null);
  const rafRef = useRef(0) as Box<number>;

  useEffect(() => {
    const zone = zoneRef.current;
    const input = inputRef.current;
    const slotsEl = slotsRef.current;
    const pileEl = pileRef.current;
    const tagEl = tagRef.current;
    const remainEl = remainRef.current;
    const overFlag = overFlagRef.current;
    if (!zone || !input || !slotsEl || !pileEl || !tagEl || !remainEl || !overFlag) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rnd = mulberry32(337);

    for (let i = 0; i < MAX; i++) {
      const li = document.createElement("li");
      li.className = styles.slot;
      slotsEl.appendChild(li);
    }

    // 계산·렌더 — files 배열 하나로 칸·초과·문구 전부를 유도한다
    function intake(files: FileList | File[]): void {
      const arr = Array.prototype.slice.call(files) as File[];
      const shown = arr.slice(0, MAX);
      const over = arr.length - Math.min(arr.length, MAX);   // 초과분 = length - MAX
      const filled = shown.length;
      const empty = MAX - filled;
      const slotLis = slotsEl!.children;
      for (let i = 0; i < MAX; i++) {
        const li = slotLis[i] as HTMLElement;
        li.className = styles.slot + (i < filled ? "" : " " + styles.slotEmpty);
        li.textContent = "";
        if (i < filled) {
          const f = shown[i];
          const dot = document.createElement("span");
          dot.className = styles.dot;
          dot.style.background = HEXES[(i + Math.floor(rnd() * 2)) % HEXES.length];
          const nm = document.createElement("span");
          nm.className = styles.name;
          nm.textContent = f.name;
          li.appendChild(dot); li.appendChild(nm);
          if (!reduce) {
            li.style.animation = "none";
            void li.offsetWidth;
            li.style.animation = "";
            li.classList.add(styles.slotPop);
          }
        }
      }
      pileEl!.textContent = "";
      if (over > 0) {
        overFlag!.textContent = over + "개 초과";
        overFlag!.classList.add(styles.overFlagOn);
        for (let k = MAX; k < arr.length; k++) {
          const pi = document.createElement("li");
          pi.className = styles.piled;
          pi.textContent = arr[k].name;
          pileEl!.appendChild(pi);
        }
      } else {
        overFlag!.textContent = "2개 초과";
        overFlag!.classList.remove(styles.overFlagOn);
      }
      tagEl!.textContent = "files.length " + arr.length + " / " + MAX;
      remainEl!.textContent = "빈 칸 " + empty + " · 초과 " + over;
    }

    // 가상 File 만들기 — 실제 File 객체(new File) 로 name/type/size 를 진짜로 갖게
    function virtualFiles(n: number): File[] {
      const out: File[] = [];
      const start = Math.floor(rnd() * 2);
      for (let i = 0; i < n; i++) {
        try {
          out.push(new File([new Blob(["x"])], NAMES[(start + i) % NAMES.length], { type: TYPES[i % 2] }));
        } catch (e) { /* File 생성 불가 환경 — 건너뜀 */ }
      }
      return out;
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
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) intake(e.dataTransfer.files);
    }
    function onChange(): void {
      if (input!.files && input!.files.length) intake(input!.files);
      input!.value = "";
    }
    zone.addEventListener("dragover", onOver as EventListener);
    zone.addEventListener("dragleave", onLeave);
    zone.addEventListener("drop", onDrop as EventListener);
    input.addEventListener("change", onChange);

    let bundle = -1;
    if (reduce) {
      intake(virtualFiles(BUNDLES[1]));
    } else {
      let nextAt = 0;
      const step = (now: number): void => {
        if (now >= nextAt) {
          nextAt = now + 700;
          bundle = (bundle + 1) % BUNDLES.length;
          intake(virtualFiles(BUNDLES[bundle]));
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
      <div className={styles.mf}>
        <p className={styles.hint} id="mfHintReact">{HINT}</p>
        <div
          className={styles.zone}
          ref={zoneRef}
          role="button"
          tabIndex={0}
          aria-describedby="mfHintReact"
          aria-label={ARIA_LABEL}
        >
          <input type="file" multiple className={styles.file} ref={inputRef} aria-label="파일 선택" />
          <svg className={styles.ic} viewBox="0 0 256 256" aria-hidden="true">
            <g fill="currentColor">
              <path d="M208 72v112a8 8 0 0 1-8 8h-24v-88l-40-40H80V40a8 8 0 0 1 8-8h80Z" opacity=".2" />
              <path d="m213.66 66.34l-40-40A8 8 0 0 0 168 24H88a16 16 0 0 0-16 16v16H56a16 16 0 0 0-16 16v144a16 16 0 0 0 16 16h112a16 16 0 0 0 16-16v-16h16a16 16 0 0 0 16-16V72a8 8 0 0 0-2.34-5.66M168 216H56V72h76.69L168 107.31zm32-32h-16v-80a8 8 0 0 0-2.34-5.66l-40-40A8 8 0 0 0 136 56H88V40h76.69L200 75.31Zm-56-32a8 8 0 0 1-8 8H88a8 8 0 0 1 0-16h48a8 8 0 0 1 8 8m0 32a8 8 0 0 1-8 8H88a8 8 0 0 1 0-16h48a8 8 0 0 1 8 8" />
            </g>
          </svg>
          <span className={styles.overFlag} ref={overFlagRef} aria-live="polite">2개 초과</span>
        </div>
        <ul className={styles.slots} ref={slotsRef} aria-live="polite" />
        <p className={styles.meta}>
          <span className={styles.tag} ref={tagRef} style={{ color }}>files.length 0 / 6</span>
          <span className={styles.unit} ref={remainRef}>빈 칸 6 · 초과 0</span>
        </p>
        <ul className={styles.pile} ref={pileRef} />
      </div>
    </main>
  );
}
