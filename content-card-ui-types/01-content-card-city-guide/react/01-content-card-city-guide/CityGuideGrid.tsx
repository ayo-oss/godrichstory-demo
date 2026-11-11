// CityGuideGrid — vanilla 판(run/081/demo/01-content-card-city-guide/index.html) 의 React 포트.
// grid-template-columns 로 세 칸을 먼저 정하고, 카드는 animation-delay 로 자기 순서에만 올라온다.
// 카드 전체가 아니라 링크가 목적지 이름을 말한다 (WCAG 2.4.4).
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CityGuideGrid.module.scss";

export type CityGuideGridProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

type City = { band: string; name: string; line: string; link: string; href: string; shot: string };

// 링크 글자는 조각으로 잇지 않는다 — 언어팩 사전의 키가 문장 전체여야 en·ja 판이 반쪽으로 안 나간다
const CITIES: City[] = [
  { band: "당일치기", name: "부산", line: "바다와 시장이 한 정류장", link: "부산 가이드 열기", href: "#busan", shot: "shot--a" },
  { band: "1박 2일", name: "전주", line: "골목마다 다른 밥집", link: "전주 가이드 열기", href: "#jeonju", shot: "shot--b" },
  { band: "주말 코스", name: "속초", line: "바다와 산을 한 번에", link: "속초 가이드 열기", href: "#sokcho", shot: "shot--c" },
];

function MapPin() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256">
      <g fill="currentColor">
        <path d="M128 24a80 80 0 0 0-80 80c0 72 80 128 80 128s80-56 80-128a80 80 0 0 0-80-80m0 112a32 32 0 1 1 32-32a32 32 0 0 1-32 32" opacity=".2" />
        <path d="M128 64a40 40 0 1 0 40 40a40 40 0 0 0-40-40m0 64a24 24 0 1 1 24-24a24 24 0 0 1-24 24m0-112a88.1 88.1 0 0 0-88 88c0 31.4 14.51 64.68 42 96.25a254.2 254.2 0 0 0 41.45 38.3a8 8 0 0 0 9.18 0a254.2 254.2 0 0 0 41.37-38.3c27.45-31.57 42-64.85 42-96.25a88.1 88.1 0 0 0-88-88m0 206c-16.53-13-72-60.75-72-118a72 72 0 0 1 144 0c0 57.23-55.47 105-72 118" />
      </g>
    </svg>
  );
}

export default function CityGuideGrid(props: CityGuideGridProps) {
  const duration = props.duration ?? 600;
  const easing = props.easing ?? "cubic-bezier(.2, .8, .2, 1)";
  const color = props.color ?? "#2f6df6";
  const [preview, setPreview] = useState<boolean>(true);

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };
  const stop = () => setPreview(false);

  return (
    <main className={styles.stage}>
      <ul
        className={styles.cg + (preview ? " " + styles.isDemo : "")}
        style={vars}
        onPointerDown={stop}
        onFocus={stop}
      >
        {CITIES.map((city) => (
          <li className={styles.card} key={city.name}>
            <div className={styles.shot + " " + styles[city.shot]}>
              <span className={styles.band}>
                <span className={styles.ic} aria-hidden="true"><MapPin /></span>
                {city.band}
              </span>
            </div>
            <h3 className={styles.name}>{city.name}</h3>
            <p className={styles.line}>{city.line}</p>
            <a className={styles.link} href={city.href}>{city.link}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
