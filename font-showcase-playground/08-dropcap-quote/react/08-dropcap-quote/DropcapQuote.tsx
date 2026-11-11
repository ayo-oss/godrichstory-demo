// DropcapQuote — vanilla 판(run/074/demo/08-dropcap-quote/index.html) 의 React 포트.
// ::first-letter 를 float 으로 띄우고 initial-letter 를 아는 브라우저에서는 @supports 경로로 넘어간다.
// 줄수는 --cap-lines 하나로 양쪽 경로가 같이 받는다 — @property 등록 덕에 부드럽게 보간된다.
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./DropcapQuote.module.scss";

export type DropcapQuoteProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string; "--cap-lines"?: number };

const BADGE_FALLBACK = "float 경로";
const BADGE_INITIAL = "initial-letter 경로";
const SIZES = [2, 3, 4] as const;
const SHORT_LABEL = "짧은 인용";
const LONG_LABEL = "긴 인용";
const SHORT_TEXT = "좋은 타이포그래피는 눈에 띄지 않습니다.";
const LONG_TEXT = "활자는 잉크가 아니라 빛으로 만든다. 글자 사이의 여백이 읽는 속도를 정하고, 행이 만나는 간격이 페이지의 숨을 만든다. 그래서 첫 글자 하나를 키우는 일도 자로 잰 듯 정확해야 한다.";
const NOTE = "칩으로 줄수를 고르고 드롭캡 버튼으로 켜고 끕니다";
const CAP_LABEL = "드롭캡";
const SIZES_ARIA = "드롭캡 줄수";

export default function DropcapQuote(props: DropcapQuoteProps) {
  const duration = props.duration ?? 300;
  const easing = props.easing ?? "cubic-bezier(.2, .8, .2, 1)";
  const color = props.color ?? "#17141a";
  const [preview, setPreview] = useState<boolean>(true);
  const [cap, setCap] = useState<boolean>(true);
  const [lines, setLines] = useState<number>(3);
  const [badge, setBadge] = useState<string>(BADGE_FALLBACK);

  useEffect(() => {
    // initial-letter 를 아는 브라우저는 그 경로로 넘어간다 — 배지가 어느 쪽인지 알려 준다
    if (typeof CSS !== "undefined" && CSS.supports && CSS.supports("(initial-letter: 3)")) {
      setBadge(BADGE_INITIAL);
    }
  }, []);

  const vars: Vars = {
    "--duration": duration + "ms",
    "--easing": easing,
    "--color": color,
    "--cap-lines": lines,
  };

  return (
    <main className={styles.stage}>
      <div
        className={[styles.root, preview ? " " + styles.isDemo : "", cap ? " " + styles.isCap : ""].filter(Boolean).join("")}
        style={vars}
      >
        <div className={styles.bar}>
          <span className={styles.badge}>{badge}</span>
          <div className={styles.sizes} role="group" aria-label={SIZES_ARIA}>
            {SIZES.map((n) => (
              <button
                key={n}
                className={styles.size + (lines === n ? " " + styles.ison : "")}
                type="button"
                data-lines={n}
                aria-pressed={lines === n ? "true" : "false"}
                onClick={() => { setPreview(false); setLines(n); }}
              >
                {n + "줄"}
              </button>
            ))}
          </div>
          <button
            className={styles.capBtn}
            type="button"
            aria-pressed={cap ? "true" : "false"}
            onClick={() => { setPreview(false); setCap(!cap); }}
          >
            {CAP_LABEL}
          </button>
        </div>
        <div className={styles.board}>
          <article className={styles.card + " " + styles.cardShort}>
            <span className={styles.label}>{SHORT_LABEL}</span>
            <p className={styles.text}>{SHORT_TEXT}</p>
          </article>
          <article className={styles.card}>
            <span className={styles.label}>{LONG_LABEL}</span>
            <p className={styles.text}>{LONG_TEXT}</p>
          </article>
        </div>
        <p className={styles.note}>{NOTE}</p>
      </div>
    </main>
  );
}
