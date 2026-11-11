// DropPasteClipboard — vanilla 판(run/337/demo/06-drop-paste-clipboard/index.html) 의 React 포트.
// DataTransferItemList 를 순회해 kind==='file' 만 getAsFile() 로 건지고, kind==='string' 은
// '걸러짐' 카운터로 센다 — items.length 전체와 실제로 통과한 파일 수의 차이가 계산 한 겹.
// 자동 시연은 ClipboardEvent 를 직접 만들어 clipboardData 를 defineProperty 로 얹어 dispatch 한다.
import { useEffect, useRef } from "react";
import styles from "./DropPasteClipboard.module.scss";

export type DropPasteClipboardProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Box<T> = { current: T };

const HINT = "items.length 전체에서 kind === 'file' 만 골라내고 나머지는 걸러짐으로 셉니다";
const ARIA_LABEL = "붙여넣기 드롭존";

function mulberry32(a: number): () => number {
  return function (): number {
    a |= 0; a = a + 0x6d2b79f5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

type Entry = { kind: "string" | "file"; name?: string; type?: string };
const SETS: Entry[][] = [
  [{ kind: "string" }, { kind: "file", name: "shot-01.png", type: "image/png" }, { kind: "string" }],
  [{ kind: "file", name: "shot-02.jpg", type: "image/jpeg" }, { kind: "file", name: "note.pdf", type: "application/pdf" }],
  [{ kind: "string" }, { kind: "string" }, { kind: "file", name: "clip-03.png", type: "image/png" }, { kind: "string" }]
];
const HEXES = ["#9fc9ec", "#93d9c0", "#b9a0ff", "#f6c6d3", "#cfd8f5"];

export default function DropPasteClipboard({
  duration = "220ms",
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#17141a"
}: DropPasteClipboardProps) {
  const zoneRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const itemsRef = useRef<HTMLUListElement | null>(null);
  const tagRef = useRef<HTMLSpanElement | null>(null);
  const unitRef = useRef<HTMLSpanElement | null>(null);
  const rafRef = useRef(0) as Box<number>;

  useEffect(() => {
    const zone = zoneRef.current;
    const input = inputRef.current;
    const itemsEl = itemsRef.current;
    const tagEl = tagRef.current;
    const unitEl = unitRef.current;
    if (!zone || !input || !itemsEl || !tagEl || !unitEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rnd = mulberry32(606);

    function render(total: number, picked: { name: string; type: string }[], skipped: number): void {
      itemsEl!.textContent = "";
      picked.forEach((f) => {
        const li = document.createElement("li");
        li.className = styles.item;
        const dot = document.createElement("span");
        dot.className = styles.dot;
        dot.style.background = HEXES[Math.floor(rnd() * HEXES.length)];
        const nm = document.createElement("span");
        nm.className = styles.name;
        nm.textContent = f.name + " · " + f.type;
        li.appendChild(dot); li.appendChild(nm);
        itemsEl!.appendChild(li);
        if (!reduce) requestAnimationFrame(() => li.classList.add(styles.itemIn));
        else li.classList.add(styles.itemIn);
      });
      tagEl!.textContent = "items.length " + total;
      unitEl!.textContent = "kind file " + picked.length + " · 걸러짐 " + skipped;
    }

    // 실제 클립보드 items 순회 — DataTransferItemList
    function fromClipboard(list: DataTransferItemList): void {
      const total = list.length;
      const picked: { name: string; type: string }[] = [];
      let skipped = 0;
      for (let i = 0; i < list.length; i++) {
        const it = list[i];
        if (it.kind === "file") {
          const f = it.getAsFile();
          if (f) picked.push({ name: f.name, type: f.type });
          else skipped++;
        } else {
          skipped++;
        }
      }
      render(total, picked, skipped);
    }

    // 가상 클립보드 — 진짜 DataTransfer 에 items.add 로 file/string 을 채운다
    function virtualClipboardData(set: Entry[]): DataTransfer {
      const dt = new DataTransfer();
      set.forEach((e, i) => {
        if (e.kind === "file") {
          try {
            dt.items.add(new File([new Blob(["x"])], e.name || ("f" + i), { type: e.type || "application/octet-stream" }));
          } catch (err) { /* 생성 불가 환경 — 건너뜀 */ }
        } else {
          try { dt.items.add("text-" + i, "text/plain"); } catch (err) { /* noop */ }
        }
      });
      return dt;
    }

    function simulatePaste(set: Entry[]): void {
      const dt = virtualClipboardData(set);
      const evt = new ClipboardEvent("paste", {});
      Object.defineProperty(evt, "clipboardData", { value: dt, configurable: true });
      zone!.dispatchEvent(evt);
      if (!reduce) {
        zone!.classList.add(styles.zoneOver);
        window.setTimeout(() => zone!.classList.remove(styles.zoneOver), 240);
      }
    }

    function onPaste(clipboardEvent: ClipboardEvent): void {
      // 붙여넣기 전용 DataTransfer — ClipboardEvent.clipboardData 를 그대로 훑는다
      const cd = clipboardEvent.clipboardData;
      if (cd && cd.items) fromClipboard(cd.items);
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
      if (e.dataTransfer && e.dataTransfer.items) fromClipboard(e.dataTransfer.items);
    }
    function onChange(): void {
      const files = input!.files;
      if (files && files.length) {
        const picked = Array.prototype.slice.call(files).map((f: File) => ({ name: f.name, type: f.type }));
        render(files.length, picked, 0);
      }
      input!.value = "";
    }
    zone.addEventListener("paste", onPaste as EventListener);
    zone.addEventListener("dragover", onOver as EventListener);
    zone.addEventListener("dragleave", onLeave);
    zone.addEventListener("drop", onDrop as EventListener);
    input.addEventListener("change", onChange);

    let cur = -1;
    if (reduce) {
      simulatePaste(SETS[0]);
    } else {
      let nextAt = 0;
      const step = (now: number): void => {
        if (now >= nextAt) {
          nextAt = now + 800;
          cur = (cur + 1) % SETS.length;
          simulatePaste(SETS[cur]);
        }
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      zone.removeEventListener("paste", onPaste as EventListener);
      zone.removeEventListener("dragover", onOver as EventListener);
      zone.removeEventListener("dragleave", onLeave);
      zone.removeEventListener("drop", onDrop as EventListener);
      input.removeEventListener("change", onChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.pc}>
        <p className={styles.hint} id="pcHintReact">{HINT}</p>
        <div
          className={styles.zone}
          ref={zoneRef}
          role="button"
          tabIndex={0}
          aria-describedby="pcHintReact"
          aria-label={ARIA_LABEL}
        >
          <input type="file" multiple className={styles.file} ref={inputRef} aria-label="파일 선택" />
          <svg className={styles.ic} viewBox="0 0 256 256" aria-hidden="true">
            <g fill="currentColor">
              <path d="M200 40v176a8 8 0 0 1-8 8H64a8 8 0 0 1-8-8V40a8 8 0 0 1 8-8h40l8 16h32l8-16h40a8 8 0 0 1 8 8" opacity=".2" />
              <path d="M184 24h-31.06a15.92 15.92 0 0 0-8.5-8.6a32 32 0 0 0-25.34 0a15.92 15.92 0 0 0-8.5 8.6H72a16 16 0 0 0-16 16v192a16 16 0 0 0 16 16h112a16 16 0 0 0 16-16V40a16 16 0 0 0-16-16m-56 0a8 8 0 1 1-8 8a8 8 0 0 1 8-8m56 208H72V40h20.26A15.9 15.9 0 0 0 96 46.63a16 16 0 0 0 12.66 6.19a15.86 15.86 0 0 0 6.31-1.31A32 32 0 0 0 128 56a32.06 32.06 0 0 0 13-2.49a15.86 15.86 0 0 0 6.31 1.31A16 16 0 0 0 160 46.63a15.9 15.9 0 0 0 3.74-6.63H184Z" />
            </g>
          </svg>
        </div>
        <ul className={styles.items} ref={itemsRef} aria-live="polite" />
        <p className={styles.meta}>
          <span className={styles.tag} ref={tagRef} style={{ color }}>items.length 0</span>
          <span className={styles.unit} ref={unitRef}>kind file 0 · 걸러짐 0</span>
        </p>
      </div>
    </main>
  );
}
