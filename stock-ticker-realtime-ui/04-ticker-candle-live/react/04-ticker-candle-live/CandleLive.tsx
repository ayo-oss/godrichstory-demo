// CandleLive — vanilla 판(run/296/demo/04-ticker-candle-live/index.html) 의 React 포트.
// 확정된 봉 11개는 값이 굳어 서 있고, 맨 오른쪽 아직 안 끝난 봉 하나만 새 값이 들어올 때마다 늘어난다.
// 주기가 끝나면 그 봉이 확정되고 차트가 한 칸 왼쪽으로 밀린다.
// 289(SVG 그래프 그리기)와 갈리는 지점: 289 는 정적 데이터를 한 번에 그리고, 여기는 마지막 한 봉이
// 그 자리에서 실시간으로 늘어난다.
import { useEffect, useRef, useState } from "react";
import styles from "./CandleLive.module.scss";

export type CandleLiveProps = {
  /** 격자 미리보기용 2초 자동 루프. 포인터를 올리거나 키보드로 들어오면 꺼지고 실제 갱신이 시작된다 */
  demo?: boolean;
  /** 시드 — 같은 값이면 누가 열어도 같은 시세 흐름이 재현된다 */
  seed?: number;
  /** 갱신 간격(ms). 값만 바뀌고 깜빡이지 않으므로 WCAG 2.3.1 의 초당 3회 제한과 무관하다 */
  stepMs?: number;
};

type Box<T> = { current: T };
/** 한 봉은 네 값을 쥔다: 여는 값 o, 그 주기의 최고 h, 최저 l, 닫는 값 c */
type Bar = { o: number; h: number; l: number; c: number };

const VISIBLE = 12;            // 화면에 서 있는 봉 수 (마지막 하나가 아직 안 끝난 봉)
const TICKS = 10;              // 한 봉이 끝날 때까지의 갱신 횟수
const LIVE = VISIBLE - 1;
const LABEL = "{n}번째 봉";
const START = 64200;

/** 시드 PRNG — 외부 API·키가 필요 없고 심볼도 실존 종목이 아니다 */
function mulberry32(a: number) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/** 새 값 하나를 붙인 봉을 돌려준다 — React 는 상태를 갈아 끼우므로 원본을 고치지 않는다 */
function grow(b: Bar, rand: () => number): Bar {
  let step = Math.round((rand() - 0.47) * b.o * 0.0018);
  if (step === 0) { step = rand() < 0.5 ? -1 : 1; }
  const c = b.c + step;
  return { o: b.o, h: Math.max(b.h, c), l: Math.min(b.l, c), c };
}

function nextBar(open: number): Bar {
  return {
    o: open,
    h: open + Math.round(open * 0.0008),
    l: open - Math.round(open * 0.0004),
    c: open + Math.round(open * 0.0006),
  };
}

function initial(rand: () => number): { bars: Bar[]; pending: Bar } {
  const bars: Bar[] = [];
  let seedPrice = START;
  for (let i = 0; i < VISIBLE; i += 1) {
    let b: Bar = { o: seedPrice, h: seedPrice, l: seedPrice, c: seedPrice };
    for (let s = 0; s < TICKS; s += 1) { b = grow(b, rand); }
    bars.push(b);
    seedPrice = b.c;
  }
  // 미리보기 첫 장면은 오르는 봉이어야 "어느 쪽으로 자라는가" 가 한눈에 읽힌다 — 마지막 봉만 위로 맞춘다
  const last = bars[LIVE];
  const c = last.c <= last.o ? last.o + Math.max(2, Math.round(last.o * 0.0018)) : last.c;
  bars[LIVE] = {
    o: last.o,
    h: Math.max(last.h, c + Math.round(last.o * 0.0006)),
    l: Math.min(last.l, last.o - Math.round(last.o * 0.0005)),
    c,
  };
  return { bars, pending: nextBar(bars[LIVE].c) };
}

const money = (n: number) => n.toLocaleString("en-US");
const arrow = (v: number) => (v >= 0 ? "▲" : "▼");

