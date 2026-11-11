// MenuTileSoldOut — vanilla 판(run/298/demo/04-kiosk-menu-tile-soldout/index.html) 의 React 포트.
// 여섯 칸 중 한 칸만 재고가 떨어졌다. 그 칸은 `disabled` 가 아니라 `aria-disabled="true"` 다 —
// disabled 를 주면 Tab 이 그 칸을 건너뛰어 "왜 못 누르는지" 를 읽어 줄 기회가 사라진다.
// 그래서 초점은 남기고 담기만 add() 한 줄에서 막는다. 눌러도 담은 개수가 안 오르는 것이 이 부품의 핵심이다.
// 미리보기 루프(.isDemo)는 CSS 키프레임이 돌리고, 사람이 누르면 여기서 루프를 뗀다. 값·수치는 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./MenuTileSoldOut.module.scss";

export type MenuTileSoldOutProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };

const GRID_LABEL = "메뉴 고르기";
const BAG_LABEL = "담은 메뉴 {n}개";
const STAMP = "품절";
const TAP_MS = 180;                               // 사람이 누른 자리의 눌림이 남는 시간

type Tile = { cls: string; name: string; price: string; out: boolean };
const TILES: Tile[] = [
  { cls: "tile1", name: "아메리카노", price: "4,000원", out: false },
  { cls: "tile2", name: "카페라떼", price: "4,500원", out: false },
  { cls: "tile3", name: "바닐라라떼", price: "5,000원", out: false },
  { cls: "tile4", name: "초코쿠키", price: "3,000원", out: false },
  { cls: "tileOut", name: "딸기라떼", price: "5,500원", out: true },
  { cls: "tile6", name: "아이스티", price: "4,000원", out: false },
];

export default function MenuTileSoldOut({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: MenuTileSoldOutProps) {
  const timerRef = useRef<number>(0) as Box<number>;
  const [picked, setPicked] = useState(0);
  const [tapped, setTapped] = useState("");
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, []);

  // 품절 칸은 여기서 되돌아간다 — 초점도 가고 눌리기도 하지만 담은 개수는 오르지 않는다
  function add(tile: Tile): void {
    if (tile.out) return;
    setDemo(false);
    setPicked((n) => n + 1);
    setTapped(tile.cls);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => { setTapped(""); }, TAP_MS);
  }

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <ul className={styles.grid} aria-label={GRID_LABEL}>
          {TILES.map((tile) => (
            <li className={styles.cell} key={tile.cls}>
              {/* 버튼이라 Enter·Space 도 click 으로 들어온다 — 키보드 경로를 따로 만들지 않는다 */}
              <button
                type="button"
                className={[styles.tile, styles[tile.cls], tapped === tile.cls ? styles.isTapped : ""].filter(Boolean).join(" ")}
                aria-disabled={tile.out ? "true" : undefined}
                onClick={() => add(tile)}
              >
                {tile.out ? <span className={styles.band} aria-hidden="true"></span> : null}
                <span className={styles.name}>{tile.name}</span>
                <span className={styles.price}>{tile.price}</span>
                {tile.out ? <span className={styles.stamp}>{STAMP}</span> : null}
              </button>
            </li>
          ))}
        </ul>
        <p className={styles.bag} aria-live="polite">{BAG_LABEL.replace("{n}", String(picked))}</p>
      </div>
    </main>
  );
}
