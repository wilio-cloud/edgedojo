import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  IChartApi,
  ISeriesApi,
  Logical,
  UTCTimestamp,
  createChart,
} from 'lightweight-charts';
import {
  Candle,
  OrderSetup,
  RadarChoice,
  TacticalAnnotation,
} from '../../engine/types';
import { OrderMetrics } from '../../engine/tradeSimulator';

interface TacticalChartProps {
  candles: Candle[];
  decisionBoundaryIndex?: number; // Separates historical context from revealed future
  annotations?: TacticalAnnotation[];
  showAnnotations?: boolean;
  isHtfView?: boolean;

  // Execution / Replay order box
  order?: OrderSetup | null;
  orderMetrics?: OrderMetrics | null;
  orderInteractive?: boolean;
  allowEntryDrag?: boolean;
  onOrderChange?: (updated: OrderSetup) => void;

  // Management live SL line
  activeManagedStopLoss?: number | null;

  // Radar interactive anchors & price tap
  radarChoices?: RadarChoice[];
  selectedRadarChoiceId?: string | null;
  onSelectRadarChoice?: (choiceId: string) => void;
  allowPriceTap?: boolean;
  tappedPrice?: number | null;
  onTapPrice?: (price: number) => void;
}

interface OverlayGeometry {
  width: number;
  height: number;
  decisionX: number | null;
  orderCoords: {
    entryY: number | null;
    slY: number | null;
    tpY: number | null;
    boxLeftX: number;
    boxRightX: number;
  } | null;
  managedSlY: number | null;
  tappedY: number | null;
  annotationBoxes: {
    ann: TacticalAnnotation;
    x1: number;
    x2: number;
    yTop: number;
    yBottom: number;
  }[];
  radarBadges: {
    choice: RadarChoice;
    x: number;
    y: number;
  }[];
}

function formatPriceSmart(p: number): string {
  if (Math.abs(p) < 5) return p.toFixed(4);
  if (Math.abs(p) < 50) return p.toFixed(3);
  return p.toFixed(2);
}

