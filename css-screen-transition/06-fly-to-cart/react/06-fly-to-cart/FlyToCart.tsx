import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import styles from "./FlyToCart.module.scss";

export type FlyToCartProps = {
  name: string;
  addLabel: string;
  /** 점이 카트까지 날아가는 시간 (기본 700ms) */
  duration?: number;
  easing?: string;
  /** 상품·점 색 */
  color?: string;
  /** 카트에 이미 담겨 있는 개수 */
  count?: number;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function FlyToCart({
  name,
  addLabel,
  duration = 700,
  easing = "ease-out",
  color = "#ff4d1f",
  count = 2,
}: FlyToCartProps) {
  const [flying, setFlying] = useState(false);
  const [added, setAdded] = useState(count);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    if (!flying) return;
    const t = setTimeout(() => { setAdded((n) => n + 1); setFlying(false); }, duration);
    return () => clearTimeout(t);
  }, [flying, duration]);

  return (
    <section className={styles.cart} style={vars} aria-label={name}>
      <div className={styles.bag} aria-hidden="true">
        <span className={styles.basket} />
        <span className={`${styles.badge} ${flying ? styles.badgeBump : ""}`}>{added}</span>
      </div>
      <article className={styles.product}>
        <span className={styles.swatch} aria-hidden="true" />
        <h2 className={styles.name}>{name}</h2>
        <button type="button" className={styles.btn} onClick={() => setFlying(true)}>{addLabel}</button>
      </article>
      <span className={`${styles.fly} ${flying ? styles.flyGo : ""}`} aria-hidden="true">
        <span className={styles.flyY} />
      </span>
    </section>
  );
}
