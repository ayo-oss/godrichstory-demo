import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./WeatherIconAnimations.module.scss";

// vanilla 판(run/281/demo/02-weather-icon-animations/index.html) 의 React 포트.
// 아이콘 여섯 개가 각자의 주기로 움직인다 — 누르면 그 타일만 key 를 바꿔 처음부터 다시 재생된다.

export type WiTile = {
  id: string;
  /** 타일 아래 붙는 낱말 — 언어팩이 통째로 바꾼다 */
  name: string;
};

export type WeatherIconAnimationsProps = {
  tiles?: WiTile[];
  groupLabel?: string;
  /** 자동 재생 표시(이 데모의 움직임은 루프가 아니라 상시 재생이라 화면 변화는 없다) */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const DEFAULT_TILES: WiTile[] = [
  { id: "sun", name: "맑음" },
  { id: "cloud", name: "구름" },
  { id: "rain", name: "비" },
  { id: "snow", name: "눈" },
  { id: "storm", name: "번개" },
  { id: "wind", name: "바람" },
];

function SunIcon() {
  return (
    <svg viewBox="0 0 256 256" width="34" height="34" fill="currentColor" aria-hidden="true"><path d="M184,128a56,56,0,1,1-56-56A56,56,0,0,1,184,128Z" opacity="0.2"/><path d="M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z"/></svg>
  );
}
function CloudIcon({ size = 34 }: { size?: number }) {
  return (
    <svg viewBox="0 0 256 256" width={size} height={size} fill="currentColor" aria-hidden="true"><path d="M240,128a80,80,0,0,1-80,80H72A56,56,0,1,1,85.92,97.74l0,.1A80,80,0,0,1,240,128Z" opacity="0.2"/><path d="M160,40A88.09,88.09,0,0,0,81.29,88.67,64,64,0,1,0,72,216h88a88,88,0,0,0,0-176Zm0,160H72a48,48,0,0,1,0-96c1.1,0,2.2,0,3.29.11A88,88,0,0,0,72,128a8,8,0,0,0,16,0,72,72,0,1,1,72,72Z"/></svg>
  );
}
function DropIcon() {
  return (
    <svg viewBox="0 0 256 256" width="9" height="9" fill="currentColor" aria-hidden="true"><path d="M208,144a80,80,0,0,1-160,0c0-72,80-128,80-128S208,72,208,144Z" opacity="0.2"/><path d="M174,47.75a254.19,254.19,0,0,0-41.45-38.3,8,8,0,0,0-9.18,0A254.19,254.19,0,0,0,82,47.75C54.51,79.32,40,112.6,40,144a88,88,0,0,0,176,0C216,112.6,201.49,79.32,174,47.75ZM128,216a72.08,72.08,0,0,1-72-72c0-57.23,55.47-105,72-118,16.53,13,72,60.75,72,118A72.08,72.08,0,0,1,128,216Zm55.89-62.66a57.6,57.6,0,0,1-46.56,46.55A8.75,8.75,0,0,1,136,200a8,8,0,0,1-1.32-15.89c16.57-2.79,30.63-16.85,33.44-33.45a8,8,0,0,1,15.78,2.68Z"/></svg>
  );
}
function FlakeIcon() {
  return (
    <svg viewBox="0 0 256 256" width="10" height="10" fill="currentColor" aria-hidden="true"><path d="M220,128a92,92,0,1,1-92-92A92.1,92.1,0,0,1,220,128Z" opacity="0.2"/><path d="M223.77,150.09a8,8,0,0,1-5.86,9.68l-24.64,6,6.46,24.11a8,8,0,0,1-5.66,9.8A8.25,8.25,0,0,1,192,200a8,8,0,0,1-7.72-5.93l-7.72-28.8L136,141.86v46.83l21.66,21.65a8,8,0,0,1-11.32,11.32L128,203.31l-18.34,18.35a8,8,0,0,1-11.32-11.32L120,188.69V141.86L79.45,165.27l-7.72,28.8A8,8,0,0,1,64,200a8.25,8.25,0,0,1-2.08-.27,8,8,0,0,1-5.66-9.8l6.46-24.11-24.64-6a8,8,0,0,1,3.82-15.54l29.45,7.23L112,128,71.36,104.54l-29.45,7.23A7.85,7.85,0,0,1,40,112a8,8,0,0,1-1.91-15.77l24.64-6L56.27,66.07a8,8,0,0,1,15.46-4.14l7.72,28.8L120,114.14V67.31L98.34,45.66a8,8,0,0,1,11.32-11.32L128,52.69l18.34-18.35a8,8,0,0,1,11.32,11.32L136,67.31v46.83l40.55-23.41,7.72-28.8a8,8,0,0,1,15.46,4.14l-6.46,24.11,24.64,6A8,8,0,0,1,216,112a7.85,7.85,0,0,1-1.91-.23l-29.45-7.23L144,128l40.64,23.46,29.45-7.23A8,8,0,0,1,223.77,150.09Z"/></svg>
  );
}
function BoltIcon() {
  return (
    <svg viewBox="0 0 256 256" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M96,240l16-80L48,136,160,16,144,96l64,24Z" opacity="0.2"/><path d="M215.79,118.17a8,8,0,0,0-5-5.66L153.18,90.9l14.66-73.33a8,8,0,0,0-13.69-7l-112,120a8,8,0,0,0,3,13l57.63,21.61L88.16,238.43a8,8,0,0,0,13.69,7l112-120A8,8,0,0,0,215.79,118.17ZM109.37,214l10.47-52.38a8,8,0,0,0-5-9.06L62,132.71l84.62-90.66L136.16,94.43a8,8,0,0,0,5,9.06l52.8,19.8Z"/></svg>
  );
}
function WindIcon() {
  return (
    <svg viewBox="0 0 256 256" width="34" height="34" fill="currentColor" aria-hidden="true"><path d="M120,96a24,24,0,1,1,24-24A24,24,0,0,1,120,96Zm88-16a24,24,0,1,0,24,24A24,24,0,0,0,208,80Zm-56,80a24,24,0,1,0,24,24A24,24,0,0,0,152,160Z" opacity="0.2"/><path d="M184,184a32,32,0,0,1-32,32c-13.7,0-26.95-8.93-31.5-21.22a8,8,0,0,1,15-5.56C137.74,195.27,145,200,152,200a16,16,0,0,0,0-32H40a8,8,0,0,1,0-16H152A32,32,0,0,1,184,184Zm-64-80a32,32,0,0,0,0-64c-13.7,0-26.95,8.93-31.5,21.22a8,8,0,0,0,15,5.56C105.74,60.73,113,56,120,56a16,16,0,0,1,0,32H24a8,8,0,0,0,0,16Zm88-32c-13.7,0-26.95,8.93-31.5,21.22a8,8,0,0,0,15,5.56C193.74,92.73,201,88,208,88a16,16,0,0,1,0,32H32a8,8,0,0,0,0,16H208a32,32,0,0,0,0-64Z"/></svg>
  );
}

// 타일 한 개의 그림 — 아이디마다 장면이 다르다
function TileArt({ id }: { id: string }) {
  if (id === "sun") return <span className={`${styles.fx} ${styles.sun}`}><SunIcon /></span>;
  if (id === "cloud") return <span className={`${styles.fx} ${styles.drift}`}><CloudIcon /></span>;
  if (id === "rain") {
    return (
      <span className={styles.scene}>
        <span className={`${styles.fx} ${styles.drift} ${styles.cloudS}`}><CloudIcon size={28} /></span>
        <span className={`${styles.fx} ${styles.drop} ${styles["drop--1"]}`}><DropIcon /></span>
        <span className={`${styles.fx} ${styles.drop} ${styles["drop--2"]}`}><DropIcon /></span>
        <span className={`${styles.fx} ${styles.drop} ${styles["drop--3"]}`}><DropIcon /></span>
      </span>
    );
  }
  if (id === "snow") {
    return (
      <span className={styles.scene}>
        <span className={`${styles.fx} ${styles.drift} ${styles.cloudS}`}><CloudIcon size={28} /></span>
        <span className={`${styles.fx} ${styles.flake} ${styles["flake--1"]}`}><FlakeIcon /></span>
        <span className={`${styles.fx} ${styles.flake} ${styles["flake--2"]}`}><FlakeIcon /></span>
      </span>
    );
  }
  if (id === "storm") {
    return (
      <span className={styles.scene}>
        <span className={`${styles.fx} ${styles.drift} ${styles.cloudS}`}><CloudIcon size={28} /></span>
        <span className={`${styles.fx} ${styles.bolt}`}><BoltIcon /></span>
      </span>
    );
  }
  return <span className={`${styles.fx} ${styles.windfx}`}><WindIcon /></span>;
}

export default function WeatherIconAnimations({
  tiles = DEFAULT_TILES,
  groupLabel = "움직이는 날씨 아이콘",
  demo = true,
  duration = 2000,
  easing = "ease-out",
  color = "#2f6df6",
}: WeatherIconAnimationsProps) {
  const [live, setLive] = useState(demo);
  // 타일마다 재생 회수 — 누르면 그 타일의 key 가 바뀌어 애니메이션이 처음부터 다시 돈다
  const [gens, setGens] = useState<number[]>(tiles.map(() => 0));

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function replay(index: number): void {
    setLive(false);
    setGens((prev: number[]) => prev.map((g: number, k: number) => (k === index ? g + 1 : g)));
  }

  const cls = [styles.wi, live ? styles.isDemo : ""].filter(Boolean).join(" ");

  return (
    <main className={styles.stage}>
      <section className={cls} style={vars} aria-label={groupLabel}>
        {tiles.map((tile: WiTile, i: number) => (
          <button
            key={`${tile.id}-${gens[i]}`}
            className={styles.tile}
            type="button"
            aria-label={`${tile.name} 아이콘 다시 재생`}
            onClick={() => replay(i)}
          >
            <TileArt id={tile.id} />
            <span className={styles.name}>{tile.name}</span>
          </button>
        ))}
      </section>
    </main>
  );
}
