import { useEffect, useRef, useState } from "react";
import styles from "./WinbackStats.module.scss";

export type WinbackStatsProps = { duration?: number; easing?: string; color?: string };

const STATS = [
  { target: 1280, label: "새로 가입한 이웃" },
  { target: 36, label: "새로 올라온 글" },
  { target: 14, label: "떠나 있던 날" },
];

export default function WinbackStats({ duration = 600, easing = "cubic-bezier(.2,.8,.2,1)", color = "#0a4fe8" }: WinbackStatsProps) {
  const [demo, setDemo] = useState(true);
  const [vals, setVals] = useState<number[]>([0, 0, 0]);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const rollMs = 1100;

  useEffect(() => {
    const roll = (now: number) => {
      if (startRef.current === null) { startRef.current = now; }
      const t = Math.min(1, (now - startRef.current) / rollMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setVals(STATS.map((s) => Math.round(s.target * eased)));
      if (t < 1) { rafRef.current = requestAnimationFrame(roll); }
    };
    rafRef.current = requestAnimationFrame(roll);
    return () => { if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); } };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.mk}>
        <div className={styles.card}>
          <div className={styles.brand}>◆ Acme</div>
          <div className={styles.hero}>
            <span className={styles.badge} style={{ background: color }} aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico}><path d="M224,64V208H32V48H208A16,16,0,0,1,224,64Z" opacity="0.2"/><path d="M232,208a8,8,0,0,1-8,8H32a8,8,0,0,1-8-8V48a8,8,0,0,1,16,0V156.69l50.34-50.35a8,8,0,0,1,11.32,0L128,132.69,180.69,80H160a8,8,0,0,1,0-16h40a8,8,0,0,1,8,8v40a8,8,0,0,1-16,0V91.31l-58.34,58.35a8,8,0,0,1-11.32,0L96,123.31l-56,56V200H224A8,8,0,0,1,232,208Z"/></svg>
            </span>
          </div>
          <div className={styles.title}>돌아오셨네요! 그동안 있었던 일</div>
          <div className={styles.stats}>
            {STATS.map((s, i) => (
              <div key={s.label} className={styles.stat} style={demo ? { animationName: "rgRise", animationDuration: "2s", animationTimingFunction: easing, animationIterationCount: "infinite", animationDelay: `${i * 100}ms` } : undefined}>
                <span className={styles.num} style={{ color: color }}>{vals[i].toLocaleString("ko-KR")}</span>
                <span className={styles.statlabel}>{s.label}</span>
              </div>
            ))}
          </div>
          <div className={styles.ctawrap}>
            <a href="#" role="button" className={styles.cta} style={{ background: "#2a5fd8", ...(demo ? { animationName: "rgBreath", animationDuration: "2s", animationTimingFunction: easing, animationIterationCount: "infinite" } : {}) }} onClick={(e: { preventDefault: () => void }) => { e.preventDefault(); setDemo(false); }}>다시 시작하기</a>
          </div>
          <div className={styles.footer}>Acme Inc · 서울 · <a href="#" className={styles.unsub}>수신거부</a></div>
        </div>
      </div>
    </main>
  );
}
