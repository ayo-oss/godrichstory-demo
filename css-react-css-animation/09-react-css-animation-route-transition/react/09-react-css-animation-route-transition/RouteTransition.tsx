import { CSSProperties, useState } from "react";
import styles from "./RouteTransition.module.scss";

const ROUTES = ["/ home", "/ pricing"];

function Page({ label }: { label: string; key?: string }) {
  // key={label} on the caller side makes each route its own component instance —
  // switching the key unmounts the outgoing page and mounts the incoming one,
  // instead of patching one page's content in place.
  return (
    <div className={styles.page}>
      <span className={styles.label}>{label}</span>
    </div>
  );
}

export interface RouteTransitionProps {
  duration?: string;
  easing?: string;
}

export default function RouteTransition({
  duration = "300ms",
  easing = "cubic-bezier(.2, .8, .2, 1)",
}: RouteTransitionProps) {
  const [route, setRoute] = useState(0);

  const navigate = () => {
    const next = (route + 1) % ROUTES.length;
    if (typeof document !== "undefined" && "startViewTransition" in document) {
      (document as any).startViewTransition(() => setRoute(next));
    } else {
      setRoute(next);
    }
  };

  const style: CSSProperties & { "--duration"?: string; "--easing"?: string } = {
    "--duration": duration,
    "--easing": easing,
  };

  return (
    <button className={styles.frame} style={style} onClick={navigate}>
      <Page key={ROUTES[route]} label={ROUTES[route]} />
    </button>
  );
}
