// ChartTreemapSquarify — vanilla 판(run/289/demo/08-chart-draw-treemap-squarify/index.html) 의 React 포트.
// 카테고리 매출을 간이 squarified 이진 분할로 정사각에 가깝게 배치하는 트리맵.
// 사람이 포인터를 올리면 미리보기 루프(.isDemo)가 떨어지고 칸이 밝아지며 툴팁이 뜬다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ChartTreemapSquarify.module.scss";

export type ChartTreemapSquarifyProps = {
  /** 격자 미리보기용 2초 자동 루프. 사람이 포인터를 올리면 꺼진다 */
  demo?: boolean;
};

type PtrEvt = { target: Element | null };
type Vars = CSSProperties & { "--d"?: string };

const ITEMS = [
  { name: "상의", v: 26 }, { name: "하의", v: 18 }, { name: "신발", v: 14 }, { name: "가방", v: 11 },
  { name: "모자", v: 10 }, { name: "액세서리", v: 9 }, { name: "양말", v: 7 }, { name: "기타", v: 5 }
];
const VW = 440, VH = 216;

type Cell = { item: { name: string; v: number }; x: number; y: number; w: number; h: number };

/** 간이 squarified 이진 분할 — 값 내림차순 목록을 남은 영역에서 절반 무게에 가장 가까운 지점으로 나누고
 *  종횡비가 1 에 가까워지는 방향(가로/세로)으로 재귀한다. 완전한 squarify 는 아니지만 정사각 비율이 잘 나온다 */
function split(items: { name: string; v: number }[], x: number, y: number, w: number, h: number, out: Cell[]): void {
  if (!items.length) return;
  if (items.length === 1) { out.push({ item: items[0], x, y, w, h }); return; }
  let total = 0;
  for (const it of items) total += it.v;
  const half = total / 2;
  let acc = 0, i = 0;
  while (i < items.length - 1 && Math.abs(acc + items[i].v - half) < Math.abs(acc - half)) { acc += items[i].v; i++; }
  const ratio = acc / total;
  if (w >= h) {
    split(items.slice(0, i), x, y, w * ratio, h, out);
    split(items.slice(i), x + w * ratio, y, w * (1 - ratio), h, out);
  } else {
    split(items.slice(0, i), x, y, w, h * ratio, out);
    split(items.slice(i), x, y + h * ratio, w, h * (1 - ratio), out);
  }
}

const LAID: Cell[] = [];
split(ITEMS, 2, 2, 436, 212, LAID);   // 2px 여백을 두고 채운다

export default function ChartTreemapSquarify({ demo = true }: ChartTreemapSquarifyProps) {
  const [live, setLive] = useState(!demo);
  const [hot, setHot] = useState<number | null>(null);

  /** pointermove — 칸 rect 위에서 그 칸의 이름과 비중을 보여 준다.
   *  CSS 모듈이라 칸의 클래스는 해시값 — data-i 로 칸을 찾는다 */
  function onMove(e: PtrEvt) {
    const t = e.target as Element | null;
    const rect = t && t.tagName === "rect" ? t : (t ? t.closest("rect") : null);
    if (!rect) { setHot(null); return; }
    setLive(true);   // live 를 켜야 .isDemo 루프가 떨어진다 (live=false 가 미리보기 상태다)
    setHot(Number(rect.getAttribute("data-i")));
  }

  const shown = hot == null || hot < 0 ? 0 : hot;
  const cell = LAID[shown];
  const rootCls = [styles.root, live ? "" : styles.isDemo].filter(Boolean).join(" ");
  return (
    <div className={rootCls}>
      <div className={styles.card}>
        <div className={styles.head}>
          <p className={styles.title}>카테고리 매출 구성</p>
          <span className={styles.chip}>지난 30일</span>
        </div>
        <div className={styles.plot}>
          <svg
            className={styles.svg} viewBox={"0 0 " + VW + " " + VH} role="img"
            aria-label="카테고리 매출 트리맵, 상의 26%가 가장 크고 다음은 하의 18%"
            onPointerMove={onMove}
            onPointerLeave={() => setHot(null)}
          >
            {LAID.map((c, idx) => (
              <g key={c.item.name} className={styles.group} style={{ "--d": (idx * 0.09) + "s" } as Vars}>
                <rect
                  className={[styles.cell, idx % 4 === 0 ? styles.cellC1 : idx % 4 === 1 ? styles.cellC2 : idx % 4 === 2 ? styles.cellC3 : styles.cellC4,
                    hot === idx ? styles.cellHot : ""].filter(Boolean).join(" ")}
                  x={c.x} y={c.y} width={c.w} height={c.h} rx={8} data-i={idx}
                />
                {/* 라벨은 면적이 충분한 칸에만 — 작은 칸은 툴팁과 표가 값을 갖고 있다 */}
                {c.w * c.h > 1500 ? (
                  <>
                    <text className={styles.name} x={c.x + 10} y={c.y + 26}>{c.item.name}</text>
                    <text className={styles.num} x={c.x + 10} y={c.y + 48}>{c.item.v}%</text>
                  </>
                ) : null}
              </g>
            ))}
          </svg>
          {/* 툴팁 — 칸의 viewBox 중심 위에 뜬다 */}
          <div
            className={[styles.tip, hot == null ? "" : styles.tipIsOn].filter(Boolean).join(" ")}
            aria-hidden="true"
            style={{ left: ((cell.x + cell.w / 2) / VW * 100) + "%", top: ((cell.y / VH) * 100) + "%" }}
          >
            <strong>{cell.item.name}</strong><span>{cell.item.v}%</span>
          </div>
          {/* 스크린리더용 데이터 표 — 화면에 안 보인다 */}
          <table className={styles.sr}>
            <caption>카테고리 매출 구성</caption>
            <thead><tr><th scope="col">카테고리</th><th scope="col">비중</th></tr></thead>
            <tbody>
              {ITEMS.map((it) => (
                <tr key={it.name}><th scope="row">{it.name}</th><td>{it.v}%</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
