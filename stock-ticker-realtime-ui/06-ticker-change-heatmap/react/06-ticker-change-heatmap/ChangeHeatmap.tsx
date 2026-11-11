// ChangeHeatmap — vanilla 판(run/296/demo/06-ticker-change-heatmap/index.html) 의 React 포트.
// 균등 격자(4×3) 히트맵. 타일마다 --chg 를 자기 자신에 올리고, 등록한 커스텀 속성이라
// 색이 컷으로 튀지 않고 이어서 흐른다. 방향은 색만으로 전하지 않고 ▲▼ 와 +/− 부호를 같이 적는다.
import { useEffect, useRef, useState } from "react";
import styles from "./ChangeHeatmap.module.scss";

export type ChangeHeatmapProps = {
  /** 격자 미리보기용 2초 자동 루프. 포인터를 올리거나 키보드로 들어오면 꺼지고 실제 갱신이 시작된다 */
  demo?: boolean;
  /** 시드 — 같은 값이면 누가 열어도 같은 등락 흐름이 재현된다 */
  seed?: number;
  /** 갱신 간격(ms). WCAG 2.3.1 은 초당 3회 미만을 요구한다 */
  intervalMs?: number;
};

type Box<T> = { current: T };
type Tile = { sym: string; va: number; vb: number; group: number; chg: number };

// 가짜 심볼 — 실존 종목·거래소 이름이 아니다. va 는 지금 값, vb 는 미리보기가 오가는 다음 값
const SEEDS: Array<[string, number, number]> = [
  ["NOVA", 2.41, 3.87], ["ORBIT", -1.32, 0.94], ["LUMEN", 4.05, 2.16], ["KEEL", -3.28, -4.41],
  ["AXIOM", 0.62, -1.85], ["VERDE", -2.17, -0.43], ["PIER", 3.36, 1.02], ["HALON", -4.12, -2.58],
  ["CIRRUS", 1.74, 4.28], ["TALUS", -0.85, 2.33], ["MERID", 2.90, 0.17], ["ZENIT", -1.96, -3.74],
];

/** 시드 PRNG — 외부 API·키가 필요 없다 */
function mulberry32(a: number) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// 방향을 색만으로 전하지 않는다 — 화살표와 부호를 숫자 옆에 같이 적는다
const arrow = (v: number) => (v >= 0 ? "▲" : "▼");
const pct = (v: number) => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2) + "%";

function initialTiles(): Tile[] {
  // 대각선 세 파도 — (행 + 열) % 3 이 같은 타일끼리 한 파도로 묶인다
  return SEEDS.map(([sym, va, vb], i) => ({
    sym, va, vb, group: (Math.floor(i / 4) + (i % 4)) % 3, chg: va,
  }));
}

export default function ChangeHeatmap({ demo = true, seed = 2966, intervalMs = 850 }: ChangeHeatmapProps) {
  const randRef: Box<(() => number) | null> = useRef(null);
  if (randRef.current === null) { randRef.current = mulberry32(seed); }
  const [tiles, setTiles] = useState<Tile[]>(initialTiles);
  const [live, setLive] = useState(!demo);
  const cursor = useRef(0) as Box<number>;

  useEffect(() => {
    if (!live) { return; }
    const id = window.setInterval(() => {
      // 탭이 안 보이는 동안은 세지 않는다 — 돌아왔을 때 밀린 갱신이 한꺼번에 터지지 않게
      if (document.visibilityState === "hidden") { return; }
      const at = cursor.current;
      cursor.current = (at + 1) % SEEDS.length;
      setTiles((old) => old.map((t, i) => {
        // 한 번에 타일 세 개만 굴린다 — 한 타일이 초당 0.3회 바뀌어 WCAG 2.3.1 아래다
        const hit = [0, 1, 2].some((k) => (at + k * 5) % SEEDS.length === i);
        if (!hit) { return t; }
        const rand = randRef.current as () => number;
        // 등락률은 -4.6 ~ +4.6 안에서 걷는다. 흔들림 폭(4.2)과 되돌리는 힘(0.22)이 균형을 이뤄
        // 값이 0 근처로 주저앉지도, 한쪽 끝에 붙어 살지도 않는다
        let next = t.chg + (rand() - 0.5) * 4.2 - t.chg * 0.22;
        if (next > 4.6) { next = 4.6; }
        if (next < -4.6) { next = -4.6; }
        return { ...t, chg: next };
      }));
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [live, intervalMs]);

  const rootCls = [styles.root, live ? "" : styles.isDemo].filter(Boolean).join(" ");
  return (
    <div
      className={rootCls}
      onPointerMove={() => setLive(true)}
      onPointerDown={() => setLive(true)}
      onFocus={() => setLive(true)}
    >
      <div className={styles.board}>
        <div className={styles.head}>
          <p className={styles.title}>전 종목 등락률</p>
          <span className={styles.liveTag}>실시간</span>
        </div>
        {/* 균등 격자 4×3. 트리맵이 아니라 칸 크기가 전부 같다 — 크기는 정보를 안 나르고 색만 나른다 */}
        <ul className={styles.grid}>
          {tiles.map((t) => (
            <li
              key={t.sym}
              className={styles.tile}
              data-g={t.group}
              /* --chg 는 타일 자신에 올린다. @property 를 inherits: false 로 등록했으므로
                 부모(격자)에 걸면 타일이 못 읽는다 — 262-08 에서 같은 함정을 실측했다 */
              style={live
                ? { "--va": t.va, "--vb": t.vb, "--chg": t.chg.toFixed(2) }
                : { "--va": t.va, "--vb": t.vb }}
            >
              <span className={styles.sym}>{t.sym}</span>
              <span className={styles.val}>
                {/* 지금 값·다음 값 두 장을 같은 칸에 겹친다 — 컷 교체라 폭이 달라도 자리가 안 흔들린다 */}
                <span className={`${styles.chg} ${styles.chgA}`}>{arrow(t.chg)} {pct(t.chg)}</span>
                <span className={`${styles.chg} ${styles.chgB}`}>{arrow(t.vb)} {pct(t.vb)}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
