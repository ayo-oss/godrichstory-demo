import { useEffect, useRef } from "react";
import styles from "./CtaBtnConfettiBurst.module.scss";

type Particle = {
  x: number; y: number; vx: number; vy: number;
  rot: number; vrot: number; color: string; age: number;
};

export type CtaBtnConfettiBurstProps = {
  color?: string;
};

export default function CtaBtnConfettiBurst({
  color = "#0a4fe8",
}: CtaBtnConfettiBurstProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const btn = root.querySelector<HTMLButtonElement>(`.${styles.btn}`);
    const canvas = root.querySelector<HTMLCanvasElement>(`.${styles.canvas}`);
    if (!btn || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const COLORS = ["#5b8cf8", "#ff9ebb", "#4cd4a6", "#b9a0ff"];

    // 계산 겹: 조각마다 각도·속도 값을 난수로 부여하고, 매 프레임 중력(GRAVITY)을 속도에
    // 더하고 속도에 감쇠(DRAG)를 곱해 궤적을 계산한다. 회전 값도 각자 다른 속도로 누적하고
    // 투명도 값은 남은 수명 비율로 계산해 사라진다.
    const GRAVITY = 420, DRAG = 0.985, LIFE = 900;
    let particles: Particle[] = [];
    let raf: number | null = null;
    let lastT = 0;

    function burst() {
      const cx = canvas!.width / 2, cy = canvas!.height * 0.35;
      particles = [];
      for (let i = 0; i < 18; i++) {
        const angle = (Math.PI * 2 * i) / 18 + (Math.random() - 0.5) * 0.5;
        const speed = 90 + Math.random() * 110;
        particles.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 60,
          rot: Math.random() * Math.PI,
          vrot: (Math.random() - 0.5) * 10,
          color: COLORS[i % COLORS.length],
          age: 0,
        });
      }
      if (raf === null) { lastT = performance.now(); raf = requestAnimationFrame(tick); }
    }

    function tick(now: number) {
      const dt = Math.min((now - lastT) / 1000, 0.05);
      lastT = now;
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      let alive = false;
      for (const p of particles) {
        p.age += dt * 1000;
        if (p.age >= LIFE) continue;
        alive = true;
        p.vy += GRAVITY * dt;
        p.vx *= DRAG; p.vy *= DRAG;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.rot += p.vrot * dt;
        const op = Math.max(0, 1 - p.age / LIFE);
        ctx!.save();
        ctx!.globalAlpha = op;
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.rot);
        ctx!.fillStyle = p.color;
        ctx!.fillRect(-4, -3, 8, 6);
        ctx!.restore();
      }
      raf = alive ? requestAnimationFrame(tick) : null;
    }

    function onClick() { stopAutoplay(); burst(); }
    btn.addEventListener("click", onClick);

    let autoplayTimer: number | null = null;
    function stopAutoplay() { if (autoplayTimer !== null) { window.clearInterval(autoplayTimer); autoplayTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoplayTimer = window.setInterval(burst, 1100); }

    return () => {
      stopAutoplay();
      if (raf !== null) { cancelAnimationFrame(raf); }
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.panel}>
        <div className={styles.wrap}>
          <canvas className={styles.canvas} width={220} height={120} />
          <button className={styles.btn} type="button" style={{ background: color }}>구매 완료</button>
        </div>
        <span className={styles.hint}>클릭하면 조각이 사방으로 흩어집니다</span>
      </div>
    </div>
  );
}
