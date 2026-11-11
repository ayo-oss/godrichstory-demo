import styles from "./ReverseExit.module.scss";

export type ReverseExitProps = {
  /** 정확히 3개 — 들어올 땐 위→아래 순, 나갈 땐 아래→위 역순 */
  items: [string, string, string];
};

const CLASS = [styles.exit1, styles.exit2, styles.exit3];

export default function ReverseExit({ items }: ReverseExitProps) {
  return (
    <ul className={styles.toasts}>
      {items.map((label, i) => (
        <li key={label} className={CLASS[i]}>
          {label}
        </li>
      ))}
    </ul>
  );
}
