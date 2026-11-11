// CategoryRailVertical — vanilla 판(run/298/demo/03-kiosk-category-rail-vertical/index.html) 의 React 포트.
// 세로 카테고리 레일. 고른 칸은 data-sel 한 곳으로 표시하고, 선택 블록의 위치와 오른쪽 패널은
// 그 값 하나를 보고 CSS 가 그린다 (미리보기 루프 .isDemo 는 같은 자리를 키프레임으로 돌린다).
// 레일은 role="tablist" aria-orientation="vertical" 이라 위아래 화살표가 표준 조작이다.
// 키 핸들러는 vanilla 가 레일 통째에 걸었지만 여기서는 칸마다 건다 — 초점이 있는 칸이 곧 이벤트의
// 주인이라 같은 동작이고, target 에서 자리를 되찾을 필요가 없다. 값·수치는 vanilla 와 같다.
import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CategoryRailVertical.module.scss";

export type CategoryRailVerticalProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};
// ambient 타입에는 React 이벤트 제네릭이 없다 — 키 핸들러가 실제로 쓰는 것만 지역 타입으로 적는다
type KeyEvt = { key: string; preventDefault(): void };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
type Tab = { label: string; bg: string; fg: string };
type Row = { menu: string; price: string };

// CSS 모듈은 규칙이 없는 이름을 undefined 로 돌려준다 — vanilla 에서 스타일이 안 붙은 이름
// (.kr__label · .kr__menu 는 규칙 없이 의미만 나른다)까지 구조 그대로 옮기려고 빈 값을 걸러 낸다
function cx(...names: (string | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}

const RAIL_LABEL = "메뉴 분류";

const TABS: Tab[] = [
  {
    label: "커피",
    bg: "M208,88v48a88,88,0,0,1-51.3,80H83.3A88,88,0,0,1,32,136V88Z",
    fg: "M80,56V24a8,8,0,0,1,16,0V56a8,8,0,0,1-16,0Zm40,8a8,8,0,0,0,8-8V24a8,8,0,0,0-16,0V56A8,8,0,0,0,120,64Zm32,0a8,8,0,0,0,8-8V24a8,8,0,0,0-16,0V56A8,8,0,0,0,152,64Zm96,56v8a40,40,0,0,1-37.51,39.91,96.59,96.59,0,0,1-27,40.09H208a8,8,0,0,1,0,16H32a8,8,0,0,1,0-16H56.54A96.3,96.3,0,0,1,24,136V88a8,8,0,0,1,8-8H208A40,40,0,0,1,248,120ZM200,96H40v40a80.27,80.27,0,0,0,45.12,72h69.76A80.27,80.27,0,0,0,200,136Zm32,24a24,24,0,0,0-16-22.62V136a95.78,95.78,0,0,1-1.2,15A24,24,0,0,0,232,128Z",
  },
  {
    label: "차",
    bg: "M160,122.22V216a8,8,0,0,1-8,8H56a8,8,0,0,1-8-8V122.22a8,8,0,0,1,1.14-4.12L69.67,83.88A8,8,0,0,1,76.53,80h54.94a8,8,0,0,1,6.86,3.88l20.53,34.22A8,8,0,0,1,160,122.22Z",
    fg: "M224,160a16,16,0,0,1-16-16V64A56,56,0,0,0,96,64v8H76.53a16.09,16.09,0,0,0-13.72,7.77L42.28,114A16.06,16.06,0,0,0,40,122.22V216a16,16,0,0,0,16,16h96a16,16,0,0,0,16-16V122.22a16.06,16.06,0,0,0-2.28-8.24L145.19,79.77A16.09,16.09,0,0,0,131.47,72H112V64a40,40,0,0,1,80,0v80a32,32,0,0,0,32,32,8,8,0,0,0,0-16ZM131.47,88,152,122.22V216H56V122.22L76.53,88H96v48a8,8,0,0,0,16,0V88Z",
  },
  {
    label: "디저트",
    bg: "M216,120a16,16,0,0,1-16,16H56a16,16,0,0,1,0-32V96a72,72,0,0,1,144,0v8A16,16,0,0,1,216,120Z",
    fg: "M208,97.37V96A80,80,0,0,0,48,96v1.37A24,24,0,0,0,56,144h3.29l54.82,95.94a16,16,0,0,0,27.78,0L196.71,144H200a24,24,0,0,0,8-46.63ZM77.71,144H97.07l40.61,71.06L128,232Zm57.08,0,21.75,38.06-9.65,16.88L115.5,144Zm31,21.94L153.21,144h25.08ZM200,128H56a8,8,0,0,1,0-16,8,8,0,0,0,8-8V96a64,64,0,0,1,128,0v8a8,8,0,0,0,8,8,8,8,0,0,1,0,16Z",
  },
  {
    label: "세트",
    bg: "M232,88,216.93,201.06A8,8,0,0,1,209,208H47a8,8,0,0,1-7.93-6.94L24,88Z",
    fg: "M136,120v56a8,8,0,0,1-16,0V120a8,8,0,0,1,16,0Zm36.84-.8-5.6,56A8,8,0,0,0,174.4,184a7.32,7.32,0,0,0,.81,0,8,8,0,0,0,7.95-7.2l5.6-56a8,8,0,0,0-15.92-1.6Zm-89.68,0a8,8,0,0,0-15.92,1.6l5.6,56a8,8,0,0,0,8,7.2,7.32,7.32,0,0,0,.81,0,8,8,0,0,0,7.16-8.76ZM239.93,89.06,224.86,202.12A16.06,16.06,0,0,1,209,216H47a16.06,16.06,0,0,1-15.86-13.88L16.07,89.06A8,8,0,0,1,24,80H68.37L122,18.73a8,8,0,0,1,12,0L187.63,80H232a8,8,0,0,1,7.93,9.06ZM89.63,80h76.74L128,36.15ZM222.86,96H33.14L47,200H209Z",
  },
];

const PANELS: Row[][] = [
  [
    { menu: "아메리카노", price: "3,000원" },
    { menu: "카페라떼", price: "4,000원" },
    { menu: "콜드브루", price: "4,500원" },
  ],
  [
    { menu: "유자차", price: "4,800원" },
    { menu: "캐모마일", price: "4,500원" },
    { menu: "아이스티", price: "3,500원" },
  ],
  [
    { menu: "치즈케이크", price: "5,500원" },
    { menu: "마카롱", price: "2,500원" },
    { menu: "브라우니", price: "4,200원" },
  ],
  [
    { menu: "모닝 세트", price: "6,500원" },
    { menu: "오후 세트", price: "7,500원" },
    { menu: "나눔 세트", price: "12,000원" },
  ],
];

const PANEL_CLS: string[] = ["panel1", "panel2", "panel3", "panel4"];

export default function CategoryRailVertical({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#17141a",
}: CategoryRailVerticalProps) {
  const tabsRef = useRef<HTMLButtonElement[]>([]) as Box<HTMLButtonElement[]>;
  const [sel, setSel] = useState(0);
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 로빙 탭인덱스 — 레일 전체가 Tab 한 번에 들어오고, 안에서는 화살표로 옮긴다.
  // 선택된 칸만 tabindex="0" 이라 그 처리는 아래 JSX 의 tabIndex 한 줄이 맡는다
  function select(idx: number, moveFocus: boolean): void {
    setDemo(false);
    setSel(idx);
    const target = tabsRef.current[idx];
    if (moveFocus && target) { target.focus({ preventScroll: true }); }
  }

  function onTabKey(event: KeyEvt, at: number): void {
    let to = at;
    if (event.key === "ArrowDown") { to = (at + 1) % TABS.length; }
    else if (event.key === "ArrowUp") { to = (at - 1 + TABS.length) % TABS.length; }
    else if (event.key === "Home") { to = 0; }
    else if (event.key === "End") { to = TABS.length - 1; }
    else { return; }
    event.preventDefault();
    select(to, true);
  }

  const cls = cx(styles.root, demo ? styles.isDemo : "");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars} data-sel={String(sel + 1)}>
        <div className={styles.rail}>
          <span className={styles.mark} aria-hidden="true"></span>
          <div className={styles.tabs} role="tablist" aria-orientation="vertical" aria-label={RAIL_LABEL}>
            {TABS.map((tab, i) => (
              <button
                key={tab.label}
                type="button"
                role="tab"
                className={styles.tab}
                id={`krTab${i + 1}`}
                aria-selected={sel === i ? "true" : "false"}
                aria-controls={`krPanel${i + 1}`}
                tabIndex={sel === i ? 0 : -1}
                ref={(el: HTMLButtonElement | null) => { if (el) { tabsRef.current[i] = el; } }}
                onClick={() => select(i, false)}
                onKeyDown={(event: KeyEvt) => onTabKey(event, i)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true">
                  <path d={tab.bg} opacity="0.2"/>
                  <path d={tab.fg}/>
                </svg>
                <span className={cx(styles.label)}>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className={styles.panels}>
          {PANELS.map((rows, i) => (
            <div
              key={PANEL_CLS[i]}
              className={cx(styles.panel, styles[PANEL_CLS[i]])}
              role="tabpanel"
              id={`krPanel${i + 1}`}
              aria-labelledby={`krTab${i + 1}`}
              tabIndex={0}
            >
              {rows.map((row) => (
                <p key={row.menu} className={styles.row}>
                  <span className={cx(styles.menu)}>{row.menu}</span>
                  <b className={styles.price}>{row.price}</b>
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
