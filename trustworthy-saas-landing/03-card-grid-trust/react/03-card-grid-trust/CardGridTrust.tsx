import type { CSSProperties, ReactNode } from "react";
import styles from "./CardGridTrust.module.scss";

type Item = { label: string; icon: ReactNode };

export type CardGridTrustProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const ICONS: Item[] = [
  {
    label: "보안",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256"><g fill="currentColor"><path d="M216 56v56c0 96-88 120-88 120s-88-24-88-120V56a8 8 0 0 1 8-8h160a8 8 0 0 1 8 8" opacity=".2"/><path d="M208 40H48a16 16 0 0 0-16 16v56c0 52.72 25.52 84.67 46.93 102.19c23.06 18.86 46 25.26 47 25.53a8 8 0 0 0 4.2 0c1-.27 23.91-6.67 47-25.53C198.48 196.67 224 164.72 224 112V56a16 16 0 0 0-16-16m0 72c0 37.07-13.66 67.16-40.6 89.42a129.3 129.3 0 0 1-39.4 22.2a128.3 128.3 0 0 1-38.92-21.81C61.82 179.51 48 149.3 48 112V56h160ZM82.34 141.66a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 11.32l-56 56a8 8 0 0 1-11.32 0Z"/></g></svg>
    ),
  },
  {
    label: "속도",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256"><g fill="currentColor"><path d="m96 240l16-80l-64-24L160 16l-16 80l64 24Z" opacity=".2"/><path d="M215.79 118.17a8 8 0 0 0-5-5.66L153.18 90.9l14.66-73.33a8 8 0 0 0-13.69-7l-112 120a8 8 0 0 0 3 13l57.63 21.61l-14.62 73.25a8 8 0 0 0 13.69 7l112-120a8 8 0 0 0 1.94-7.26M109.37 214l10.47-52.38a8 8 0 0 0-5-9.06L62 132.71l84.62-90.66l-10.46 52.38a8 8 0 0 0 5 9.06l52.8 19.8Z"/></g></svg>
    ),
  },
  {
    label: "성장",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256"><g fill="currentColor"><path d="M224 64v144H32V48h176a16 16 0 0 1 16 16" opacity=".2"/><path d="M232 208a8 8 0 0 1-8 8H32a8 8 0 0 1-8-8V48a8 8 0 0 1 16 0v108.69l50.34-50.35a8 8 0 0 1 11.32 0L128 132.69L180.69 80H160a8 8 0 0 1 0-16h40a8 8 0 0 1 8 8v40a8 8 0 0 1-16 0V91.31l-58.34 58.35a8 8 0 0 1-11.32 0L96 123.31l-56 56V200h184a8 8 0 0 1 8 8"/></g></svg>
    ),
  },
  {
    label: "보안 인증",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256"><g fill="currentColor"><path d="M208 88H48a8 8 0 0 0-8 8v112a8 8 0 0 0 8 8h160a8 8 0 0 0 8-8V96a8 8 0 0 0-8-8m-80 72a20 20 0 1 1 20-20a20 20 0 0 1-20 20" opacity=".2"/><path d="M208 80h-32V56a48 48 0 0 0-96 0v24H48a16 16 0 0 0-16 16v112a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V96a16 16 0 0 0-16-16M96 56a32 32 0 0 1 64 0v24H96Zm112 152H48V96h160zm-80-96a28 28 0 0 0-8 54.83V184a8 8 0 0 0 16 0v-17.17a28 28 0 0 0-8-54.83m0 40a12 12 0 1 1 12-12a12 12 0 0 1-12 12"/></g></svg>
    ),
  },
];

export default function CardGridTrust({ duration = 2000, easing = "ease-out", color = "#2f6df6" }: CardGridTrustProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const delays = ["a", "b", "c", "d"] as const;
  return (
    <div className={styles.grid} style={vars}>
      {ICONS.map((it, i) => (
        <div key={it.label} className={`${styles.card} ${styles[delays[i]]}`}>
          <span className={`${styles.icon} ${styles[delays[i]]}`}>{it.icon}</span>
          <p className={styles.label}>{it.label}</p>
        </div>
      ))}
    </div>
  );
}
