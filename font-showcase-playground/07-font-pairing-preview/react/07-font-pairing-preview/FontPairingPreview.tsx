// FontPairingPreview — vanilla 판(run/074/demo/07-font-pairing-preview/index.html) 의 React 포트.
// 두 칩줄(제목·본문)이 각자 font-family 를 고르고 기울임·자간·행간 손잡이가 한 패널에 붙는다.
// 칩의 컴퓨티드 font-family 를 견본에 옮기는 방식도 vanilla 와 같다 — 서체 스택을 두 번 쓰지 않는다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FontPairingPreview.module.scss";

export type FontPairingPreviewProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type ClickEvt = { currentTarget: HTMLButtonElement };

const FAMILIES = ["sans", "serif", "mono", "wide"] as const;
type Family = (typeof FAMILIES)[number];
const FAMILY_LABEL: Record<Family, string> = { sans: "산세리프", serif: "세리프", mono: "모노", wide: "넓은산스" };
const ROW_LABEL: Record<"head" | "body", string> = { head: "제목", body: "본문" };

const HEAD_SAMPLE = "봄바람 소식";
const BODY_SAMPLE = "제목과 본문이 한 목소리를 내면 페이지가 조용해집니다.";
const BODY_SAMPLE2 = "쌍이 어울리는지는 세 줄만 읽어 보면 압니다.";
const NOTE = "두 칩줄에서 각자 골라 조합을 바로 겁니다";
const ITALIC_LABEL = "기울임";
const TRACKING_LABEL = "자간";
const LEADING_LABEL = "행간";
const HEAD_ARIA = "제목 서체 고르기";
const BODY_ARIA = "본문 서체 고르기";
const TRACKING_ARIA = "제목 자간";
const LEADING_ARIA = "본문 행간";
const SPEC = "Aa";

export default function FontPairingPreview(props: FontPairingPreviewProps) {
  const duration = props.duration ?? 220;
  const easing = props.easing ?? "cubic-bezier(.2, .8, .2, 1)";
  const color = props.color ?? "#17141a";
  const [preview, setPreview] = useState<boolean>(true);
  const [headFamily, setHeadFamily] = useState<Family>("sans");
  const [bodyFamily, setBodyFamily] = useState<Family>("sans");
  const [italic, setItalic] = useState<boolean>(false);
  const [tracking, setTracking] = useState<number>(0);
  const [leading, setLeading] = useState<number>(1.5);

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };

  const chip = (row: "head" | "body", f: Family) => {
    const on = (row === "head" ? headFamily : bodyFamily) === f;
    const cls = [
      styles.chip,
      styles["chip--" + f],
      on ? styles.ison : "",
      preview ? "" : "",
    ].filter(Boolean).join(" ");
    return (
      <button
        key={row + f}
        className={cls}
        type="button"
        data-row={row}
        aria-pressed={on ? "true" : "false"}
        onClick={(e: ClickEvt) => {
          setPreview(false);
          if (row === "head") setHeadFamily(f);
          else setBodyFamily(f);
        }}
      >
        <span className={styles.spec} aria-hidden="true">{SPEC}</span>
        {FAMILY_LABEL[f]}
      </button>
    );
  };

  return (
    <main className={styles.stage}>
      <div className={styles.root + (preview ? " " + styles.isDemo : "")} style={vars}>
        <div className={styles.row}>
          <span className={styles.glabel}>{ROW_LABEL.head}</span>
          <div className={styles.chips} role="group" aria-label={HEAD_ARIA}>
            {FAMILIES.map((f) => chip("head", f))}
          </div>
        </div>
        <div className={styles.row}>
          <span className={styles.glabel}>{ROW_LABEL.body}</span>
          <div className={styles.chips} role="group" aria-label={BODY_ARIA}>
            {FAMILIES.map((f) => chip("body", f))}
          </div>
        </div>
        <div className={styles.knobs}>
          <button
            className={styles.ital + (italic ? " " + styles.ison : "")}
            type="button"
            aria-pressed={italic ? "true" : "false"}
            onClick={() => { setPreview(false); setItalic(!italic); }}
          >
            {ITALIC_LABEL}
          </button>
          <label className={styles.knob}>
            {TRACKING_LABEL}
            <input
              className={styles.range}
              type="range" min="-0.02" max="0.12" step="0.01" value={tracking}
              aria-label={TRACKING_ARIA}
              onChange={(e: { target: { value: string } }) => { setPreview(false); setTracking(Number(e.target.value)); }}
            />
            <output className={styles.kval}>{tracking.toFixed(2) + "em"}</output>
          </label>
          <label className={styles.knob}>
            {LEADING_LABEL}
            <input
              className={styles.range}
              type="range" min="1.2" max="2" step="0.1" value={leading}
              aria-label={LEADING_ARIA}
              onChange={(e: { target: { value: string } }) => { setPreview(false); setLeading(Number(e.target.value)); }}
            />
            <output className={styles.kval}>{String(leading)}</output>
          </label>
        </div>
        <div className={styles.sample}>
          <h2
            className={styles.head + " " + styles["f-" + headFamily]}
            style={{ fontStyle: italic ? "italic" : "normal", letterSpacing: tracking + "em" }}
          >
            {HEAD_SAMPLE}
          </h2>
          <p className={styles.body + " " + styles["f-" + bodyFamily]} style={{ lineHeight: String(leading) }}>
            <span className={styles.b1}>{BODY_SAMPLE}</span>
            <br />
            <span className={styles.b2}>{BODY_SAMPLE2}</span>
          </p>
        </div>
        <p className={styles.note}>{NOTE}</p>
      </div>
    </main>
  );
}
