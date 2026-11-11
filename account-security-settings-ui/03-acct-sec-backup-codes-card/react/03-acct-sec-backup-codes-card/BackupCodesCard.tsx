import { useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./BackupCodesCard.module.scss";

export type BackupCode = { id: string; value: string; used?: boolean };
export type BackupCodesCardProps = {
  title?: string;
  codes?: BackupCode[];
  copyLabel?: string;
  doneLabel?: string;
  sayText?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Timer = ReturnType<typeof setTimeout>;

const COPY: ReactNode = (
  <g fill="currentColor">
    <path d="M216 40v128h-48V88H88V40Z" opacity=".2" />
    <path d="M216 32H88a8 8 0 0 0-8 8v40H40a8 8 0 0 0-8 8v128a8 8 0 0 0 8 8h128a8 8 0 0 0 8-8v-40h40a8 8 0 0 0 8-8V40a8 8 0 0 0-8-8m-56 176H48V96h112Zm48-48h-32V88a8 8 0 0 0-8-8H96V48h112Z" />
  </g>
);

const DEFAULT_CODES: BackupCode[] = [
  { id: "c1", value: "D4K9-P2M7" },
  { id: "c2", value: "X8R3-T6W1" },
  { id: "c3", value: "Q5N8-J2H4", used: true },
  { id: "c4", value: "M7V2-C9L5" },
  { id: "c5", value: "R3F6-B8K2" },
  { id: "c6", value: "H9T4-N5D7", used: true },
];

export default function BackupCodesCard({
  title = "백업 코드",
  codes = DEFAULT_CODES,
  copyLabel = "전체 복사",
  doneLabel = "복사됨",
  sayText = "백업 코드 6개를 클립보드에 복사했습니다",
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#4cd4a6",
}: BackupCodesCardProps) {
  const [demo, setDemo] = useState(true);
  const [copied, setCopied] = useState(false);
  const t = useRef<Timer>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 전체 복사는 navigator.clipboard.writeText 로 실제로 쓰고, 라벨이 잠깐 갈렸다 돌아오며 같은 말이 읽힌다
  function copy() {
    setDemo(false); // 사람이 만졌으니 자동 루프를 끈다
    if (t.current !== null) clearTimeout(t.current);
    setCopied(true);
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(codes.map((c: BackupCode) => c.value).join("\n"));
    }
    t.current = setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className={`${styles.bc} ${demo ? styles.isDemo : ""}`} style={vars} data-copied={copied ? "1" : "0"}>
      <h2 className={styles.title}>{title}</h2>
      <ul className={styles.grid}>
        {codes.map((c: BackupCode) => (
          <li key={c.id} className={`${styles.code} ${c.used ? styles.codeUsed : ""}`} data-code={c.id}>
            {c.value}
            <span className={styles.strike} data-strike={c.id} />
          </li>
        ))}
      </ul>
      <button className={styles.copyBtn} type="button" onClick={copy}>
        <span className={styles.ic} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="16" height="16">{COPY}</svg>
        </span>
        <span className={styles.labels}>
          <span className={styles.label} data-label="copy">{copyLabel}</span>
          <span className={styles.label} data-label="done">{doneLabel}</span>
        </span>
      </button>
      <p className={styles.live} role="status" aria-live="polite">{sayText}</p>
    </section>
  );
}
