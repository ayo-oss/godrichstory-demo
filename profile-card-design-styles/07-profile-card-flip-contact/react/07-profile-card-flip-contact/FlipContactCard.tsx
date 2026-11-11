import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FlipContactCard.module.scss";

export type FlipContactCardProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const IconUserPlus = () => (
  <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true"><g fill="currentColor"><path d="M168 100a60 60 0 1 1-60-60a60 60 0 0 1 60 60" opacity=".2"/><path d="M256 136a8 8 0 0 1-8 8h-16v16a8 8 0 0 1-16 0v-16h-16a8 8 0 0 1 0-16h16v-16a8 8 0 0 1 16 0v16h16a8 8 0 0 1 8 8m-57.87 58.85a8 8 0 0 1-12.26 10.3C165.75 181.19 138.09 168 108 168s-57.75 13.19-77.87 37.15a8 8 0 0 1-12.25-10.3c14.94-17.78 33.52-30.41 54.17-37.17a68 68 0 1 1 71.9 0c20.65 6.76 39.23 19.39 54.18 37.17M108 152a52 52 0 1 0-52-52a52.06 52.06 0 0 0 52 52"/></g></svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true"><g fill="currentColor"><path d="M232 56v144a16 16 0 0 1-16 16H40a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16" opacity=".2"/><path d="m205.66 85.66l-96 96a8 8 0 0 1-11.32 0l-40-40a8 8 0 0 1 11.32-11.32L104 164.69l90.34-90.35a8 8 0 0 1 11.32 11.32"/></g></svg>
);
const IconFlip = () => (
  <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true"><g fill="currentColor"><path d="M216 128a88 88 0 1 1-88-88a88 88 0 0 1 88 88" opacity=".2"/><path d="M224 48v48a8 8 0 0 1-8 8h-48a8 8 0 0 1 0-16h28.69l-14.63-14.63a79.56 79.56 0 0 0-56.13-23.43h-.45a79.52 79.52 0 0 0-55.89 22.77a8 8 0 0 1-11.18-11.44a96 96 0 0 1 135 .79L208 76.69V48a8 8 0 0 1 16 0m-37.59 135.29a80 80 0 0 1-112.47-.66L59.31 168H88a8 8 0 0 0 0-16H40a8 8 0 0 0-8 8v48a8 8 0 0 0 16 0v-28.69l14.63 14.63A95.43 95.43 0 0 0 130 222.06h.53a95.36 95.36 0 0 0 67.07-27.33a8 8 0 0 0-11.18-11.44Z"/></g></svg>
);
const IconMail = () => (
  <svg viewBox="0 0 256 256" width="15" height="15" aria-hidden="true"><g fill="currentColor"><path d="m224 56l-96 88l-96-88Z" opacity=".2"/><path d="M224 48H32a8 8 0 0 0-8 8v136a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a8 8 0 0 0-8-8m-20.57 16L128 133.15L52.57 64ZM216 192H40V74.19l82.59 75.71a8 8 0 0 0 10.82 0L216 74.19z"/></g></svg>
);
const IconPhone = () => (
  <svg viewBox="0 0 256 256" width="15" height="15" aria-hidden="true"><g fill="currentColor"><path d="M223.94 174.08A48.33 48.33 0 0 1 176 216A136 136 0 0 1 40 80a48.33 48.33 0 0 1 41.92-47.94a8 8 0 0 1 8.3 4.8l21.13 47.2a8 8 0 0 1-.66 7.53L89.32 117a7.93 7.93 0 0 0-.54 7.81c8.27 16.93 25.77 34.22 42.75 42.41a7.92 7.92 0 0 0 7.83-.59l25-21.3a8 8 0 0 1 7.59-.69l47.16 21.13a8 8 0 0 1 4.83 8.31" opacity=".2"/><path d="m222.37 158.46l-47.11-21.11l-.13-.06a16 16 0 0 0-15.17 1.4a8 8 0 0 0-.75.56L134.87 160c-15.42-7.49-31.34-23.29-38.83-38.51l20.78-24.71c.2-.25.39-.5.57-.77a16 16 0 0 0 1.32-15.06v-.12L97.54 33.64a16 16 0 0 0-16.62-9.52A56.26 56.26 0 0 0 32 80c0 79.4 64.6 144 144 144a56.26 56.26 0 0 0 55.88-48.92a16 16 0 0 0-9.51-16.62M176 208A128.14 128.14 0 0 1 48 80a40.2 40.2 0 0 1 34.87-40a.6.6 0 0 0 0 .12l21 47l-20.67 24.74a6 6 0 0 0-.57.77a16 16 0 0 0-1 15.7c9.06 18.53 27.73 37.06 46.46 46.11a16 16 0 0 0 15.75-1.14a8 8 0 0 0 .74-.56L168.89 152l47 21.05h.11A40.21 40.21 0 0 1 176 208"/></g></svg>
);
const IconGlobe = () => (
  <svg viewBox="0 0 256 256" width="15" height="15" aria-hidden="true"><g fill="currentColor"><path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2"/><path d="M128 24a104 104 0 1 0 104 104A104.12 104.12 0 0 0 128 24m88 104a87.6 87.6 0 0 1-3.33 24h-38.51a157.4 157.4 0 0 0 0-48h38.51a87.6 87.6 0 0 1 3.33 24m-114 40h52a115.1 115.1 0 0 1-26 45a115.3 115.3 0 0 1-26-45m-3.9-16a140.8 140.8 0 0 1 0-48h59.88a140.8 140.8 0 0 1 0 48ZM40 128a87.6 87.6 0 0 1 3.33-24h38.51a157.4 157.4 0 0 0 0 48H43.33A87.6 87.6 0 0 1 40 128m114-40h-52a115.1 115.1 0 0 1 26-45a115.3 115.3 0 0 1 26 45m52.33 0h-35.62a135.3 135.3 0 0 0-22.3-45.6A88.29 88.29 0 0 1 206.37 88Zm-98.74-45.6A135.3 135.3 0 0 0 85.29 88H49.63a88.29 88.29 0 0 1 57.96-45.6M49.63 168h35.66a135.3 135.3 0 0 0 22.3 45.6A88.29 88.29 0 0 1 49.63 168m98.78 45.6a135.3 135.3 0 0 0 22.3-45.6h35.66a88.29 88.29 0 0 1-57.96 45.6"/></g></svg>
);

