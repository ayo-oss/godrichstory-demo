// HexRgbHslSync — vanilla 판(run/286/demo/03-color-picker-hex-rgb-hsl-sync) 의 React 포트.
// 변수 3개(duration·easing·color)는 props 로 받아 CSS 변수(var(--duration) 등)로 들어온다.
// 상태는 RGB 세 숫자뿐이다. HSL 은 그때그때 계산해 --hh --ss --ll 로만 넘기고,
// 미리보기 글자는 module.scss 의 counter-set + @counter-style 이 찍는다 — JS 가 글자를 쓰지 않는다.
import { useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import styles from "./HexRgbHslSync.module.scss";

export type HexRgbHslSyncProps = {
  hexLabel?: string;
  rgbLabel?: string;
  hslLabel?: string;
  badLabel?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--r"?: number;
  "--g"?: number;
  "--b"?: number;
  "--hh"?: number;
  "--ss"?: number;
  "--ll"?: number;
};

const KINDS = ["hex", "rgb", "hsl"];

function pad(n: number): string {
  return n.toString(16).padStart(2, "0");
}

function toHex(c: number[]): string {
  return ("#" + pad(c[0]) + pad(c[1]) + pad(c[2])).toUpperCase();
}

// RGB(0~255) → HSL(0~360, 0~100%, 0~100%)
function toHsl(c: number[]): number[] {
  const r = c[0] / 255;
  const g = c[1] / 255;
  const b = c[2] / 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  const l = (mx + mn) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0 && mx === r) h = 60 * (((g - b) / d) % 6);
  else if (d !== 0 && mx === g) h = 60 * ((b - r) / d + 2);
  else if (d !== 0) h = 60 * ((r - g) / d + 4);
  return [Math.round((h + 360) % 360), Math.round(s * 100), Math.round(l * 100)];
}

// HSL → RGB. 육각형 여섯 구간을 표로 펴서 분기 없이 고른다
function fromHsl(h: number, s: number, l: number): number[] {
  const sf = s / 100;
  const lf = l / 100;
  const c = (1 - Math.abs(2 * lf - 1)) * sf;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lf - c / 2;
  const faces: number[][] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]];
  return faces[Math.floor(h / 60) % 6].map((n) => Math.round((n + m) * 255));
}

// 세 표기 중 하나를 읽는다. 형식이 어긋나면 null 을 돌려주고 그 칸만 aria-invalid 로 남는다
function parse(kind: string, raw: string): number[] | null {
  const t = raw.trim();
  if (kind === "hex") {
    const m = /^#?([0-9a-f]{6})$/i.exec(t);
    return m ? [0, 2, 4].map((i) => parseInt(m[1].substr(i, 2), 16)) : null;
  }
  if (kind === "rgb") {
    const m = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i.exec(t);
    if (!m) return null;
    const v = [1, 2, 3].map((i) => parseInt(m[i], 10));
    return v.some((n) => n > 255) ? null : v;
  }
  const m = /^hsl\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*\)$/i.exec(t);
  if (!m) return null;
  const v = [1, 2, 3].map((i) => parseInt(m[i], 10));
  return v[0] > 360 || v[1] > 100 || v[2] > 100 ? null : fromHsl(v[0], v[1], v[2]);
}

function label(kind: string, rgb: number[]): string {
  if (kind === "hex") return toHex(rgb);
  if (kind === "rgb") return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  const hsl = toHsl(rgb);
  return `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`;
}

export default function HexRgbHslSync({
  hexLabel = "HEX 값 입력",
  rgbLabel = "RGB 값 입력",
  hslLabel = "HSL 값 입력",
  badLabel = "형식 오류",
  demo = true,
  duration = 2000,
  easing = "linear",
  color = "#2f6df6",
}: HexRgbHslSyncProps) {
  const [live, setLive] = useState(demo);
  const [rgb, setRgb] = useState<number[]>([13, 120, 242]);
  const [editing, setEditing] = useState("");   // 사람이 손대고 있는 칸
  const [draft, setDraft] = useState("");       // 그 칸에 적힌 글자 그대로
  const [bad, setBad] = useState("");           // 형식이 어긋난 칸

  const hsl = toHsl(rgb);
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--r": rgb[0],
    "--g": rgb[1],
    "--b": rgb[2],
    "--hh": hsl[0],
    "--ss": hsl[1],
    "--ll": hsl[2],
  };

  const labels: { [k: string]: string } = { hex: hexLabel, rgb: rgbLabel, hsl: hslLabel };
  const ghosts: { [k: string]: string } = { hex: styles.ghostHex, rgb: styles.ghostRgb, hsl: styles.ghostHsl };

  function change(kind: string, e: ChangeEvent<HTMLInputElement>) {
    setLive(false);
    const raw = e.target.value;
    setEditing(kind);
    setDraft(raw);
    const next = parse(kind, raw);
    if (next) {
      setRgb(next);
      setBad("");
    } else {
      setBad(kind);
    }
  }

  return (
    <div className={[styles.sy, live ? styles.isDemo : ""].filter(Boolean).join(" ")} style={vars}>
      <div className={styles.band} aria-hidden="true" />
      {KINDS.map((kind) => (
        <div key={kind} className={[styles.row, bad === kind ? styles.isBad : ""].filter(Boolean).join(" ")}>
          <span className={styles.label} aria-hidden="true">
            {kind.toUpperCase()}
          </span>
          <span className={styles.field}>
            <input
              className={styles.input}
              type="text"
              spellCheck={false}
              autoComplete="off"
              aria-label={labels[kind]}
              aria-invalid={bad === kind}
              value={kind === editing ? draft : label(kind, rgb)}
              onChange={(e: ChangeEvent<HTMLInputElement>) => change(kind, e)}
            />
            <span className={[styles.ghost, ghosts[kind]].join(" ")} aria-hidden="true" />
            <span className={styles.bad} aria-hidden="true">
              {badLabel}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
