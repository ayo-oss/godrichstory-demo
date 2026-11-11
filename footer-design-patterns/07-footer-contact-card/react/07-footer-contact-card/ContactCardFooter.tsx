import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./ContactCardFooter.module.scss";

export type ContactCardFooterProps = {
  /** 한 주기(ms) — 핀이 떨어져 튀고 카드 셋이 서는 시간 */
  duration?: number;
  /** 핀 착지의 이징 */
  easing?: string;
  /** 핀·물결 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/* Phosphor Duotone (MIT) — 런타임에 불러오지 않고 그대로 박아 둔다 */
function PinIcon({ size }: { size: number | string }): ReactNode {
  return (
    <svg viewBox="0 0 256 256" width={size} height={size} aria-hidden="true">
      <g fill="currentColor">
        <path d="M128 24a80 80 0 0 0-80 80c0 72 80 128 80 128s80-56 80-128a80 80 0 0 0-80-80m0 112a32 32 0 1 1 32-32a32 32 0 0 1-32 32" opacity=".2" />
        <path d="M128 64a40 40 0 1 0 40 40a40 40 0 0 0-40-40m0 64a24 24 0 1 1 24-24a24 24 0 0 1-24 24m0-112a88.1 88.1 0 0 0-88 88c0 31.4 14.51 64.68 42 96.25a254.2 254.2 0 0 0 41.45 38.3a8 8 0 0 0 9.18 0a254.2 254.2 0 0 0 41.37-38.3c27.45-31.57 42-64.85 42-96.25a88.1 88.1 0 0 0-88-88m0 206c-16.53-13-72-60.75-72-118a72 72 0 0 1 144 0c0 57.23-55.47 105-72 118" />
      </g>
    </svg>
  );
}
function PhoneIcon(): ReactNode {
  return (
    <svg viewBox="0 0 256 256" width="18" height="18" aria-hidden="true">
      <g fill="currentColor">
        <path d="M223.94 174.08A48.33 48.33 0 0 1 176 216A136 136 0 0 1 40 80a48.33 48.33 0 0 1 41.92-47.94a8 8 0 0 1 8.3 4.8l21.13 47.2a8 8 0 0 1-.66 7.53L89.32 117a7.93 7.93 0 0 0-.54 7.81c8.27 16.93 25.77 34.22 42.75 42.41a7.92 7.92 0 0 0 7.83-.59l25-21.3a8 8 0 0 1 7.59-.69l47.16 21.13a8 8 0 0 1 4.83 8.31" opacity=".2" />
        <path d="m222.37 158.46l-47.11-21.11l-.13-.06a16 16 0 0 0-15.17 1.4a8 8 0 0 0-.75.56L134.87 160c-15.42-7.49-31.34-23.29-38.83-38.51l20.78-24.71c.2-.25.39-.5.57-.77a16 16 0 0 0 1.32-15.06v-.12L97.54 33.64a16 16 0 0 0-16.62-9.52A56.26 56.26 0 0 0 32 80c0 79.4 64.6 144 144 144a56.26 56.26 0 0 0 55.88-48.92a16 16 0 0 0-9.51-16.62M176 208A128.14 128.14 0 0 1 48 80a40.2 40.2 0 0 1 34.87-40a.6.6 0 0 0 0 .12l21 47l-20.67 24.74a6 6 0 0 0-.57.77a16 16 0 0 0-1 15.7c9.06 18.53 27.73 37.06 46.46 46.11a16 16 0 0 0 15.75-1.14a8 8 0 0 0 .74-.56L168.89 152l47 21.05h.11A40.21 40.21 0 0 1 176 208" />
      </g>
    </svg>
  );
}
function MailIcon(): ReactNode {
  return (
    <svg viewBox="0 0 256 256" width="18" height="18" aria-hidden="true">
      <g fill="currentColor">
        <path d="m224 56l-96 88l-96-88Z" opacity=".2" />
        <path d="M224 48H32a8 8 0 0 0-8 8v136a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a8 8 0 0 0-8-8m-20.57 16L128 133.15L52.57 64ZM216 192H40V74.19l82.59 75.71a8 8 0 0 0 10.82 0L216 74.19z" />
      </g>
    </svg>
  );
}

export default function ContactCardFooter({
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#ff4d1f",
}: ContactCardFooterProps): ReactNode {
  const [demo, setDemo] = useState(true);
  const [drop, setDrop] = useState(false);
  const pin = useRef<HTMLSpanElement>(null);

  // 격자 미리보기용 자동 재생. 사람이 손을 대면 떼고 진짜 조작으로 넘긴다
  useEffect(() => {
    const off = (): void => setDemo(false);
    document.addEventListener("pointerdown", off, { once: true });
    document.addEventListener("keydown", off, { once: true });
    return () => {
      document.removeEventListener("pointerdown", off);
      document.removeEventListener("keydown", off);
    };
  }, []);

  // 지도를 누르면 핀이 한 번 더 떨어진다 (마우스·터치·Enter·Space 모두 click 으로 온다).
  // 한 프레임 껐다 켜야 같은 애니메이션이 처음부터 다시 돈다
  const dropAgain = useCallback((): void => {
    setDrop(false);
    window.requestAnimationFrame(() => setDrop(true));
  }, []);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const mapClass = `${styles.map} ${drop ? styles.isDrop : ""}`;

  return (
    <footer className={`${styles.fc} ${demo ? styles.isDemo : ""}`} style={vars}>
      <button className={mapClass} type="button" aria-label="핀 다시 떨어뜨리기" onClick={dropAgain}>
        <span className={styles.ripple} aria-hidden="true" />
        <span className={styles.pin} ref={pin} aria-hidden="true" onAnimationEnd={() => setDrop(false)}>
          <PinIcon size="100%" />
        </span>
      </button>

      <div className={styles.side}>
        <h2 className={styles.title}>오시는 길</h2>
        <address className={styles.cards}>
          <a className={styles.card} href="#">
            <span className={styles.ic} aria-hidden="true"><PinIcon size={18} /></span>
            <span className={styles.txt}>
              <span className={styles.k}>주소</span>
              <span className={styles.v}>도심 큰길 12, 4층</span>
            </span>
          </a>
          <a className={styles.card} href="tel:00000000000">
            <span className={styles.ic} aria-hidden="true"><PhoneIcon /></span>
            <span className={styles.txt}>
              <span className={styles.k}>전화</span>
              <span className={styles.v}>000-0000-0000</span>
            </span>
          </a>
          <a className={styles.card} href="mailto:hello@example.com">
            <span className={styles.ic} aria-hidden="true"><MailIcon /></span>
            <span className={styles.txt}>
              <span className={styles.k}>메일</span>
              <span className={styles.v}>hello@example.com</span>
            </span>
          </a>
        </address>
      </div>
    </footer>
  );
}
