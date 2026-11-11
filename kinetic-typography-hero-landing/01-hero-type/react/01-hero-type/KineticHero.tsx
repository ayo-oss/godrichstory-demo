import type { CSSProperties } from "react";
import styles from "./KineticHero.module.scss";

export type KineticHeroProps = {
  eyebrow?: string;
  word1?: string;
  word2?: string;
  word3?: string;
  cta?: string;
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

type CharVars = CSSProperties & {
  "--nx0"?: string; "--ny0"?: string; "--nr0"?: string;
  "--wx"?: string; "--wy"?: string; "--wr"?: string;
};

/** 정수 → 0..1 결정론 난수 (sin 해시 — vanilla 01 과 동일 계열) */
function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** 한 글자 = 출발점(노이즈) + 힘장 경유점 변수 묶음. vanilla index.html 스크립트와 같은 식. */
function charVars(w: number, c: number): CharVars {
  const s = w * 97 + c * 13 + 5;
  const h1 = hash(s), h2 = hash(s + 1), h3 = hash(s + 2), h4 = hash(s + 3);
  const ang = h1 * Math.PI * 2;                       // 흩뿌리는 방향
  const rad = 26 + h2 * 46;                            // 흩뿌리는 반경(px)
  const x0 = Math.cos(ang) * rad, y0 = 40 + h3 * 34;   // 출발 오프셋
  const rot0 = (h4 - .5) * 44;                         // 출발 기울기(deg)
  // 회전 힘장 v(p) = ω × p 를 출발점에서 dt 적분 — v = ω*(-y, x), dt=0.55, ω=0.9
  const wx = x0 - 0.9 * y0 * 0.55, wy = y0 + 0.9 * x0 * 0.55;
  const wr = rot0 * 0.4;
  return {
    "--nx0": `${x0.toFixed(1)}px`,
    "--ny0": `${y0.toFixed(1)}px`,
    "--nr0": `${rot0.toFixed(1)}deg`,
    "--wx": `${(wx * .8).toFixed(1)}px`,
    "--wy": `${(wy * .18 + 8).toFixed(1)}px`,
    "--wr": `${wr.toFixed(1)}deg`,
    animationDelay: `${(-w * 0.18 - c * 0.045).toFixed(3)}s`,
  };
}

export default function KineticHero({
  eyebrow = "KINETIC",
  word1 = "Build",
  word2 = "at the",
  word3 = "speed of thought",
  cta = "Get started",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: KineticHeroProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const words = [word1, word2, word3];

  return (
    <div className={styles.stage} style={vars}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h1 className={styles.headline}>
        {words.map((w, i) => (
          <span key={i} className={styles.word}>
            <span className={styles.wordInner}>
              {w.split("").map((ch, c) =>
                ch === " " ? (
                  <span key={c} className={styles.charSpace} />
                ) : (
                  <span key={c} className={styles.char} style={charVars(i, c)}>{ch}</span>
                )
              )}
            </span>
          </span>
        ))}
      </h1>
      <button type="button" className={styles.cta}>{cta}</button>
    </div>
  );
}
