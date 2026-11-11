// IntroGridSection — vanilla 판(run/081/demo/08-content-card-intro-grid/index.html) 의 React 포트.
// grid-template-areas 가 도면이고 grid-area 가 카드마다 붙는 칸 이름표다 — 좁은 화면에서는
// 도면만 다시 그린다. 큰 카드 제목이 먼저 뜨고 작은 카드 넷이 animation-delay 시차로 따라 올라온다.
// @keyframes 본문은 vanilla 와 같은 글자다 (값을 다시 타이핑하지 않는다).
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./IntroGridSection.module.scss";

export type IntroGridSectionProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

type Cell = { area: string; icon: string; name: string; note: string };

const CELLS: Cell[] = [
  { area: "a", icon: "sparkle", name: "빠른 시작", note: "설정 3분" },
  { area: "b", icon: "clock", name: "자동 백업", note: "매시 저장" },
  { area: "c", icon: "lock", name: "권한 관리", note: "역할별 접근" },
  { area: "d", icon: "share", name: "팀 공유", note: "링크 한 줄" },
];

function DuotoneIcon({ id }: { id: string }) {
  return (
    <svg className={styles[id]} aria-hidden="true">
      <use href={"#ig" + id} />
    </svg>
  );
}

export default function IntroGridSection({
  duration = 600,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: IntroGridSectionProps) {
  const [preview, setPreview] = useState(true);

  const vars: Vars = {
    "--duration": duration + "ms",
    "--easing": easing,
    "--color": color,
  };
  const stop = () => setPreview(false);

  return (
    <main className={styles.stage}>
      <svg className={styles.defs} aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <symbol id="igsparkle" viewBox="0 0 256 256"><g fill="currentColor"><path d="m194.82 151.43l-55.09 20.3l-20.3 55.09a7.92 7.92 0 0 1-14.86 0l-20.3-55.09l-55.09-20.3a7.92 7.92 0 0 1 0-14.86l55.09-20.3l20.3-55.09a7.92 7.92 0 0 1 14.86 0l20.3 55.09l55.09 20.3a7.92 7.92 0 0 1 0 14.86" opacity=".2"/><path d="M197.58 129.06L146 110l-19-51.62a15.92 15.92 0 0 0-29.88 0L78 110l-51.62 19a15.92 15.92 0 0 0 0 29.88L78 178l19 51.62a15.92 15.92 0 0 0 29.88 0L146 178l51.62-19a15.92 15.92 0 0 0 0-29.88ZM137 164.22a8 8 0 0 0-4.74 4.74L112 223.85L91.78 169a8 8 0 0 0-4.78-4.78L32.15 144L87 123.78a8 8 0 0 0 4.78-4.78L112 64.15L132.22 119a8 8 0 0 0 4.74 4.74L191.85 144ZM144 40a8 8 0 0 1 8-8h16V16a8 8 0 0 1 16 0v16h16a8 8 0 0 1 0 16h-16v16a8 8 0 0 1-16 0V48h-16a8 8 0 0 1-8-8m104 48a8 8 0 0 1-8 8h-8v8a8 8 0 0 1-16 0v-8h-8a8 8 0 0 1 0-16h8v-8a8 8 0 0 1 16 0v8h8a8 8 0 0 1 8 8"/></g></symbol>
        <symbol id="igclock" viewBox="0 0 256 256"><g fill="currentColor"><path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2"/><path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24m0 192a88 88 0 1 1 88-88a88.1 88.1 0 0 1-88 88m64-88a8 8 0 0 1-8 8h-56a8 8 0 0 1-8-8V72a8 8 0 0 1 16 0v48h48a8 8 0 0 1 8 8"/></g></symbol>
        <symbol id="iglock" viewBox="0 0 256 256"><g fill="currentColor"><path d="M208 88H48a8 8 0 0 0-8 8v112a8 8 0 0 0 8 8h160a8 8 0 0 0 8-8V96a8 8 0 0 0-8-8m-80 72a20 20 0 1 1 20-20a20 20 0 0 1-20 20" opacity=".2"/><path d="M208 80h-32V56a48 48 0 0 0-96 0v24H48a16 16 0 0 0-16 16v112a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V96a16 16 0 0 0-16-16M96 56a32 32 0 0 1 64 0v24H96Zm112 152H48V96h160zm-80-96a28 28 0 0 0-8 54.83V184a8 8 0 0 0 16 0v-17.17a28 28 0 0 0-8-54.83m0 40a12 12 0 1 1 12-12a12 12 0 0 1-12 12"/></g></symbol>
        <symbol id="igshare" viewBox="0 0 256 256"><g fill="currentColor"><path d="M208 200a32 32 0 1 1-32-32a32 32 0 0 1 32 32M176 88a32 32 0 1 0-32-32a32 32 0 0 0 32 32" opacity=".2"/><path d="M176 160a39.9 39.9 0 0 0-28.62 12.09l-46.1-29.63a39.8 39.8 0 0 0 0-28.92l46.1-29.63a40 40 0 1 0-8.66-13.45l-46.1 29.63a40 40 0 1 0 0 55.82l46.1 29.63A40 40 0 1 0 176 160m0-128a24 24 0 1 1-24 24a24 24 0 0 1 24-24M64 152a24 24 0 1 1 24-24a24 24 0 0 1-24 24m112 72a24 24 0 1 1 24-24a24 24 0 0 1-24 24"/></g></symbol>
      </svg>

      <section
        className={styles.ig + (preview ? " " + styles.isDemo : "")}
        style={vars}
        aria-label="서비스 소개"
        onPointerDown={stop}
        onFocus={stop}
      >
        <article className={styles.hero}>
          <span className={styles.tag}>새 버전</span>
          <div className={styles.line}>
            <h2 className={styles.title}>팀의 작업을 한 화면에</h2>
          </div>
          <p className={styles.lede}>흩어진 파일과 일정을 한 곳에서 봅니다.</p>
          <a className={styles.link} href="#tour">서비스 둘러보기</a>
        </article>

        {CELLS.map((cell) => (
          <article className={styles.cell + " " + styles["cell" + cell.area.toUpperCase()]} key={cell.area}>
            <DuotoneIcon id={cell.icon} />
            <h3 className={styles.name}>{cell.name}</h3>
            <p className={styles.note}>{cell.note}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
