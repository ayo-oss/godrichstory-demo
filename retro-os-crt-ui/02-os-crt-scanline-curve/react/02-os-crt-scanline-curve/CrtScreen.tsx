// CrtScreen — vanilla 판(run/023/demo/02-os-crt-scanline-curve/index.html) 의 React 포트.
// 가로 줄무늬를 타일 하나(4px)로 정의해 background-size 로 반복하고 radial-gradient 타원 비네트를
// 얹는다. 밝은 띠가 translateY 로 위에서 아래로 흐른다. 조작 상태가 없어 그림만 그린다.
import type { CSSProperties } from "react";
import styles from "./CrtScreen.module.scss";

export type CrtScreenProps = {
  duration?: number;
  easing?: string;
  color?: string;
  title?: string;
  subtitle?: string;
  caption?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CrtScreen(props: CrtScreenProps) {
  const vars: Vars = {
    "--duration": (props.duration ?? 2000) + "ms",
    "--easing": props.easing ?? "ease-out",
    "--color": props.color ?? "#fff7e6"
  };
  return (
    <main className={styles.stage}>
      <figure className={styles.crt} style={vars}>
        <div className={styles.bezel}>
          <div className={styles.screen}>
            <div className={styles.content}>
              <p className={styles.title}>{props.title ?? "레트로 OS"}</p>
              <p className={styles.sub}>{props.subtitle ?? "crt 모니터 효과 — css 만으로"}</p>
            </div>
            <span className={styles.band} aria-hidden="true" />
            <span className={styles.lines} aria-hidden="true" />
            <span className={styles.vig} aria-hidden="true" />
          </div>
        </div>
        <figcaption className={styles.cap}>
          {props.caption ?? "줄무늬 타일 하나와 타원 비네트로 브라운관을 흉내 냈습니다"}
        </figcaption>
      </figure>
    </main>
  );
}
