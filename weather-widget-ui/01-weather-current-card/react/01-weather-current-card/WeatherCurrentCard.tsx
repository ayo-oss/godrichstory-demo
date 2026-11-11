import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./WeatherCurrentCard.module.scss";

// vanilla 판(run/281/demo/01-weather-current-card/index.html) 의 React 포트.
// 하늘 상태를 고르면 카드 전체(하늘·아이콘·온도·최고최저)가 한 세트로 맞바뀐다.

export type WcCondition = {
  id: string;
  /** 단추에 쓰는 낱말 — 언어팩이 통째로 바꾼다 */
  label: string;
  /** 큰 온도 아래 붙는 하늘 낱말 */
  word: string;
  temp: number;
  hi: number;
  lo: number;
};

export type WeatherCurrentCardProps = {
  location?: string;
  label?: string;
  hiLabel?: string;
  loLabel?: string;
  groupLabel?: string;
  condsLabel?: string;
  conditions?: WcCondition[];
  /** 격자 미리보기 루프가 컷으로 맞바꾸는 두 번째 하늘 상태 */
  loopTo?: string;
  /** 격자 미리보기 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const DEFAULT_CONDITIONS: WcCondition[] = [
  { id: "sunny", label: "맑음", word: "맑음", temp: 24, hi: 27, lo: 18 },
  { id: "cloudy", label: "구름", word: "구름", temp: 21, hi: 24, lo: 17 },
  { id: "rainy", label: "비", word: "비", temp: 19, hi: 21, lo: 16 },
  { id: "snowy", label: "눈", word: "눈", temp: -2, hi: 1, lo: -5 },
];

function PinIcon() {
  return (
    <svg viewBox="0 0 256 256" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M128,16a88,88,0,0,0-88,88c0,75.3,80,132.17,83.41,134.55a8,8,0,0,0,9.18,0C136,236.17,216,179.3,216,104A88,88,0,0,0,128,16Z" opacity="0.2"/><path d="M128,40a64,64,0,1,0,64,64A64.07,64.07,0,0,0,128,40Zm0,96a32,32,0,1,1,32-32A32,32,0,0,1,128,136Z"/></svg>
  );
}
function SunGlyph() {
  return (
    <svg viewBox="0 0 256 256" width="40" height="40" fill="currentColor"><path d="M184,128a56,56,0,1,1-56-56A56,56,0,0,1,184,128Z" opacity="0.2"/><path d="M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z"/></svg>
  );
}
function CloudGlyph() {
  return (
    <svg viewBox="0 0 256 256" width="40" height="40" fill="currentColor"><path d="M139.84,84.41v0a68.22,68.22,0,0,0-41.65,46v-.11a44.08,44.08,0,0,0-38.54,5h0a48,48,0,1,1,80.19-50.94Z" opacity="0.2"/><path d="M164,72a76.2,76.2,0,0,0-20.26,2.73,55.63,55.63,0,0,0-9.41-11.54l9.51-13.57a8,8,0,1,0-13.11-9.18L121.22,54A55.9,55.9,0,0,0,96,48c-.58,0-1.16,0-1.74,0L91.37,31.71a8,8,0,1,0-15.75,2.77L78.5,50.82A56.1,56.1,0,0,0,55.23,65.67L41.61,56.14a8,8,0,1,0-9.17,13.11L46,78.77A55.55,55.55,0,0,0,40,104c0,.57,0,1.15,0,1.72L23.71,108.6a8,8,0,0,0,1.38,15.88,8.24,8.24,0,0,0,1.39-.12l16.32-2.88a55.74,55.74,0,0,0,5.86,12.42A52,52,0,0,0,84,224h80a76,76,0,0,0,0-152ZM56,104a40,40,0,0,1,72.54-23.24,76.26,76.26,0,0,0-35.62,40,52.14,52.14,0,0,0-31,4.17A40,40,0,0,1,56,104ZM164,208H84a36,36,0,1,1,4.78-71.69c-.37,2.37-.63,4.79-.77,7.23a8,8,0,0,0,16,.92,58.91,58.91,0,0,1,1.88-11.81c0-.16.09-.32.12-.48A60.06,60.06,0,1,1,164,208Z"/></svg>
  );
}
function RainGlyph() {
  return (
    <svg viewBox="0 0 256 256" width="40" height="40" fill="currentColor"><path d="M224,92a68,68,0,0,1-68,68H76A44,44,0,1,1,90.2,74.34v.11A68.06,68.06,0,0,1,224,92Z" opacity="0.2"/><path d="M158.66,196.44l-32,48a8,8,0,1,1-13.32-8.88l32-48a8,8,0,0,1,13.32,8.88ZM232,92a76.08,76.08,0,0,1-76,76H132.28l-29.62,44.44a8,8,0,1,1-13.32-8.88L113.05,168H76A52,52,0,1,1,76,64a53.26,53.26,0,0,1,8.92.76A76.08,76.08,0,0,1,232,92Zm-16,0A60.06,60.06,0,0,0,96,88.46a8,8,0,0,1-16-.92q.21-3.66.77-7.23A38.11,38.11,0,0,0,76,80a36,36,0,0,0,0,72h80A60.07,60.07,0,0,0,216,92Z"/></svg>
  );
}
function SnowGlyph() {
  return (
    <svg viewBox="0 0 256 256" width="40" height="40" fill="currentColor"><path d="M220,128a92,92,0,1,1-92-92A92.1,92.1,0,0,1,220,128Z" opacity="0.2"/><path d="M223.77,150.09a8,8,0,0,1-5.86,9.68l-24.64,6,6.46,24.11a8,8,0,0,1-5.66,9.8A8.25,8.25,0,0,1,192,200a8,8,0,0,1-7.72-5.93l-7.72-28.8L136,141.86v46.83l21.66,21.65a8,8,0,0,1-11.32,11.32L128,203.31l-18.34,18.35a8,8,0,0,1-11.32-11.32L120,188.69V141.86L79.45,165.27l-7.72,28.8A8,8,0,0,1,64,200a8.25,8.25,0,0,1-2.08-.27,8,8,0,0,1-5.66-9.8l6.46-24.11-24.64-6a8,8,0,0,1,3.82-15.54l29.45,7.23L112,128,71.36,104.54l-29.45,7.23A7.85,7.85,0,0,1,40,112a8,8,0,0,1-1.91-15.77l24.64-6L56.27,66.07a8,8,0,0,1,15.46-4.14l7.72,28.8L120,114.14V67.31L98.34,45.66a8,8,0,0,1,11.32-11.32L128,52.69l18.34-18.35a8,8,0,0,1,11.32,11.32L136,67.31v46.83l40.55-23.41,7.72-28.8a8,8,0,0,1,15.46,4.14l-6.46,24.11,24.64,6A8,8,0,0,1,216,112a7.85,7.85,0,0,1-1.91-.23l-29.45-7.23L144,128l40.64,23.46,29.45-7.23A8,8,0,0,1,223.77,150.09Z"/></svg>
  );
}

// 상태 클래스 — 바닐라의 .is-sunny … 를 모듈 클래스로
const STATE_CLASS: { [k: string]: string } = {
  sunny: styles.isSunny,
  cloudy: styles.isCloudy,
  rainy: styles.isRainy,
  snowy: styles.isSnowy,
};

export default function WeatherCurrentCard({
  location = "서울",
  label = "지금 날씨",
  hiLabel = "최고",
  loLabel = "최저",
  groupLabel = "현재 날씨 카드",
  condsLabel = "하늘 상태 고르기",
  conditions = DEFAULT_CONDITIONS,
  loopTo = "rainy",
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: WeatherCurrentCardProps) {
  const [cond, setCond] = useState("sunny");
  const [live, setLive] = useState(demo);
  // 아이콘이 솟았다 내려앉는 pop 을 다시 튜닌다 — key 를 바꿔 한 번짜리 애니메이션을 처음부터 돌린다
  const [popTick, setPopTick] = useState(0);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cur = conditions.filter((c: WcCondition) => c.id === cond)[0];
  const alt = conditions.filter((c: WcCondition) => c.id === loopTo)[0];

  function pick(id: string): void {
    setLive(false);
    setCond(id);
    setPopTick((n: number) => n + 1);
  }

  const cls = [styles.wc, live ? styles.isDemo : "", STATE_CLASS[cond] || ""].filter(Boolean).join(" ");

  return (
    <main className={styles.stage}>
      <section className={cls} style={vars} aria-label={groupLabel}>
        <span className={`${styles.sky} ${styles["sky--a"]}`} aria-hidden="true" />
        <span className={`${styles.sky} ${styles["sky--b"]}`} aria-hidden="true" />
        <div className={styles.body}>
          <header className={styles.head}>
            <p className={styles.loc}><PinIcon />{location}</p>
            <p className={styles.label}>{label}</p>
          </header>
          <div className={styles.now}>
            <p className={styles.temp}>
              <span className={styles.swap}><span className={styles.v}>{cur.temp}</span><span className={styles.alt} aria-hidden="true">{alt.temp}</span></span>
              <span className={styles.deg}>°</span>
            </p>
            <span className={[styles.art, popTick > 0 ? styles.isPop : ""].filter(Boolean).join(" ")} key={popTick} aria-hidden="true">
              <span className={`${styles.glyph} ${styles["glyph--sunny"]}`}><SunGlyph /></span>
              <span className={`${styles.glyph} ${styles["glyph--cloudy"]}`}><CloudGlyph /></span>
              <span className={`${styles.glyph} ${styles["glyph--rainy"]}`}><RainGlyph /></span>
              <span className={`${styles.glyph} ${styles["glyph--snowy"]}`}><SnowGlyph /></span>
            </span>
            <p className={`${styles.word} ${styles.swap}`}><span className={styles.v}>{cur.word}</span><span className={styles.alt} aria-hidden="true">{alt.word}</span></p>
          </div>
          <p className={styles.range}>
            <span className={styles.hi}>{hiLabel} <span className={styles.swap}><span className={styles.v}>{cur.hi}</span><span className={styles.alt} aria-hidden="true">{alt.hi}</span></span>°</span>
            <span className={styles.lo}>{loLabel} <span className={styles.swap}><span className={styles.v}>{cur.lo}</span><span className={styles.alt} aria-hidden="true">{alt.lo}</span></span>°</span>
          </p>
          <div className={styles.conds} role="group" aria-label={condsLabel}>
            {conditions.map((c: WcCondition) => (
              <button
                key={c.id}
                className={[styles.c, c.id === cond ? styles.isOn : ""].filter(Boolean).join(" ")}
                type="button"
                aria-pressed={c.id === cond ? "true" : "false"}
                onClick={() => pick(c.id)}
              >{c.label}</button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
