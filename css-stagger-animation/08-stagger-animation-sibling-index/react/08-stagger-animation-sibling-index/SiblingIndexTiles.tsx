import styles from "./SiblingIndexTiles.module.scss";

export type SiblingIndexTilesProps = {
  /** 타일 개수 (기본 6) — --i 도 nth-child 도 없이 sibling-index() 가 형제 순서를 읽는다 */
  count?: number;
};

export default function SiblingIndexTiles({ count = 6 }: SiblingIndexTilesProps) {
  return (
    <div className={styles.tiles}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} />
      ))}
    </div>
  );
}
