import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PromoFooter.module.scss";

export type PromoFooterProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function PromoFooter({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#2f6df6" }: PromoFooterProps) {
  const [open, setOpen] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <footer className={styles.pt} style={vars}>
      <span className={styles.sheen} aria-hidden="true" />
      <div className={styles.top}>
        <span className={styles.mark} aria-hidden="true" />
        <p className={styles.tagline}>캠페인이 끝나도 계속 씁니다</p>
      </div>
      <div className={styles.group}>
        <button type="button" className={styles.groupToggle} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          바로가기
        </button>
        <div className={`${styles.linksWrap} ${open ? styles.isOpen : ""}`}>
          <ul className={styles.links}>
            <li><a href="#">요금제</a></li>
            <li><a href="#">이용약관</a></li>
            <li><a href="#">문의하기</a></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
