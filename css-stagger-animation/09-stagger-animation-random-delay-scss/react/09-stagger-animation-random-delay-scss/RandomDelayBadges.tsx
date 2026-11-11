import styles from "./RandomDelayBadges.module.scss";

export type RandomDelayBadgesProps = {
  badges: string[];
};

export default function RandomDelayBadges({ badges }: RandomDelayBadgesProps) {
  return (
    <div className={styles.badges}>
      {badges.map((label) => (
        <span key={label} className={styles.badge}>
          {label}
        </span>
      ))}
    </div>
  );
}
