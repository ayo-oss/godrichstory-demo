import { useRef, useState, type CSSProperties } from "react";
import styles from "./ListToDetailSlideTransition.module.scss";

export type ListRow = { title: string; heading: string; body: string };

export type ListToDetailSlideTransitionProps = {
  rows: ListRow[];
  /** 패널 슬라이드 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/** 목록 패널과 상세 패널을 나란히 두고 track 전체를 translateX 로 밀어 전환한다 */
export default function ListToDetailSlideTransition({
  rows,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: ListToDetailSlideTransitionProps) {
  const [open, setOpen] = useState<ListRow | null>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div
      className={styles.viewport}
      style={vars}
      onKeyDown={(e: any) => { if (e.key === "Escape" && open) setOpen(null); }}
    >
      <div className={styles.track} style={{ transform: open ? "translateX(-50%)" : undefined }}>
        <ul className={styles.list}>
          {rows.map((row) => (
            <li key={row.title}>
              <button className={styles.row} type="button" onClick={() => setOpen(row)}>
                <span>{row.title}</span>
                <svg viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="m176 128l-80 80V48Z" opacity=".2" /><path d="m181.66 122.34l-80-80A8 8 0 0 0 88 48v160a8 8 0 0 0 13.66 5.66l80-80a8 8 0 0 0 0-11.32M104 188.69V67.31L164.69 128Z" /></g></svg>
              </button>
            </li>
          ))}
        </ul>
        <div className={styles.detail}>
          <button ref={backRef} className={styles.back} type="button" onClick={() => setOpen(null)}>
            <svg viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M112 56v144l-72-72Z" opacity=".2" /><path d="M216 120h-96V56a8 8 0 0 0-13.66-5.66l-72 72a8 8 0 0 0 0 11.32l72 72A8 8 0 0 0 120 200v-64h96a8 8 0 0 0 0-16m-112 60.69L51.31 128L104 75.31Z" /></g></svg>
            목록
          </button>
          {open && <><h2>{open.heading}</h2><p>{open.body}</p></>}
        </div>
      </div>
    </div>
  );
}
