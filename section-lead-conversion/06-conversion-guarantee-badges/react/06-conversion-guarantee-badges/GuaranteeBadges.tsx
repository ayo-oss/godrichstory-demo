import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./GuaranteeBadges.module.scss";

export type GuaranteeBadgesProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string; "--i"?: string; "--r"?: string };

const shield: ReactNode = (
  <svg className={styles.ic} viewBox="0 0 256 256" width="20" height="20" aria-hidden="true">
    <g fill="currentColor">
      <path d="M216 56v56c0 96-88 120-88 120s-88-24-88-120V56a8 8 0 0 1 8-8h160a8 8 0 0 1 8 8" opacity=".2" />
      <path d="M208 40H48a16 16 0 0 0-16 16v56c0 52.72 25.52 84.67 46.93 102.19c23.06 18.86 46 25.26 47 25.53a8 8 0 0 0 4.2 0c1-.27 23.91-6.67 47-25.53C198.48 196.67 224 164.72 224 112V56a16 16 0 0 0-16-16m0 72c0 37.07-13.66 67.16-40.6 89.42a129.3 129.3 0 0 1-39.4 22.2a128.3 128.3 0 0 1-38.92-21.81C61.82 179.51 48 149.3 48 112V56h160ZM82.34 141.66a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 11.32l-56 56a8 8 0 0 1-11.32 0Z" />
    </g>
  </svg>
);

const lock: ReactNode = (
  <svg className={styles.ic} viewBox="0 0 256 256" width="20" height="20" aria-hidden="true">
    <g fill="currentColor">
      <path d="M208 88H48a8 8 0 0 0-8 8v112a8 8 0 0 0 8 8h160a8 8 0 0 0 8-8V96a8 8 0 0 0-8-8m-80 72a20 20 0 1 1 20-20a20 20 0 0 1-20 20" opacity=".2" />
      <path d="M208 80h-32V56a48 48 0 0 0-96 0v24H48a16 16 0 0 0-16 16v112a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V96a16 16 0 0 0-16-16M96 56a32 32 0 0 1 64 0v24H96Zm112 152H48V96h160zm-80-96a28 28 0 0 0-8 54.83V184a8 8 0 0 0 16 0v-17.17a28 28 0 0 0-8-54.83m0 40a12 12 0 1 1 12-12a12 12 0 0 1-12 12" />
    </g>
  </svg>
);

const drive: ReactNode = (
  <svg className={styles.ic} viewBox="0 0 256 256" width="20" height="20" aria-hidden="true">
    <g fill="currentColor">
      <path d="M232 80v96a8 8 0 0 1-8 8H32a8 8 0 0 1-8-8V80a8 8 0 0 1 8-8h192a8 8 0 0 1 8 8" opacity=".2" />
      <path d="M224 64H32a16 16 0 0 0-16 16v96a16 16 0 0 0 16 16h192a16 16 0 0 0 16-16V80a16 16 0 0 0-16-16m0 112H32V80h192zm-24-48a12 12 0 1 1-12-12a12 12 0 0 1 12 12" />
    </g>
  </svg>
);

const calendarX: ReactNode = (
  <svg className={styles.ic} viewBox="0 0 256 256" width="20" height="20" aria-hidden="true">
    <g fill="currentColor">
      <path d="M216 48v40H40V48a8 8 0 0 1 8-8h160a8 8 0 0 1 8 8" opacity=".2" />
      <path d="M208 32h-24v-8a8 8 0 0 0-16 0v8H88v-8a8 8 0 0 0-16 0v8H48a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16M72 48v8a8 8 0 0 0 16 0v-8h80v8a8 8 0 0 0 16 0v-8h24v32H48V48Zm136 160H48V96h160zm-50.34-74.34L139.31 152l18.35 18.34a8 8 0 0 1-11.32 11.32L128 163.31l-18.34 18.35a8 8 0 0 1-11.32-11.32L116.69 152l-18.35-18.34a8 8 0 0 1 11.32-11.32L128 140.69l18.34-18.35a8 8 0 0 1 11.32 11.32" />
    </g>
  </svg>
);

const BADGES = [
  { label: "14일 환불 보증", more: "이유를 묻지 않고 14일 안에 전액 돌려드립니다.", icon: shield, draw: true, r: "-6deg" },
  { label: "안전한 결제", more: "결제 정보는 우리 서버에 저장하지 않습니다.", icon: lock, draw: false, r: "6deg" },
  { label: "데이터 보호", more: "내 데이터는 언제든 내려받고 지울 수 있습니다.", icon: drive, draw: false, r: "-6deg" },
  { label: "언제든 해지", more: "해지 버튼 하나면 끝, 다음 달 청구는 없습니다.", icon: calendarX, draw: false, r: "6deg" },
];

export default function GuaranteeBadges({
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: GuaranteeBadgesProps) {
  const [openIdx, setOpenIdx] = useState(-1);
  // 측정용 루프: 처음 조작(pointerdown·keydown)에서 루프를 끈다 — vanilla 판과 같은 동작
  const [demo, setDemo] = useState(true);
  useEffect(() => {
    const off = () => setDemo(false);
    window.addEventListener("pointerdown", off, { once: true });
    window.addEventListener("keydown", off, { once: true });
    return () => {
      window.removeEventListener("pointerdown", off);
      window.removeEventListener("keydown", off);
    };
  }, []);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={`${styles.gb} ${demo ? styles.isDemo : ""}`} style={vars}>
      <p className={styles.title}>안심하고 시작하세요</p>
      <ul className={styles.grid}>
        {BADGES.map((b, i) => {
          const cellVars: Vars = { "--i": String(i), "--r": b.r };
          const open = openIdx === i;
          return (
            <li key={b.label} className={`${styles.cell} ${open ? styles.isOpen : ""}`} style={cellVars}>
              <button
                type="button"
                className={styles.badge}
                aria-expanded={open}
                aria-controls={`gb-m-${i}`}
                onClick={() => setOpenIdx(open ? -1 : i)}
              >
                <span className={styles.stamp}>
                  {b.icon}
                  {b.draw && (
                    <svg className={styles.draw} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                      <polyline points="6 12.6 10 16.6 18 8" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className={styles.label}>{b.label}</span>
              </button>
              <div className={styles.more} id={`gb-m-${i}`}>
                <div className={styles.moreIn}>
                  <p>{b.more}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
