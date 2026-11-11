import type { CSSProperties } from "react";
import styles from "./GroupedHeaderStickySection.module.scss";

export type Group = { letter: string; names: string[] };

export type GroupedHeaderStickySectionProps = {
  groups: Group[];
  /** 스크롤 이징 (기본 300ms) */
  duration?: number;
  easing?: string;
  /** 첫 그룹 헤더 배경(파스텔) */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/** 그룹 헤더가 position:sticky 로 스크롤 중 위에 붙어 있다가 다음 그룹이 밀어 올린다 */
export default function GroupedHeaderStickySection({
  groups,
  duration = 300,
  easing = "ease-out",
  color = "#ff9ebb",
}: GroupedHeaderStickySectionProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.wrap} style={vars} tabIndex={0} aria-label="연락처 목록">
      <ul className={styles.list}>
        {groups.map((g, i) => (
          <li key={g.letter} className={styles.group}>
            <div className={styles.header} data-i={i % 3}>{g.letter}</div>
            <ul className={styles.rows}>
              {g.names.map((n) => <li key={n}>{n}</li>)}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