export const TacticalChart: React.FC<TacticalChartProps> = ({
  candles,
  decisionBoundaryIndex,
  annotations = [],
  showAnnotations = false,
  isHtfView = false,
  order,
  orderMetrics,
  orderInteractive = false,
  allowEntryDrag = false,
  onOrderChange,
  activeManagedStopLoss,
  radarChoices = [],
  selectedRadarChoiceId,
  onSelectRadarChoice,
  allowPriceTap = false,
  tappedPrice,
  onTapPrice,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const [draggingHandle, setDraggingHandle] = useState<
    'ENTRY' | 'SL' | 'TP' | null
  >(null);
  const [geom, setGeom] = useState<OverlayGeometry>({
    width: 0,
    height: 0,
    decisionX: null,
    orderCoords: null,
    managedSlY: null,
    tappedY: null,
    annotationBoxes: [],
    radarBadges: [],
  });

  // Keep latest props in refs for smooth rAF geometry sync
  const latestPropsRef = useRef({
    candles,
    decisionBoundaryIndex,
    annotations,
    showAnnotations,
    isHtfView,
    order,
    activeManagedStopLoss,
    radarChoices,
    tappedPrice,
  });
  latestPropsRef.current = {
    candles,
    decisionBoundaryIndex,
    annotations,
    showAnnotations,
    isHtfView,
    order,
    activeManagedStopLoss,
    radarChoices,
    tappedPrice,
  };

  const syncOverlayGeometry = useCallback(() => {
    const chart = chartRef.current;
    const series = candleSeriesRef.current;
    const container = containerRef.current;
    if (!chart || !series || !container) return;

    const p = latestPropsRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const priceScaleWidth = 58;
    const usableRight = Math.max(80, width - priceScaleWidth);

    const clampX = (x: number | null, fallback: number) =>
      x === null ? fallback : Math.max(0, Math.min(usableRight, x));

    let decisionX: number | null = null;
    if (
      !p.isHtfView &&
      p.decisionBoundaryIndex !== undefined &&
      p.decisionBoundaryIndex > 0 &&
      p.decisionBoundaryIndex < p.candles.length
    ) {
      const coord = chart
        .timeScale()
        .logicalToCoordinate((p.decisionBoundaryIndex - 0.5) as Logical);
      if (coord !== null) decisionX = coord;
    }

    let orderCoords: OverlayGeometry['orderCoords'] = null;
    if (p.order) {
      const entryY = series.priceToCoordinate(p.order.entry);
      const slY = series.priceToCoordinate(p.order.stopLoss);
      const tpY = series.priceToCoordinate(p.order.takeProfit);
      const anchorLogical =
        p.decisionBoundaryIndex !== undefined
          ? p.decisionBoundaryIndex - 1
          : p.candles.length - 1;
      const anchorX = chart
        .timeScale()
        .logicalToCoordinate(anchorLogical as Logical);
      const boxLeftX =
        anchorX !== null
          ? Math.max(24, Math.min(usableRight - 130, anchorX))
          : Math.max(30, usableRight - 175);
      orderCoords = {
        entryY,
        slY,
        tpY,
        boxLeftX,
        boxRightX: usableRight,
      };
    }

    const managedSlY =
      p.activeManagedStopLoss != null
        ? series.priceToCoordinate(p.activeManagedStopLoss)
        : null;

    const tappedY =
      p.tappedPrice != null ? series.priceToCoordinate(p.tappedPrice) : null;

    const annotationBoxes: OverlayGeometry['annotationBoxes'] = [];
    if (p.showAnnotations && !p.isHtfView) {
      for (const ann of p.annotations) {
        const yTop = series.priceToCoordinate(ann.priceTop);
        const yBottom =
          ann.priceBottom !== undefined
            ? series.priceToCoordinate(ann.priceBottom)
            : yTop;
        if (yTop === null || yBottom === null) continue;
        const rawX1 = chart
          .timeScale()
          .logicalToCoordinate(ann.startIndex as Logical);
        const rawX2 = chart
          .timeScale()
          .logicalToCoordinate(ann.endIndex as Logical);
        const x1 = clampX(rawX1, 16);
        const x2 = clampX(rawX2, usableRight - 8);
        annotationBoxes.push({
          ann,
          x1: Math.min(x1, x2),
          x2: Math.max(x1 + 24, x2),
          yTop: Math.min(yTop, yBottom),
          yBottom: Math.max(yTop, yBottom),
        });
      }
    }

    const radarBadges: OverlayGeometry['radarBadges'] = [];
    if (!p.isHtfView && p.radarChoices.length > 0) {
      for (const ch of p.radarChoices) {
        if (!ch.chartAnchor) continue;
        const x = chart
          .timeScale()
          .logicalToCoordinate(ch.chartAnchor.candleIndex as Logical);
        const y = series.priceToCoordinate(ch.chartAnchor.price);
        if (x !== null && y !== null && x >= 8 && x <= usableRight) {
          radarBadges.push({ choice: ch, x, y });
        }
      }
    }

    setGeom({
      width,
      height,
      decisionX,
      orderCoords,
      managedSlY,
      tappedY,
      annotationBoxes,
      radarBadges,
    });
  }, []);

  // Initialize Lightweight Charts v5 instance once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: '#070B12' },
        textColor: '#94A3B8',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.35)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.35)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(148, 163, 184, 0.35)',
          labelBackgroundColor: '#1E293B',
        },
        horzLine: {
          color: 'rgba(148, 163, 184, 0.35)',
          labelBackgroundColor: '#1E293B',
        },
      },
      rightPriceScale: {
        borderColor: '#1E293B',
        scaleMargins: { top: 0.1, bottom: 0.18 },
      },
      timeScale: {
        borderColor: '#1E293B',
        rightOffset: 10,
        barSpacing: 8,
        minBarSpacing: 3,
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10B981',
      downColor: '#F43F5E',
      borderUpColor: '#10B981',
      borderDownColor: '#F43F5E',
      wickUpColor: '#34D399',
      wickDownColor: '#FB7185',
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.84, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    let rafId = 0;
    const scheduleSync = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(syncOverlayGeometry);
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(scheduleSync);

    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
      scheduleSync();
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [syncOverlayGeometry]);

  // Update series data when candles change
  const prevCandlesLenRef = useRef(0);
  const prevFirstTimeRef = useRef(0);

  useEffect(() => {
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;
    if (!chart || !candleSeries || !volumeSeries || candles.length === 0) return;

    const pricePrecision =
      candles[0].close < 5 ? 4 : candles[0].close < 50 ? 3 : 2;
    const minMove =
      pricePrecision === 4 ? 0.0001 : pricePrecision === 3 ? 0.001 : 0.01;

    candleSeries.applyOptions({
      priceFormat: { type: 'price', precision: pricePrecision, minMove },
    });

    candleSeries.setData(
      candles.map((c) => ({
        time: c.time as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );

    volumeSeries.setData(
      candles.map((c) => ({
        time: c.time as UTCTimestamp,
        value: c.volume,
        color:
          c.close >= c.open
            ? 'rgba(16, 185, 129, 0.24)'
            : 'rgba(244, 63, 94, 0.24)',
      }))
    );

    const isNewScenario = candles[0].time !== prevFirstTimeRef.current || Math.abs(candles.length - prevCandlesLenRef.current) > 15;
    if (isNewScenario) {
      const visibleBars = Math.min(candles.length, 62);
      chart.timeScale().setVisibleLogicalRange({
        from: Math.max(0, candles.length - visibleBars),
        to: candles.length + 9,
      });
    }

    prevCandlesLenRef.current = candles.length;
    prevFirstTimeRef.current = candles[0].time;

    requestAnimationFrame(syncOverlayGeometry);
  }, [candles, syncOverlayGeometry]);

  // Re-sync overlay whenever order, annotations, or radar states change
  useEffect(() => {
    const id = requestAnimationFrame(syncOverlayGeometry);
    return () => cancelAnimationFrame(id);
  }, [
    order,
    showAnnotations,
    annotations,
    isHtfView,
    activeManagedStopLoss,
    radarChoices,
    tappedPrice,
    syncOverlayGeometry,
  ]);

  // Pointer drag handlers for thumb-friendly SL / TP / Entry handles
  const handlePointerDown = (
    handle: 'ENTRY' | 'SL' | 'TP',
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    if (!orderInteractive || !order || !onOrderChange) return;
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingHandle(handle);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingHandle || !order || !onOrderChange) return;
    const container = containerRef.current;
    const series = candleSeriesRef.current;
    if (!container || !series) return;

    const rect = container.getBoundingClientRect();
    const relY = Math.max(12, Math.min(rect.height - 28, e.clientY - rect.top));
    const rawPrice = series.coordinateToPrice(relY);
    if (rawPrice === null || rawPrice <= 0) return;

    const decimals = order.entry < 5 ? 4 : order.entry < 50 ? 3 : 2;
    const factor = Math.pow(10, decimals);
    const snapped = Math.round(rawPrice * factor) / factor;
    const minGap = 1 / factor;

    if (draggingHandle === 'SL') {
      const clampedSL =
        order.side === 'LONG'
          ? Math.min(snapped, order.entry - minGap * 2)
          : Math.max(snapped, order.entry + minGap * 2);
      onOrderChange({ ...order, stopLoss: clampedSL });
    } else if (draggingHandle === 'TP') {
      const clampedTP =
        order.side === 'LONG'
          ? Math.max(snapped, order.entry + minGap * 2)
          : Math.min(snapped, order.entry - minGap * 2);
      onOrderChange({ ...order, takeProfit: clampedTP });
    } else if (draggingHandle === 'ENTRY' && allowEntryDrag) {
      const clampedEntry =
        order.side === 'LONG'
          ? Math.max(
              order.stopLoss + minGap * 2,
              Math.min(snapped, order.takeProfit - minGap * 2)
            )
          : Math.min(
              order.stopLoss - minGap * 2,
              Math.max(snapped, order.takeProfit + minGap * 2)
            );
      onOrderChange({
        ...order,
        entry: clampedEntry,
        isLimitOrder: true,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingHandle) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
      setDraggingHandle(null);
    }
  };

  // Direct tap on chart for Radar Liquidity Pool targeting
  const handleOverlayClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!allowPriceTap || !onTapPrice) return;
    const container = containerRef.current;
    const series = candleSeriesRef.current;
    if (!container || !series) return;
    const rect = container.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const price = series.coordinateToPrice(y);
    if (price !== null && price > 0) {
      onTapPrice(price);
    }
  };

  const oc = geom.orderCoords;

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-[#070B12]">
      {/* TradingView Lightweight Charts Canvas */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Synchronized SVG Tactical Vector Layer */}
      <svg
        className={`absolute inset-0 w-full h-full ${
          allowPriceTap ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'
        }`}
        onClick={handleOverlayClick}
      >
        {/* Institutional Annotations & X-Ray Zones */}
        {geom.annotationBoxes.map(({ ann, x1, x2, yTop, yBottom }) => {
          const isZone =
            ann.kind === 'SUPPLY_ZONE' ||
            ann.kind === 'DEMAND_ZONE' ||
            (ann.kind === 'SWEEP' && ann.priceBottom !== undefined);
          const stroke =
            ann.tone === 'bull'
              ? '#10B981'
              : ann.tone === 'bear'
                ? '#F43F5E'
                : ann.tone === 'liquidity'
                  ? '#F59E0B'
                  : '#38BDF8';
          const fill =
            ann.tone === 'bull'
              ? 'rgba(16, 185, 129, 0.16)'
              : ann.tone === 'bear'
                ? 'rgba(244, 63, 94, 0.16)'
                : ann.tone === 'liquidity'
                  ? 'rgba(245, 158, 11, 0.15)'
                  : 'rgba(56, 189, 248, 0.12)';

          if (isZone) {
            const boxH = Math.max(8, yBottom - yTop);
            return (
              <g key={ann.id}>
                <rect
                  x={x1}
                  y={yTop}
                  width={Math.max(20, x2 - x1)}
                  height={boxH}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={1.3}
                  rx={3}
                />
                <text
                  x={x1 + 6}
                  y={Math.max(14, yTop - 4)}
                  fill={stroke}
                  fontSize={10.5}
                  fontWeight={700}
                >
                  {ann.label}
                </text>
              </g>
            );
          }

          return (
            <g key={ann.id}>
              <line
                x1={x1}
                y1={yTop}
                x2={x2}
                y2={yTop}
                stroke={stroke}
                strokeWidth={1.6}
                strokeDasharray={
                  ann.kind === 'LIQUIDITY_POOL' ? '5 4' : '3 2'
                }
              />
              <rect
                x={x1 + 4}
                y={Math.max(4, yTop - 16)}
                width={Math.min(220, ann.label.length * 6.2 + 12)}
                height={15}
                rx={3}
                fill="rgba(7, 11, 18, 0.85)"
              />
              <text
                x={x1 + 9}
                y={Math.max(15, yTop - 5)}
                fill={stroke}
                fontSize={10}
                fontWeight={700}
              >
                {ann.label}
              </text>
            </g>
          );
        })}

        {/* Decision Boundary Marker when future candles are playing */}
        {geom.decisionX !== null && (
          <g>
            <line
              x1={geom.decisionX}
              y1={0}
              x2={geom.decisionX}
              y2={geom.height - 24}
              stroke="rgba(56, 189, 248, 0.55)"
              strokeWidth={1.4}
              strokeDasharray="4 4"
            />
            <rect
              x={Math.max(4, geom.decisionX - 38)}
              y={8}
              width={76}
              height={17}
              rx={4}
              fill="#0E1726"
              stroke="rgba(56, 189, 248, 0.5)"
            />
            <text
              x={Math.max(42, geom.decisionX)}
              y={20}
              textAnchor="middle"
              fill="#38BDF8"
              fontSize={9.5}
              fontWeight={700}
            >
              DECISIÓ
            </text>
          </g>
        )}

        {/* Tapped Price Level in Radar Mode */}
        {geom.tappedY !== null && tappedPrice != null && (
          <g>
            <line
              x1={0}
              y1={geom.tappedY}
              x2={geom.width - 58}
              y2={geom.tappedY}
              stroke="#F59E0B"
              strokeWidth={2}
              strokeDasharray="6 4"
            />
            <rect
              x={12}
              y={Math.max(8, geom.tappedY - 11)}
              width={138}
              height={22}
              rx={5}
              fill="#78350F"
              stroke="#F59E0B"
            />
            <text
              x={81}
              y={Math.max(23, geom.tappedY + 4)}
              textAnchor="middle"
              fill="#FEF3C7"
              fontSize={10.5}
              fontWeight={700}
            >
              Nivell: {formatPriceSmart(tappedPrice)}
            </text>
          </g>
        )}

        {/* Active Managed SL Line in Management Mode */}
        {geom.managedSlY !== null && activeManagedStopLoss != null && (
          <g>
            <line
              x1={0}
              y1={geom.managedSlY}
              x2={geom.width - 58}
              y2={geom.managedSlY}
              stroke="#F59E0B"
              strokeWidth={1.8}
              strokeDasharray="5 3"
            />
          </g>
        )}

        {/* Order Position R:R Shaded Regions */}
        {order &&
          oc &&
          oc.entryY !== null &&
          oc.slY !== null &&
          oc.tpY !== null && (
            <g>
              {/* Reward Region (Emerald) */}
              <rect
                x={oc.boxLeftX}
                y={Math.min(oc.entryY, oc.tpY)}
                width={Math.max(40, oc.boxRightX - oc.boxLeftX)}
                height={Math.max(2, Math.abs(oc.tpY - oc.entryY))}
                fill="rgba(16, 185, 129, 0.15)"
                stroke="rgba(16, 185, 129, 0.55)"
                strokeWidth={1}
              />
              {/* Risk Region (Rose) */}
              <rect
                x={oc.boxLeftX}
                y={Math.min(oc.entryY, oc.slY)}
                width={Math.max(40, oc.boxRightX - oc.boxLeftX)}
                height={Math.max(2, Math.abs(oc.slY - oc.entryY))}
                fill="rgba(244, 63, 94, 0.16)"
                stroke="rgba(244, 63, 94, 0.55)"
                strokeWidth={1}
              />
              {/* Entry Line */}
              <line
                x1={oc.boxLeftX}
                y1={oc.entryY}
                x2={oc.boxRightX}
                y2={oc.entryY}
                stroke="#E2E8F0"
                strokeWidth={1.8}
              />
            </g>
          )}
      </svg>

      {/* Interactive Radar Anchor Badges Directly on Chart */}
      {geom.radarBadges.map(({ choice, x, y }) => {
        const isSelected = selectedRadarChoiceId === choice.id;
        return (
          <button
            key={choice.id}
            type="button"
            onClick={() => onSelectRadarChoice?.(choice.id)}
            style={{
              left: `${x}px`,
              top: `${y}px`,
              transform: 'translate(-50%, -50%)',
            }}
            className={`absolute z-20 min-w-[34px] h-[34px] px-2 rounded-full font-bold text-xs flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
              isSelected
                ? 'bg-amber-400 text-slate-950 ring-4 ring-amber-400/40 scale-110'
                : 'bg-slate-900/95 text-amber-300 border-2 border-amber-400/80 hover:scale-105'
            }`}
          >
            {choice.chartAnchor?.badge}
          </button>
        );
      })}

      {/* Thumb-Friendly Draggable Order Handles (TP, ENTRY, SL) */}
      {order && oc && (
        <>
          {/* TAKE PROFIT HANDLE */}
          {oc.tpY !== null && (
            <div
              onPointerDown={(e) => handlePointerDown('TP', e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{
                right: '62px',
                top: `${Math.max(16, Math.min(geom.height - 34, oc.tpY))}px`,
                transform: 'translateY(-50%)',
                touchAction: 'none',
              }}
              className={`absolute z-30 flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-emerald-950/95 border border-emerald-400/80 text-emerald-200 text-xs font-mono shadow-lg ${
                orderInteractive
                  ? 'cursor-ns-resize active:scale-105 active:bg-emerald-900'
                  : 'pointer-events-none opacity-90'
              }`}
            >
              <span className="font-bold text-emerald-400">TP</span>
              <span>{formatPriceSmart(order.takeProfit)}</span>
              {orderInteractive && (
                <span className="text-[10px] text-emerald-400/80 ml-0.5">⇅</span>
              )}
            </div>
          )}

          {/* ENTRY HANDLE */}
          {oc.entryY !== null && (
            <div
              onPointerDown={(e) =>
                allowEntryDrag ? handlePointerDown('ENTRY', e) : undefined
              }
              onPointerMove={allowEntryDrag ? handlePointerMove : undefined}
              onPointerUp={allowEntryDrag ? handlePointerUp : undefined}
              style={{
                right: '62px',
                top: `${Math.max(16, Math.min(geom.height - 34, oc.entryY))}px`,
                transform: 'translateY(-50%)',
                touchAction: 'none',
              }}
              className={`absolute z-20 flex items-center gap-1.5 px-2.5 h-7 rounded-md bg-slate-900/95 border border-slate-400/70 text-slate-100 text-[11px] font-mono shadow ${
                orderInteractive && allowEntryDrag
                  ? 'cursor-ns-resize active:scale-105'
                  : 'pointer-events-none'
              }`}
            >
              <span className="font-bold text-cyan-300">
                {order.side === 'LONG' ? '▲ ENT' : '▼ ENT'}
              </span>
              <span>{formatPriceSmart(order.entry)}</span>
              {orderInteractive && allowEntryDrag && (
                <span className="text-[10px] text-slate-400">⇅</span>
              )}
            </div>
          )}

          {/* STOP LOSS HANDLE */}
          {oc.slY !== null && (
            <div
              onPointerDown={(e) => handlePointerDown('SL', e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{
                right: '62px',
                top: `${Math.max(16, Math.min(geom.height - 34, oc.slY))}px`,
                transform: 'translateY(-50%)',
                touchAction: 'none',
              }}
              className={`absolute z-30 flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-rose-950/95 border border-rose-400/80 text-rose-200 text-xs font-mono shadow-lg ${
                orderInteractive
                  ? 'cursor-ns-resize active:scale-105 active:bg-rose-900'
                  : 'pointer-events-none opacity-90'
              }`}
            >
              <span className="font-bold text-rose-400">SL</span>
              <span>{formatPriceSmart(order.stopLoss)}</span>
              {orderInteractive && (
                <span className="text-[10px] text-rose-400/80 ml-0.5">⇅</span>
              )}
            </div>
          )}
        </>
      )}

      {/* Subtle top-left watermark badge for HTF vs LTF clarity + Live Net R:R */}
      <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none flex items-center gap-1.5 flex-wrap">
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${
            isHtfView
              ? 'bg-violet-950/90 text-violet-300 border-violet-500/60'
              : 'bg-slate-900/85 text-slate-300 border-slate-700/70'
          }`}
        >
          {isHtfView ? 'VISTA MACRO (HTF)' : 'EXECUCIÓ (LTF)'}
        </span>
        {order && orderMetrics && (
          <span className="px-2 py-0.5 rounded bg-slate-950/90 border border-emerald-500/40 text-[10.5px] font-mono text-slate-200 shadow">
            <strong className="text-emerald-400">
              {orderMetrics.netRR.toFixed(2)}R net
            </strong>{' '}
            <span className="text-slate-400">
              · SL {orderMetrics.slInAtr.toFixed(1)} ATR
            </span>
          </span>
        )}
        {allowPriceTap && (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950/90 text-amber-300 border border-amber-500/50">
            Toca el nivell al gràfic
          </span>
        )}
      </div>
    </div>
  );
};
