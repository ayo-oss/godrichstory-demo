import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PushContentDrawer.module.scss";

export type PushContentDrawerProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

export default function PushContentDrawer({
  duration = 600,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: PushContentDrawerProps) {
  const [open, setOpen] = useState(false);

  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.stage} style={vars}>
      <div className={styles.layout}>
        <nav className={styles.drawer} data-open={open} aria-label="사이드 내비게이션" aria-hidden={!open}>
          <a className={styles.link} href="#" tabIndex={open ? 0 : -1}>대시보드</a>
          <a className={styles.link} href="#" tabIndex={open ? 0 : -1}>보고서</a>
          <a className={styles.link} href="#" tabIndex={open ? 0 : -1}>설정</a>
        </nav>
        <div className={styles.content} data-open={open}>
          <button className={styles.trigger} type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            사이드바 열기
          </button>
          <p className={styles.line}>본문 영역은 오버레이 없이 옆으로 자리를 내준다.</p>
        </div>
      </div>
    </div>
  );
}
