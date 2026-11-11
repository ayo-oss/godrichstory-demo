import type { CSSProperties } from "react";
import styles from "./KineticFeatureList.module.scss";

export type KineticFeatureListProps = {
  features?: string[];
  /** 파도가 세 줄을 한 번 훑고 지나가는 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type CharVars = CSSProperties & {
  "--nx0"?: string; "--ny0"?: string; "--nr0"?: string;
  "--wx"?: string; "--wy"?: string; "--wr"?: string;
};

/** 정수 → 0..1 결정론 난수 (sin 해시 — vanilla 04 와 동일 계열) */
function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** 한 글자 = 출발점(노이즈) + 힘장 경유점 변수 묶음. vanilla index.html 스크립트와 같은 식. */
function charVars(r: number, c: number): CharVars {
  const s = r * 89 + c * 13 + 5;
  const h1 = hash(s), h2 = hash(s + 1), h3 = hash(s + 2), h4 = hash(s + 3);
  const ang = h1 * Math.PI * 2;
  const rad = 8 + h2 * 15;
  const x0 = Math.cos(ang) * rad, y0 = 10 + h3 * 10;
  const rot0 = (h4 - .5) * 26;
  // 회전 힘장 v(p) = ω × p 를 출발점에서 dt 적분 — v = ω*(-y, x), dt=0.55, ω=0.9
  const wx = x0 - 0.9 * y0 * 0.55, wy = y0 + 0.9 * x0 * 0.55;
  const wr = rot0 * 0.4;
  return {
    "--nx0": `${x0.toFixed(1)}px`,
    "--ny0": `${y0.toFixed(1)}px`,
    "--nr0": `${rot0.toFixed(1)}deg`,
    "--wx": `${(wx * .6).toFixed(1)}px`,
    "--wy": `${(wy * .18 + 2).toFixed(1)}px`,
    "--wr": `${wr.toFixed(1)}deg`,
    animationDelay: `${(-0.14 * r - 0.04 * c).toFixed(3)}s`,
  };
}

export default function KineticFeatureList({
  features = ["Real-time collaboration", "Auto-deploy", "Team dashboard"],
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: KineticFeatureListProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.stage} style={vars}>
      <ul className={styles.list}>
        {features.map((label, i) => {
          const delay = `${-i * 0.25}s`;
          return (
            <li key={label} className={styles.row} style={{ animationDelay: delay }}>
              <span className={styles.index}>{String(i + 1).padStart(2, "0")}</span>
              <span className={styles.label}>
                {label.split("").map((ch, c) =>
                  ch === " " ? (
                    <span key={c} className={styles.charSpace} />
                  ) : (
                    <span key={c} className={styles.char} style={charVars(i, c)}>{ch}</span>
                  )
                )}
                <span className={styles.underline} style={{ animationDelay: delay }} />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
