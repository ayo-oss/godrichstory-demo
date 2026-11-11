import styles from "./FooterOrb.module.scss";

export type FooterOrbProps = {
  /** 느린 오브가 구분선을 한 번 건너는 시간 (빠른 쪽은 이것의 절반) */
  duration?: string;
  /** 지나가는 빛의 이징 — 가속하지 않는다 */
  easing?: string;
  /** 첫 오브 색 — --beaconColor 로 내려간다 */
  color?: string;
};

type Column = { head: string; links: string[] };

const COLUMNS: Column[] = [
  { head: "제품", links: ["기능", "요금제", "변경 기록"] },
  { head: "문서", links: ["빠른 시작", "API", "예제"] },
  { head: "회사", links: ["소개", "채용", "문의"] },
  { head: "커뮤니티", links: ["디스코드", "블로그", "상태"] },
];

// 음수 지연으로 셋의 위상을 20% · 50% · 62% 로 벌려 둔다 — 어느 순간에도 최소 하나는 궤도 안에 있다
const BEACONS = [
  { dot: styles.dotLilac, delay: "-400ms", half: false },
  { dot: styles.dotMint, delay: "-500ms", half: true },
  { dot: styles.dotBlue, delay: "-1200ms", half: false },
];

function halfOf(duration: string): string {
  const n = parseFloat(duration);
  return duration.indexOf("ms") >= 0 ? `${n / 2}ms` : `${n / 2}s`;
}

export default function FooterOrb({
  duration = "2s",
  easing = "linear",
  color = "#b9a0ff",
}: FooterOrbProps) {
  return (
    <main className={styles.stage}>
      <footer className={styles.fo} style={{ "--beaconColor": color }}>
        {/* 구분선 위를 지나가는 미니 오브 셋 — 장식이라 낭독기에서 숨긴다 */}
        <div className={styles.rail} aria-hidden="true">
          {BEACONS.map((b) => (
            <span
              key={b.delay}
              className={styles.beacon}
              style={{
                animationName: "beaconCross",
                animationDuration: b.half ? halfOf(duration) : duration,
                animationTimingFunction: easing,
                animationIterationCount: "infinite",
                animationFillMode: "backwards",
                animationDelay: b.delay,
              }}
            >
              <span className={`${styles.dot} ${b.dot}`} />
            </span>
          ))}
        </div>
        <div className={styles.cols}>
          {COLUMNS.map((c) => (
            <section key={c.head} className={styles.col}>
              <h2 className={styles.head}>{c.head}</h2>
              <ul className={styles.links}>
                {c.links.map((l) => (
                  <li key={l}><a href="#" onClick={(e: { preventDefault: () => void }) => { e.preventDefault(); }}>{l}</a></li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <p className={styles.copy}>
          <span>© 2026 Orbit Labs</span>
          <span className={styles.lang}>
            <span className={styles.ico} aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M213.09,172.48a96,96,0,0,1-80.41,51.41l3.17-16.44a8,8,0,0,0-2-6.95l-19.74-20.33a8,8,0,0,1-1.44-8.69l13.7-30.74a8,8,0,0,1,8.38-4.67l22.82,3.08a8.11,8.11,0,0,1,3.12,1.11ZM116.71,95,129,88.24a7.46,7.46,0,0,0,1.5-1.07l26.91-24.33A8,8,0,0,0,159,53l-10.5-18.81A96.62,96.62,0,0,0,128,32,95.61,95.61,0,0,0,67.78,53.23L56,81.08A8,8,0,0,0,55.88,87l11.5,30.67a8,8,0,0,0,5.81,5l2.69.58L89.2,100a8,8,0,0,1,6.94-4h16.71A7.9,7.9,0,0,0,116.71,95Z" opacity="0.2"/><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm88,104a87.62,87.62,0,0,1-6.4,32.94l-44.7-27.49a15.92,15.92,0,0,0-6.24-2.23l-22.82-3.08a16.11,16.11,0,0,0-16,7.86h-8.72l-3.8-7.86a15.91,15.91,0,0,0-11-8.67l-8-1.73L96.14,104h16.71a16.06,16.06,0,0,0,7.73-2l12.25-6.76a16.62,16.62,0,0,0,3-2.14l26.91-24.34A15.93,15.93,0,0,0,166,49.1l-.36-.65A88.11,88.11,0,0,1,216,128ZM143.31,41.34,152,56.9,125.09,81.24,112.85,88H96.14a16,16,0,0,0-13.88,8l-8.73,15.23L63.38,84.19,74.32,58.32a87.87,87.87,0,0,1,69-17ZM40,128a87.53,87.53,0,0,1,8.54-37.8l11.34,30.27a16,16,0,0,0,11.62,10l21.43,4.61L96.74,143a16.09,16.09,0,0,0,14.4,9h1.48l-7.23,16.23a16,16,0,0,0,2.86,17.37l.14.14L128,205.94l-1.94,10A88.11,88.11,0,0,1,40,128Zm102.58,86.78,1.13-5.81a16.09,16.09,0,0,0-4-13.9,1.85,1.85,0,0,1-.14-.14L120,174.74,133.7,144l22.82,3.08,45.72,28.12A88.18,88.18,0,0,1,142.58,214.78Z"/></svg></span>
            한국어
          </span>
        </p>
      </footer>
    </main>
  );
}