export default function CandleLive({ demo = true, seed = 296, stepMs = 260 }: CandleLiveProps) {
  const randRef: Box<(() => number) | null> = useRef(null);
  if (randRef.current === null) { randRef.current = mulberry32(seed); }
  const rand = randRef.current as () => number;

  const [chart, setChart] = useState(() => initial(rand));
  const [live, setLive] = useState(!demo);
  const [tipIdx, setTipIdx] = useState(LIVE);
  const [tipX, setTipX] = useState(-1);
  const leftTicks = useRef(TICKS) as Box<number>;
  const rootRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!live) { return; }
    const id = window.setInterval(() => {
      // 탭이 안 보이는 동안은 세지 않는다 — 돌아왔을 때 밀린 갱신이 한꺼번에 터지지 않게
      if (document.visibilityState === "hidden") { return; }
      setChart((old) => {
        const bars = old.bars.slice();
        bars[LIVE] = grow(bars[LIVE], rand);
        leftTicks.current -= 1;
        if (leftTicks.current > 0) { return { bars, pending: old.pending }; }
        // 주기가 끝났다 — 맨 왼쪽 봉을 버리고 한 칸 밀린 자리에 새 봉을 세운다. 실사용에서도 이 교체는
        // 중간 장면 없이 한 번에 바뀐다(미리보기의 steps(1, end) 컷과 같은 순간)
        bars.shift();
        bars.push(old.pending);
        leftTicks.current = TICKS;
        return { bars, pending: nextBar(bars[LIVE].c) };
      });
    }, stepMs);
    return () => window.clearInterval(id);
  }, [live, stepMs, rand]);

  // 툴팁은 절대 배치라 부모 높이 계산에서 빠진다 — 뿌리에 padding-bottom 으로 자리를 비워 두고(BD8·BD9),
  // 가로로는 뿌리 안에 들어오도록 반 폭만큼 잘라 준다
  useEffect(() => {
    const place = () => {
      const root = rootRef.current, plot = plotRef.current, tip = tipRef.current;
      if (!root || !plot || !tip) { return; }
      const rr = root.getBoundingClientRect(), pr = plot.getBoundingClientRect();
      const half = tip.offsetWidth / 2;
      const x = pr.left - rr.left + (tipIdx + 0.5) / VISIBLE * pr.width;
      setTipX(Math.min(Math.max(x, half), rr.width - half));
    };
    place();
    // left 는 px 로 박히므로 폭이 바뀌면 다시 재야 한다 — 안 하면 폰 폭에서 판 밖으로 삐져나간다
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [tipIdx]);

  const all = chart.bars.concat([chart.pending]);
  let hi = -Infinity, lo = Infinity;
  all.forEach((b) => { if (b.h > hi) { hi = b.h; } if (b.l < lo) { lo = b.l; } });
  const pad = (hi - lo) * 0.12 || 1;
  hi += pad; lo -= pad;
  // 값 → 판 위에서 위에서부터의 % (판은 비쌀수록 위)
  const y = (p: number) => (hi - p) / (hi - lo) * 100;

  const shown = chart.bars[LIVE];
  const tipBar = tipIdx >= VISIBLE ? chart.pending : chart.bars[tipIdx];
  const rootCls = [styles.root, live ? "" : styles.isDemo].filter(Boolean).join(" ");

  return (
    <div
      className={rootCls}
      ref={rootRef}
      onPointerMove={() => setLive(true)}
      onPointerDown={() => setLive(true)}
      onFocus={() => setLive(true)}
    >
      <div className={styles.board}>
        <div className={styles.head}>
          <p className={styles.name}>
            <span className={styles.sym}>NOVA</span><span className={styles.unit}>분봉</span>
          </p>
          <span className={`${styles.now} ${shown.c >= shown.o ? styles.nowUp : styles.nowDown}`}>
            {arrow(shown.c - shown.o)} {money(shown.c)}
          </span>
        </div>
        <div className={styles.plot} ref={plotRef}>
          {/* 칸 13개 = 화면에 12개 + 오른쪽에 대기 1개. 대기 칸은 확정 컷 뒤에 밀려 들어온다 */}
          <div className={styles.track}>
            {all.map((b, i) => {
              const up = b.c >= b.o;
              const cls = [
                styles.slot,
                i === LIVE ? styles.slotLive : "",
                i === VISIBLE ? styles.slotNext : "",
              ].filter(Boolean).join(" ");
              return (
                <button
                  key={i}
                  type="button"
                  className={cls}
                  aria-label={LABEL.replace("{n}", String(i + 1))}
                  onPointerEnter={() => setTipIdx(i)}
                  onFocus={() => setTipIdx(i)}
                >
                  {i >= LIVE ? <span className={styles.tag} aria-hidden="true">▲</span> : null}
                  <span
                    className={`${styles.wick} ${styles.wickUp}`}
                    style={{ top: y(b.h) + "%", height: Math.max(0, y(b.o) - y(b.h)) + "%" }}
                  />
                  <span
                    className={`${styles.wick} ${styles.wickDn}`}
                    style={{ top: y(b.o) + "%", height: Math.max(0, y(b.l) - y(b.o)) + "%" }}
                  />
                  <span
                    className={`${styles.body} ${up ? styles.bodyUp : styles.bodyDown}`}
                    style={{
                      top: (up ? y(b.c) : y(b.o)) + "%",
                      height: Math.max(1.4, up ? y(b.o) - y(b.c) : y(b.c) - y(b.o)) + "%",
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className={styles.tip} ref={tipRef} style={tipX < 0 ? undefined : { left: tipX + "px" }}>
        <span className={styles.tipRow}><span className={styles.tipK}>시가</span><span className={styles.tipV}>{money(tipBar.o)}</span></span>
        <span className={styles.tipRow}><span className={styles.tipK}>고가</span><span className={styles.tipV}>{money(tipBar.h)}</span></span>
        <span className={styles.tipRow}><span className={styles.tipK}>저가</span><span className={styles.tipV}>{money(tipBar.l)}</span></span>
        <span className={styles.tipRow}><span className={styles.tipK}>종가</span><span className={styles.tipV}>{money(tipBar.c)}</span></span>
      </div>
    </div>
  );
}
