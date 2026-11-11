import type { CSSProperties } from "react";
import styles from "./PaperFooter.module.scss";

export type FooterColumn = { head: string; links: string[] };

export type PaperFooterProps = {
  columns?: FooterColumn[];
  /** 띠에 놓을 색종이 색 한 벌. 컴포넌트가 두 벌로 복제한다 */
  chips?: string[];
  /** 한 벌만큼 흐르는 시간(기본 2000ms) */
  duration?: number;
};

type Vars = CSSProperties & { "--duration"?: string };

export default function PaperFooter({
  columns = [
    { head: "공작실", links: ["소개", "기록"] },
    { head: "재료", links: ["색종이", "스티커"] },
    { head: "도움말", links: ["문의", "약관"] },
  ],
  chips = ["#cc3d26", "#f6c453", "#2b7d5a", "#2f6fb8"],
  duration = 2000,
}: PaperFooterProps) {
  const vars: Vars = { "--duration": `${duration}ms` };
  // 한 벌을 그대로 두 번 깔아야 -50% 지점이 첫 프레임과 완전히 같아진다 (이음매 없음)
  const track = [...chips, ...chips];

  return (
    <footer className={styles.pfoot} style={vars}>
      <div className={styles.cols}>
        {columns.map((c) => (
          <div key={c.head} className={styles.col}>
            <p className={styles.h}>{c.head}</p>
            {c.links.map((l) => <p key={l} className={styles.l}>{l}</p>)}
          </div>
        ))}
      </div>
      <div className={styles.strip} aria-hidden="true">
        <div className={styles.track}>
          {track.map((c, i) => <span key={`${c}-${i}`} className={styles.bit} style={{ background: c }} />)}
        </div>
      </div>
    </footer>
  );
}
