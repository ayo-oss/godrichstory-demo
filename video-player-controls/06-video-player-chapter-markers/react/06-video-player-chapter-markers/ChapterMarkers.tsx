import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ChapterMarkers.module.scss";

export type Chapter = { at: number; name: string };

export type ChapterMarkersProps = {
  /** 더미 영상 길이(초) */
  total?: number;
  /** 시작 위치(초) */
  start?: number;
  /** 챕터 시작 시각과 이름 */
  chapters?: Chapter[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type NameVars = CSSProperties & { "--i"?: string };

// TS7006 방지 — 'react' 의 이벤트 제네릭 대신 필요한 필드만 로컬로 선언한다
type KeyEvt = { key: string; preventDefault: () => void };

function fmt(s: number) {
  const n = Math.floor(s);
  return Math.floor(n / 60) + ":" + ("0" + (n % 60)).slice(-2);
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export default function ChapterMarkers({
  total = 180,
  start = 8,
  chapters = [
    { at: 0, name: "인트로" },
    { at: 24, name: "설치" },
    { at: 72, name: "예제" },
    { at: 140, name: "정리" },
  ],
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: ChapterMarkersProps) {
  const [t, setT] = useState(start);
  const skRef = useRef<HTMLDivElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 더미 재생 시계 — 바닐라의 rAF(실시간 1배) 를 setInterval(250ms, +0.25초) 로
  useEffect(() => {
    const id = setInterval(() => setT((p) => (p + 0.25) % total), 250);
    return () => clearInterval(id);
  }, [total]);

  // 구간은 % 로 자리를 잡는다 — s(시작) · e(끝) · k = 1/(e−s) 로 구간 안 진행률을 낸다
  const segs = chapters.map((c, i) => {
    const s = c.at / total;
    const e = (i + 1 < chapters.length ? chapters[i + 1].at : total) / total;
    return { at: c.at, name: c.name, s, e, k: 1 / (e - s) };
  });

  let i = 0;
  for (let k = 0; k < chapters.length; k++) if (t >= chapters[k].at) i = k;
  const p = t / total;
  const nameVars: NameVars = { "--i": String(i) };

  return (
    <figure className={styles.player} style={vars}>
      <div className={styles.screen}>
        <div className={styles.stripes} aria-hidden="true" />
        <div className={styles.world} aria-hidden="true">
          <span className={styles.sun} />
          <span className={`${styles.hill} ${styles.hillA}`} />
          <span className={`${styles.hill} ${styles.hillB}`} />
        </div>
        <span className={styles.clock}>{fmt(t)}</span>
        <span className={styles.badge}>{fmt(total)}</span>
        <div className={styles.nm}>
          <div className={styles.nmList} style={nameVars}>
            {chapters.map((c, k) => (
              <b key={c.at} className={styles.nmItem}>
                {k + 1} · {c.name}
              </b>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.row}>
        <span className={styles.rowTime}>
          <b>{fmt(t)}</b> / {fmt(total)}
        </span>
        <div
          ref={skRef}
          className={styles.sk}
          role="slider"
          tabIndex={0}
          aria-label="재생 위치"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={Math.floor(t)}
          aria-valuetext={`${chapters[i].name} 챕터, ${fmt(t)}`}
          onKeyDown={(e: KeyEvt) => {
            if (e.key === "ArrowRight") { setT((v) => Math.min(total - 1, v + 5)); e.preventDefault(); }
            else if (e.key === "ArrowLeft") { setT((v) => Math.max(0, v - 5)); e.preventDefault(); }
            else if (e.key === "Home") { setT(0); e.preventDefault(); }
            else if (e.key === "End") { setT(total - 1); e.preventDefault(); }
          }}
        >
          <div className={styles.ch}>
            {segs.map((g, k) => (
              <span
                key={g.at}
                className={`${styles.seg} ${k === segs.length - 1 ? styles.segEnd : ""}`}
                style={{ left: `${(g.s * 100).toFixed(4)}%`, right: `${(100 - g.e * 100).toFixed(4)}%` }}
                onClick={() => {
                  setT(g.at);
                  skRef.current?.focus({ preventScroll: true });
                }}
              >
                <i
                  className={styles.segFill}
                  style={{ transform: `scaleX(${clamp01((p - g.s) * g.k).toFixed(4)})` }}
                />
              </span>
            ))}
            <span className={styles.head} style={{ left: `${(p * 100).toFixed(4)}%` }} aria-hidden="true">
              <i className={styles.dot} />
            </span>
          </div>
        </div>
      </div>
    </figure>
  );
}
