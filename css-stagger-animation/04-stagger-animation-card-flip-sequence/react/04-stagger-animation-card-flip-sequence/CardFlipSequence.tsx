import styles from "./CardFlipSequence.module.scss";

export type CardFlipSequenceProps = {
  cards: string[];
  /** 카드 사이 시차 ms (기본 150ms) */
  stagger?: number;
  duration?: number;
  easing?: string;
};

export default function CardFlipSequence({ cards, stagger = 150 }: CardFlipSequenceProps) {
  return (
    <div className={styles.cards}>
      {cards.map((label, i) => (
        <div key={label} className={styles.card} style={{ animationDelay: `${i * stagger}ms` }}>
          {label}
        </div>
      ))}
    </div>
  );
}
