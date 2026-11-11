import { useEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./StopFooterButton.module.scss";

export type StopFooterButtonProps = {
  /** 겹치지 않게 감시할 푸터 요소를 가리키는 선택자 (기본 "footer") */
  footerSelector?: string;
  duration?: number;
  easing?: string;
};

type Vars = CSSProperties & { "--lift"?: string; "--duration"?: string; "--easing"?: string };

// 실제 사용: 푸터가 화면에 들어오면 겹친 높이만큼 translateY 로 버튼을 밀어 올린다
export default function StopFooterButton({
  footerSelector = "footer",
  duration = 2000,
  easing = "ease-out",
}: StopFooterButtonProps) {
  const [lift, setLift] = useState(0);
  const observed = useRef(false);

  useEffect(() => {
    const footer = document.querySelector(footerSelector);
    if (!footer || observed.current) return;
    observed.current = true;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => setLift(Math.max(0, e.intersectionRect.height)));
    }, { threshold: [0, 0.01, 1] });
    io.observe(footer);
    return () => io.disconnect();
  }, [footerSelector]);

  const vars: Vars = { "--lift": `${lift}px`, "--duration": `${duration}ms`, "--easing": easing };

  return (
    <button
      type="button"
      className={styles.totop}
      style={vars}
      aria-label="맨 위로"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <svg className={styles.arrow} viewBox="0 0 24 24" aria-hidden="true">
        <polyline points="5,15 12,8 19,15" />
      </svg>
    </button>
  );
}
