import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ScrollHideRail.module.scss";

type ScrollEv = { currentTarget: HTMLDivElement };

export type ScrollHideRailProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

const LINKS = ["개요", "설치", "사용법", "문제 해결"];

export default function ScrollHideRail({
  duration = 220,
  easing = "ease-out",
  color = "#fff7e6",
}: ScrollHideRailProps) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  function onScroll(e: ScrollEv) {
    const y = e.currentTarget.scrollTop;
    const last = lastY.current ?? 0;
    if (y > last + 4) setHidden(true);
    else if (y < last - 4) setHidden(false);
    lastY.current = y;
  }

  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.stage} style={vars}>
      <div className={styles.layout}>
        <nav className={styles.rail} data-hidden={hidden} aria-label="목차">
          {LINKS.map((label) => (
            <a key={label} className={styles.link} href="#">{label}</a>
          ))}
        </nav>
        <div className={styles.content} onScroll={onScroll}>
          <p>이 영역을 아래로 스크롤하면 왼쪽 레일이 비켜난다.</p>
          <p>다시 위로 스크롤하면 레일이 즉시 돌아온다.</p>
          <p>본문이 긴 문서에서 목차가 화면을 계속 차지하지 않게 한다.</p>
          <p>레일은 창 전체가 아니라 이 콘텐츠 영역의 스크롤만 본다.</p>
        </div>
      </div>
    </div>
  );
}
