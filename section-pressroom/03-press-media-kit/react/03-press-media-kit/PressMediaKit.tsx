import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PressMediaKit.module.scss";

export type PressMediaKitProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const FILES = [
  { id: "logo", name: "로고 팩 (SVG · PNG)", size: "1.2MB" },
  { id: "guide", name: "브랜드 가이드 (PDF)", size: "3.4MB" },
  { id: "shots", name: "제품 스크린샷 (ZIP)", size: "4.8MB" },
];

export default function PressMediaKit({ duration = 300, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#2f6df6" }: PressMediaKitProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState("");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const count = Object.values(checked).filter(Boolean).length;

  function toggle(id: string, e: any) {
    setChecked((c) => ({ ...c, [id]: e.target.checked }));
  }

  function download() {
    const next: Record<string, boolean> = {};
    FILES.forEach((f) => { if (checked[f.id]) next[f.id] = true; });
    setDone((d) => ({ ...d, ...next }));
    setStatus(`파일 ${count}개를 받았습니다.`);
  }

  return (
    <section className={styles.mk} style={vars}>
      <h2 className={styles.title}>미디어 키트</h2>
      <ul className={styles.list}>
        {FILES.map((f) => (
          <li key={f.id} className={done[f.id] ? `${styles.row} ${styles.done}` : styles.row}>
            <label className={styles.label}>
              <input className={styles.check} type="checkbox" checked={!!checked[f.id]} onChange={(e: any) => toggle(f.id, e)} />
              <span className={styles.name}>{f.name}</span>
            </label>
            {!done[f.id] && <span className={styles.size}>{f.size}</span>}
            <svg className={styles.doneIc} viewBox="0 0 20 20" aria-hidden="true"><polyline points="4,10 8,14 16,5" /></svg>
          </li>
        ))}
      </ul>
      <button type="button" className={styles.btn} disabled={count === 0} onClick={download}>
        <span className={styles.btnIc} aria-hidden="true" />
        {count ? ` 선택한 파일 받기 (${count})` : " 선택한 파일 받기"}
      </button>
      <p className={styles.status} role="status" aria-live="polite">{status}</p>
    </section>
  );
}
