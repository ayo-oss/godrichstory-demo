import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ResumeDraftBanner.module.scss";

export type ResumeDraftBannerProps = {
  bannerText?: string;
  resumePrefix?: string;
  resumeSuffix?: string;
  freshLabel?: string;
  headingPrefix?: string;
  headingSuffix?: string;
  fieldLabel?: string;
  fieldPlaceholder?: string;
  savedLabel?: string;
  groupLabel?: string;
  totalSteps?: number;
  /** 데모라 직전 세션이 없을 때 이어쓸 초안 단계 */
  seedStep?: number;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type KeyEvt = { key: string; preventDefault(): void };
type InputEvt = { target: { value: string } };
type Box<T> = { current: T };

const STORAGE_KEY = "godrich-265-04-react";

type Draft = { step: number; v: string };

function readDraft(seedStep: number): Draft {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const d = JSON.parse(raw) as Draft;
      if (typeof d.step === "number") return { step: d.step, v: String(d.v || "") };
    }
  } catch {
    // iframe 이 저장소를 막을 수 있다 — 없을 때와 똑같이 논다
  }
  return { step: seedStep, v: "" };
}

function writeDraft(d: Draft) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
  } catch {
    // 저장 실패는 화면을 깨지 않는다
  }
}

function ClockBack() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <g>
        <path d="M216 128a88 88 0 1 1-88-88a88 88 0 0 1 88 88" opacity=".2" />
        <path d="M136 80v43.47l36.12 21.67a8 8 0 0 1-8.24 13.72l-40-24A8 8 0 0 1 120 128V80a8 8 0 0 1 16 0m-8-48a95.44 95.44 0 0 0-67.92 28.15C52.81 67.51 46.35 74.59 40 82V64a8 8 0 0 0-16 0v40a8 8 0 0 0 8 8h40a8 8 0 0 0 0-16H49c7.15-8.42 14.27-16.35 22.39-24.57a80 80 0 1 1 1.66 114.75a8 8 0 1 0-11 11.64A96 96 0 1 0 128 32" />
      </g>
    </svg>
  );
}

export default function ResumeDraftBanner({
  bannerText = "You have an unfinished draft",
  resumePrefix = "Resume from step ",
  resumeSuffix = "",
  freshLabel = "Start over",
  headingPrefix = "/ 4 · Application",
  headingSuffix = "",
  fieldLabel = "Recipient name",
  fieldPlaceholder = "Recipient name",
  savedLabel = "Saved automatically",
  groupLabel = "Application that remembers where you stopped",
  totalSteps = 4,
  seedStep = 3,
  demo = true,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: ResumeDraftBannerProps) {
  const [draft, setDraft] = useState<Draft>({ step: 1, v: "" });
  const [step, setStep] = useState(1);
  const [live, setLive] = useState(demo);
  const [saved, setSaved] = useState(false);
  const input = useRef<HTMLInputElement>(null) as Box<HTMLInputElement | null>;

  // 열 때 저장된 초안을 읽어 띠 문구를 맞춘다
  useEffect(() => {
    const d = readDraft(seedStep);
    setDraft(d);
    if (!localStorage.getItem(STORAGE_KEY)) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
      } catch {
        /* 저장소가 막혀도 띠는 seedStep 로 보여 준다 */
      }
    }
  }, [seedStep]);

  function onInput(e: InputEvt) {
    setLive(false);
    setSaved(true);
    const next = { step, v: e.target.value };
    setDraft(next);
    writeDraft(next);
  }

  function resume() {
    setLive(false);
    const d = readDraft(seedStep);
    setStep(d.step);
    setDraft(d);
    if (input.current) {
      input.current.value = d.v;
      input.current.focus({ preventScroll: true });
    }
  }

  function fresh() {
    setLive(false);
    const next = { step: 1, v: "" };
    setStep(1);
    setDraft(next);
    setSaved(false);
    writeDraft(next);
    if (input.current) {
      input.current.value = "";
      input.current.focus({ preventScroll: true });
    }
  }

  function onKey(e: KeyEvt) {
    if (e.key === "Enter") {
      e.preventDefault();
      resume();
    }
  }

  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cls = [styles.rb, live ? styles.isDemo : "", step >= 3 ? styles.isAt3 : "", saved ? styles.isOn : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <div className={styles.bar} role="status" aria-live="polite">
        <span className={styles.barI} aria-hidden="true"><ClockBack /></span>
        <p className={styles.barT}>{bannerText}</p>
        <span className={styles.barA}>
          <button className={[styles.b, styles.bGo].join(" ")} type="button" onClick={resume}>
            {resumePrefix + draft.step + resumeSuffix}
          </button>
          <button className={styles.b} type="button" onClick={fresh}>
            {freshLabel}
          </button>
        </span>
      </div>
      <div className={styles.form}>
        <div className={styles.head}>
          <p className={styles.h}>
            <span className={styles.now}>
              <b className={styles.d} data-d="1">1</b>
              <b className={styles.d} data-d="3">3</b>
            </span>
            {" "}{headingPrefix}{headingSuffix}
          </p>
          <p className={styles.save}>{savedLabel}</p>
        </div>
        <div className={styles.dots} aria-hidden="true">
          {Array.from({ length: totalSteps }, (_, i) => (
            <span key={i} className={styles.dot} data-dot={i + 1}>
              <span className={styles.dotF} />
            </span>
          ))}
        </div>
        <input
          ref={input}
          className={styles.in}
          type="text"
          placeholder={fieldPlaceholder}
          aria-label={fieldLabel}
          onInput={onInput}
          onKeyDown={onKey}
        />
      </div>
    </section>
  );
}
