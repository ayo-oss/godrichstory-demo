import styles from "./GridWave.module.scss";

export type GridWaveProps = {
  cells?: (string | number)[];
  cols?: number;
  /** (행+열) 1당 시차 ms (기본 70ms) */
  wave?: number;
  duration?: number;
  easing?: string;
};

export default function GridWave({
  cells = [1, 2, 3, 4, 5, 6, 7, 8, 9],
  cols = 3,
  wave = 70,
  duration = 300,
  easing = "ease-out",
}: GridWaveProps) {
  return (
    <div className={styles.grid}>
      {cells.map((cell, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;
        return (
          <span
            key={i}
            className={styles.cell}
            style={{
              animationDelay: `${(row + col) * wave}ms`,
              animationDuration: "2s",
              transitionDuration: `${duration}ms`,
              transitionTimingFunction: easing,
            }}
          >
            {cell}
          </span>
        );
      })}
    </div>
  );
}
