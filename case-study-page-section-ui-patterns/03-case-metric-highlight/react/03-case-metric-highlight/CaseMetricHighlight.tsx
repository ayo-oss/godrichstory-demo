// CaseMetricHighlight — vanilla 판(run/340/demo/03-case-metric-highlight/index.html) 의 React 포트.
// 전/후 수치만 데이터로 두고 개선율을 매 사이클 직접 나눠 구한 뒤, 원 둘레(2*PI*R)를 계산해
// 그 비율만큼 stroke-dashoffset 을 역산한다. 게이지 값은 미리 적어두지 않고 매번 다시 계산한다.
import { useEffect, useRef } from "react";
import styles from "./CaseMetricHighlight.module.scss";

export type CaseMetricHighlightProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "전후 수치의 개선폭을 직접 나눠 비율을 구하고, 그 비율만큼 원 둘레를 계산해 게이지를 채웁니다";

type Metric = {
  label: string;
  before: number;
  after: number;
  unit: "ms" | "%";
  lowerIsBetter: boolean;
  caption: string;
};

const METRICS: Metric[] = [
  { label: "응답 시간", before: 420, after: 180, unit: "ms", lowerIsBetter: true, caption: "개선" },
  { label: "전환율", before: 2.1, after: 5.8, unit: "%", lowerIsBetter: false, caption: "상승" },
  { label: "이탈률", before: 61, after: 34, unit: "%", lowerIsBetter: true, caption: "개선" }
];

const RADIUS = 54;
const CIRC = 2 * Math.PI * RADIUS;
const MAX_IMPROVEMENT = 0.7;
const ANIM_MS = 1100;
const CYCLE_MS = 2200;

function computeRatio(metric: Metric): number {
  const delta = metric.lowerIsBetter ? metric.before - metric.after : metric.after - metric.before;
  const improvement = delta / metric.before;
  return Math.max(0, Math.min(1, improvement / MAX_IMPROVEMENT));
}

function computePercent(metric: Metric): number {
  const delta = metric.lowerIsBetter ? metric.before - metric.after : metric.after - metric.before;
  return Math.round((delta / metric.before) * 100);
}

function fmt(metric: Metric, value: number): string {
  if (metric.unit === "ms") return Math.round(value) + "ms";
  return Math.round(value * 10) / 10 + "%";
}

export default function CaseMetricHighlight({
  duration = "600ms",
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#0a4fe8"
}: CaseMetricHighlightProps) {
  const fillRef = useRef<SVGCircleElement | null>(null);
  const percentRef = useRef<HTMLSpanElement | null>(null);
  const captionRef = useRef<HTMLSpanElement | null>(null);
  const nameRef = useRef<HTMLParagraphElement | null>(null);
  const beforeRef = useRef<HTMLSpanElement | null>(null);
  const afterRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const fill = fillRef.current;
    const percentEl = percentRef.current;
    const captionEl = captionRef.current;
    const nameEl = nameRef.current;
    const beforeEl = beforeRef.current;
    const afterEl = afterRef.current;
    if (!fill || !percentEl || !captionEl || !nameEl || !beforeEl || !afterEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    fill.style.strokeDasharray = String(CIRC);

    function applyGauge(ratio: number): void {
      const offset = CIRC * (1 - ratio);
      fill!.style.strokeDashoffset = String(offset);
    }

    let raf = 0;

    function runMetric(metric: Metric): void {
      nameEl!.textContent = metric.label;
      captionEl!.textContent = metric.caption;
      beforeEl!.textContent = fmt(metric, metric.before);
      const targetPercent = computePercent(metric);
      const targetRatio = computeRatio(metric);

      if (reduce) {
        afterEl!.textContent = fmt(metric, metric.after);
        percentEl!.textContent = targetPercent + "%";
        applyGauge(targetRatio);
        return;
      }

      let start: number | null = null;
      function frame(ts: number): void {
        if (start === null) start = ts;
        const t = Math.min((ts - start) / ANIM_MS, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        const curAfter = metric.before + (metric.after - metric.before) * eased;
        const curRatio = targetRatio * eased;
        const curPercent = Math.round(targetPercent * eased);
        afterEl!.textContent = fmt(metric, curAfter);
        percentEl!.textContent = curPercent + "%";
        applyGauge(curRatio);
        if (t < 1) raf = requestAnimationFrame(frame);
      }
      applyGauge(0);
      percentEl!.textContent = "0%";
      afterEl!.textContent = fmt(metric, metric.before);
      raf = requestAnimationFrame(frame);
    }

    let idx = 0;
    runMetric(METRICS[0]);
    let timer = 0;
    if (!reduce) {
      timer = window.setInterval(() => {
        idx = (idx + 1) % METRICS.length;
        runMetric(METRICS[idx]);
      }, CYCLE_MS);
    }

    return () => {
      if (timer) window.clearInterval(timer);
      if (raf) cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <section className={styles.panel}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.gaugeWrap}>
          <svg className={styles.gaugeSvg} width="132" height="132" viewBox="0 0 132 132" aria-hidden="true">
            <circle className={styles.gaugeTrack} cx="66" cy="66" r="54" />
            <circle className={styles.gaugeFill} ref={fillRef} cx="66" cy="66" r="54" />
          </svg>
          <div className={styles.gaugeCenter}>
            <span className={styles.gaugePercent} ref={percentRef}>0%</span>
            <span className={styles.gaugeCaption} ref={captionRef}>개선</span>
          </div>
        </div>
        <p className={styles.metricName} ref={nameRef}>응답 시간</p>
        <p className={styles.metricPair}>
          <span className={styles.metricBefore} ref={beforeRef}>420ms</span>
          <span className={styles.metricArrow} aria-hidden="true">→</span>
          <span className={styles.metricAfter} ref={afterRef}>420ms</span>
        </p>
      </section>
    </main>
  );
}