export default function FlipContactCard({
  duration = 600,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: FlipContactCardProps) {
  const [back, setBack] = useState(false);
  const [following, setFollowing] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const followClass = following
    ? `${styles.btn} ${styles.btnFollow} ${styles.isOn}`
    : `${styles.btn} ${styles.btnFollow}`;

  return (
    <div className={styles.fc} style={vars}>
      <div className={back ? `${styles.inner} ${styles.isBack}` : styles.inner}>
        <div className={`${styles.face} ${styles.faceFront}`} aria-hidden={back ? "true" : undefined}>
          <span className={styles.avatar} aria-hidden="true">SA</span>
          <p className={styles.name}>오세아</p>
          <p className={styles.role}>UX 리서처</p>
          <p className={styles.stats}>
            <span className={styles.num}>1,204</span> 팔로워 · <span className={styles.num}>62</span> 게시물
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={followClass}
              aria-pressed={following}
              tabIndex={back ? -1 : undefined}
              onClick={(): void => setFollowing(!following)}
            >
              <span className={styles.fOff}><IconUserPlus />팔로우</span>
              <span className={styles.fOn}><IconCheck />팔로잉</span>
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnGhost}`}
              aria-pressed={back}
              tabIndex={back ? -1 : undefined}
              onClick={(): void => setBack(true)}
            >
              <IconFlip />연락처 보기
            </button>
          </div>
        </div>
        <div className={`${styles.face} ${styles.faceBack}`} aria-hidden={back ? undefined : "true"}>
          <ul className={styles.list}>
            <li className={styles.row}>
              <span className={styles.ic}><IconMail /></span>
              <span className={styles.meta}><span className={styles.k}>이메일</span><span className={styles.v}>sea@studio.dev</span></span>
            </li>
            <li className={styles.row}>
              <span className={styles.ic}><IconPhone /></span>
              <span className={styles.meta}><span className={styles.k}>전화</span><span className={styles.v}>010-1234-5678</span></span>
            </li>
            <li className={styles.row}>
              <span className={styles.ic}><IconGlobe /></span>
              <span className={styles.meta}><span className={styles.k}>웹사이트</span><span className={styles.v}>seaoh.dev</span></span>
            </li>
          </ul>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost}`}
            aria-pressed={!back}
            tabIndex={back ? undefined : -1}
            onClick={(): void => setBack(false)}
          >
            <IconFlip />앞면 보기
          </button>
        </div>
      </div>
    </div>
  );
}
