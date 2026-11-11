// GlassEffectGenerator — vanilla 판(run/080/demo/05-glass-effect-generator/index.html) 의 React 포트.
// 값 네 개(흐림·투명도·채도·테두리)가 한 상태 객체에 있고, 미리보기 스타일과 코드 세 줄은
// 그 상태에서 **같은 함수로** 파생된다. 두 곳을 따로 만들면 언젠가 서로 다른 값을 말한다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GlassEffectGenerator.module.scss";

export type GlassEffectGeneratorProps = {
  duration?: number;
  easing?: string;
  accentColor?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type RangeEvt = { target: { value: string } };
type TimerBox = { current: number };
type Knobs = { blur: number; opacity: number; saturate: number; border: number };

const COPIED = "복사했어요";
const COPY_LABEL = "코드 복사";
const NAMES = { blur: "흐림", opacity: "투명도", saturate: "채도", border: "테두리" };

function alphaText(opacity: number): string {
  return String(Math.round(opacity) / 100).replace("0.", ".");
}
function codeLines(k: Knobs): string[] {
  return [
    `backdrop-filter: blur(${k.blur}px) saturate(${k.saturate}%);`,
    `background: hsl(0 0% 100% / ${alphaText(k.opacity)});`,
    `border: ${k.border}px solid hsl(0 0% 100% / .5);`,
  ];
}

export default function GlassEffectGenerator({
  duration = 2000,
  easing = "ease-out",
  accentColor = "#5b8cf8",
}: GlassEffectGeneratorProps) {
  const [knobs, setKnobs] = useState<Knobs>({ blur: 12, opacity: 18, saturate: 160, border: 1 });
  const [demo, setDemo] = useState(true);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(0) as TimerBox;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": accentColor };
  const lines = codeLines(knobs);
  const glass: CSSProperties = {
    backdropFilter: `blur(${knobs.blur}px) saturate(${knobs.saturate}%)`,
    WebkitBackdropFilter: `blur(${knobs.blur}px) saturate(${knobs.saturate}%)`,
    backgroundColor: `hsl(0 0% 100% / ${alphaText(knobs.opacity)})`,
    borderWidth: `${knobs.border}px`,
  };

  useEffect(() => {
    return () => { window.clearTimeout(timerRef.current); };
  }, []);

  function onKnob(key: keyof Knobs) {
    return (e: RangeEvt) => {
      const v = Number(e.target.value);
      setDemo(false);
      setKnobs((prev) => ({ ...prev, [key]: v }));
    };
  }
  function onCopy() {
    setDemo(false);
    const text = lines.join("\n");
    const done = () => {
      setCopied(true);
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopied(false), 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, done);
    } else { done(); }
  }

  const rows: { key: keyof Knobs; min: number; max: number; step: number; unit: string; ghost: string }[] = [
    { key: "blur", min: 0, max: 24, step: 1, unit: "px", ghost: styles.ghostA },
    { key: "opacity", min: 4, max: 48, step: 1, unit: "%", ghost: styles.ghostB },
    { key: "saturate", min: 100, max: 260, step: 10, unit: "%", ghost: styles.ghostC },
    { key: "border", min: 0, max: 4, step: 1, unit: "px", ghost: styles.ghostD },
  ];
  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");

  return (
    <main className={styles.stage}>
      <section className={cls} style={vars}>
        <div className={styles.scene}>
          <span className={`${styles.blob} ${styles.blobA}`} aria-hidden="true" />
          <span className={`${styles.blob} ${styles.blobB}`} aria-hidden="true" />
          <span className={`${styles.blob} ${styles.blobC}`} aria-hidden="true" />
          <div className={styles.glass} style={glass} aria-hidden="true" />
        </div>
        <div className={styles.panel}>
          {rows.map((r) => (
            <label className={styles.row} key={r.key}>
              <span className={styles.name}>{NAMES[r.key]}</span>
              <span className={styles.track}>
                <input
                  className={styles.range}
                  type="range"
                  min={r.min}
                  max={r.max}
                  step={r.step}
                  value={knobs[r.key]}
                  aria-label={NAMES[r.key]}
                  onChange={onKnob(r.key)}
                />
                <span className={`${styles.ghost} ${r.ghost}`} aria-hidden="true">
                  <span className={styles.dot} />
                </span>
              </span>
              <output className={styles.val}>{knobs[r.key]}{r.unit}</output>
            </label>
          ))}
          <pre className={styles.code}>
            <span className={styles.mark} aria-hidden="true" />
            {lines.map((line) => (<code className={styles.line} key={line.slice(0, 12)}>{line}</code>))}
          </pre>
          <div className={styles.foot}>
            <button className={styles.copy} type="button" onClick={onCopy}>{COPY_LABEL}</button>
            {copied ? <span className={styles.toast} role="status">{COPIED}</span> : null}
          </div>
        </div>
      </section>
    </main>
  );
}
