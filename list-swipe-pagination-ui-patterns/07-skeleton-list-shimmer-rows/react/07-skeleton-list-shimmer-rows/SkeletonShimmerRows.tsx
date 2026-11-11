import { useState, type CSSProperties } from "react";
import styles from "./SkeletonShimmerRows.module.scss";

export type SkeletonShimmerRowsProps = {
  people: { name: string; action: string }[];
  loaded?: boolean;
  /** 한 번 훑는 시간 (기본 1.4s) */
  duration?: number;
};

type Vars = CSSProperties & { "--duration"?: string };

export default function SkeletonShimmerRows({ people, loaded = false, duration = 1400 }: SkeletonShimmerRowsProps) {
  const [isLoaded, setIsLoaded] = useState(loaded);
  const vars: Vars = { "--duration": `${duration}ms` };

  return (
    <div className={styles.list} style={vars} aria-busy={!isLoaded}>
      {people.map((p) => (
        <div className={styles.row} key={p.name}>
          {isLoaded ? (
            <span className={styles.content}>
              <strong>{p.name}</strong>
              <span>{p.action}</span>
            </span>
          ) : (
            <>
              <span className={styles.avatar} aria-hidden="true" />
              <span className={styles.lines} aria-hidden="true"><span /><span /></span>
            </>
          )}
        </div>
      ))}
      <button className={styles.toggle} type="button" onClick={() => setIsLoaded((v) => !v)}>
        {isLoaded ? "스켈레톤 다시 보기" : "콘텐츠 미리보기"}
      </button>
    </div>
  );
}
