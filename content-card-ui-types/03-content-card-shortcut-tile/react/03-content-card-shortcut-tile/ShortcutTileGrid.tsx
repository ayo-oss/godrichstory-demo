// ShortcutTileGrid — vanilla 판(run/081/demo/03-content-card-shortcut-tile/index.html) 의 React 포트.
// 폭이 얼마든 aspect-ratio 로 정사각을 지키고, 화살표만 독립 속성 translate 로 모서리 쪽으로 밀려 나간다.
// 타일 전체가 링크가 아니라 라벨이 링크다 — 링크 글자만 읽어도 어디로 가는지 안다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ShortcutTileGrid.module.scss";

export type ShortcutTileGridProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

type Tile = { label: string; href: string; mark: string };

const TILES: Tile[] = [
  { label: "주문 내역", href: "#orders", mark: "receipt" },
  { label: "배송 조회", href: "#delivery", mark: "truck" },
  { label: "문의하기", href: "#support", mark: "chat" },
  { label: "도움말", href: "#help", mark: "help" },
];

function TileMark(props: { mark: string }) {
  if (props.mark === "receipt") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256">
        <g fill="currentColor">
          <path d="M224 56v152l-32-16l-32 16l-32-16l-32 16l-32-16l-32 16V56a8 8 0 0 1 8-8h176a8 8 0 0 1 8 8" opacity=".2" />
          <path d="M72 104a8 8 0 0 1 8-8h96a8 8 0 0 1 0 16H80a8 8 0 0 1-8-8m8 40h96a8 8 0 0 0 0-16H80a8 8 0 0 0 0 16m152-88v152a8 8 0 0 1-11.58 7.15L192 200.94l-28.42 14.21a8 8 0 0 1-7.16 0L128 200.94l-28.42 14.21a8 8 0 0 1-7.16 0L64 200.94l-28.42 14.21A8 8 0 0 1 24 208V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16m-16 0H40v139.06l20.42-10.22a8 8 0 0 1 7.16 0L96 199.06l28.42-14.22a8 8 0 0 1 7.16 0L160 199.06l28.42-14.22a8 8 0 0 1 7.16 0L216 195.06Z" />
        </g>
      </svg>
    );
  }
  if (props.mark === "truck") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256">
        <g fill="currentColor">
          <path d="M248 120v64a8 8 0 0 1-8 8h-24a24 24 0 0 0-48 0h-64a24 24 0 0 0-48 0H32a8 8 0 0 1-8-8v-40h160v-24Z" opacity=".2" />
          <path d="m255.42 117l-14-35a15.93 15.93 0 0 0-14.84-10H192v-8a8 8 0 0 0-8-8H32a16 16 0 0 0-16 16v112a16 16 0 0 0 16 16h17a32 32 0 0 0 62 0h50a32 32 0 0 0 62 0h17a16 16 0 0 0 16-16v-64a7.9 7.9 0 0 0-.58-3M192 88h34.58l9.6 24H192ZM32 72h144v64H32Zm48 136a16 16 0 1 1 16-16a16 16 0 0 1-16 16m81-24h-50a32 32 0 0 0-62 0H32v-32h144v12.31A32.1 32.1 0 0 0 161 184m31 24a16 16 0 1 1 16-16a16 16 0 0 1-16 16m48-24h-17a32.06 32.06 0 0 0-31-24v-32h48Z" />
        </g>
      </svg>
    );
  }
  if (props.mark === "chat") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256">
        <g fill="currentColor">
          <path d="M224 128a96 96 0 0 1-144.07 83.11l-37.39 12.47a8 8 0 0 1-10.12-10.12l12.47-37.39A96 96 0 1 1 224 128" opacity=".2" />
          <path d="M128 24a104 104 0 0 0-91.82 152.88l-11.35 34.05a16 16 0 0 0 20.24 20.24l34.05-11.35A104 104 0 1 0 128 24m0 192a87.87 87.87 0 0 1-44.06-11.81a8 8 0 0 0-4-1.08a7.9 7.9 0 0 0-2.53.42L40 216l12.47-37.4a8 8 0 0 0-.66-6.54A88 88 0 1 1 128 216m12-88a12 12 0 1 1-12-12a12 12 0 0 1 12 12m-44 0a12 12 0 1 1-12-12a12 12 0 0 1 12 12m88 0a12 12 0 1 1-12-12a12 12 0 0 1 12 12" />
        </g>
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256">
      <g fill="currentColor">
        <path d="m195.88 195.88l-39.6-39.6a40 40 0 0 0 0-56.56l39.6-39.6a96 96 0 0 1 0 135.76M60.12 60.12a96 96 0 0 0 0 135.76l39.6-39.6a40 40 0 0 1 0-56.56Z" opacity=".2" />
        <path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24m39.1 131.79a47.84 47.84 0 0 0 0-55.58l28.5-28.49a87.83 87.83 0 0 1 0 112.56ZM96 128a32 32 0 1 1 32 32a32 32 0 0 1-32-32m88.28-67.6l-28.49 28.5a47.84 47.84 0 0 0-55.58 0L71.72 60.4a87.83 87.83 0 0 1 112.56 0M60.4 71.72l28.5 28.49a47.84 47.84 0 0 0 0 55.58l-28.5 28.49a87.83 87.83 0 0 1 0-112.56M71.72 195.6l28.49-28.5a47.84 47.84 0 0 0 55.58 0l28.49 28.5a87.83 87.83 0 0 1-112.56 0" />
      </g>
    </svg>
  );
}

function ArrowMark() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256">
      <g fill="currentColor">
        <path d="M192 64v104L88 64Z" opacity=".2" />
        <path d="M192 56H88a8 8 0 0 0-5.66 13.66L128.69 116l-70.35 70.34a8 8 0 0 0 11.32 11.32L140 127.31l46.34 46.35A8 8 0 0 0 200 168V64a8 8 0 0 0-8-8m-8 92.69l-38.34-38.34L107.31 72H184Z" />
      </g>
    </svg>
  );
}

export default function ShortcutTileGrid(props: ShortcutTileGridProps) {
  const duration = props.duration ?? 220;
  const easing = props.easing ?? "cubic-bezier(.2, .8, .2, 1)";
  const color = props.color ?? "#2f6df6";
  const [preview, setPreview] = useState<boolean>(true);

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };
  const stop = () => setPreview(false);

  return (
    <main className={styles.stage}>
      <ul
        className={styles.st + (preview ? " " + styles.isDemo : "")}
        style={vars}
        onPointerDown={stop}
        onPointerOver={stop}
        onFocus={stop}
      >
        {TILES.map((tile) => (
          <li className={styles.tile} key={tile.href}>
            <span className={styles.ic} aria-hidden="true"><TileMark mark={tile.mark} /></span>
            <span className={styles.go} aria-hidden="true"><ArrowMark /></span>
            <a className={styles.link} href={tile.href}>{tile.label}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
