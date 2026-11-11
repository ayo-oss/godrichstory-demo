// FontSpacingTuner — vanilla 판(run/074/demo/03-font-spacing-tuner/index.html) 의 React 포트.
// letter-spacing(em)·line-height(배수) 두 슬라이더가 본문 표본을 움직이고 값은 글 옆에 즉시 붙는다
// (vanilla 의 textContent 경로 대신 JSX 텍스트 노드로 — 계산식은 같은 글자).
// 미리보기 중에는 keyframes 가 인라인 스타일보다 우선한다(cascade 규칙) — 손이 닿으면 isDemo 를 뗀다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FontSpacingTuner.module.scss";

export type FontSpacingTunerProps = {
  duration?: number;
  easing?: string;
  color?: string;
  initialTrack?: number;
  initialLead?: number;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// 이벤트 핸들러 파라미터는 로컬 타입으로 — ambient 타입이 React 제네릭을 안 준다
type RangeEvt = { target: { value: string } };

const TITLE = "자간 · 행간";
const HINT = "em · 배수";
const TRACK_ARIA = "자간 슬라이더";
const LEAD_ARIA = "행간 슬라이더";
const BODY_TEXT =
  "사소한 자간 하나가 문단의 온도를 바꾼다. 행간이 한 걸음 벌어지면 문장은 숨을 쉰다. 두 조절기를 움직여 반응을 직접 확인해 보자.";

export default function FontSpacingTuner(props: FontSpacingTunerProps) {
  const duration = props.duration ?? 220;
  const easing = props.easing ?? "cubic-bezier(.2, .8, .2, 1)";
  const color = props.color ?? "#c93000";
  const [track, setTrack] = useState<number>(props.initialTrack ?? 0.02);
  const [lead, setLead] = useState<number>(props.initialLead ?? 1.7);
  const [preview, setPreview] = useState<boolean>(true);
  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };

  const trackFill = (((track + 0.04) / 0.34) * 100).toFixed(1) + "%";
  const leadFill = (((lead - 1) / 1) * 100).toFixed(1) + "%";

  return (
    <main className={styles.stage}>
      <section className={styles.root + (preview ? " " + styles.isDemo : "")} style={vars} aria-label="자간·행간 조절기">
        <header className={styles.bar}>
          <span className={styles.name}>{TITLE}</span>
          <span className={styles.hint}>{HINT}</span>
        </header>
        <div className={styles.ctrl}>
          <span className={styles.val}>{track.toFixed(2)}em</span>
          <input
            className={styles.range}
            type="range"
            min="-0.04"
            max="0.3"
            step="0.01"
            value={track}
            aria-label={TRACK_ARIA}
            style={{ "--fill": trackFill } as CSSProperties}
            onPointerDown={() => setPreview(false)}
            onInput={(e: RangeEvt) => {
              setPreview(false);
              setTrack(Number(e.target.value));
            }}
          />
        </div>
        <div className={styles.ctrl}>
          <span className={styles.val}>{lead.toFixed(2)}</span>
          <input
            className={styles.range}
            type="range"
            min="1"
            max="2"
            step="0.05"
            value={lead}
            aria-label={LEAD_ARIA}
            style={{ "--fill": leadFill } as CSSProperties}
            onPointerDown={() => setPreview(false)}
            onInput={(e: RangeEvt) => {
              setPreview(false);
              setLead(Number(e.target.value));
            }}
          />
        </div>
        <div className={styles.body}>
          <p className={styles.text} style={{ letterSpacing: track.toFixed(2) + "em", lineHeight: String(lead) }}>
            {BODY_TEXT}
          </p>
        </div>
      </section>
    </main>
  );
}
