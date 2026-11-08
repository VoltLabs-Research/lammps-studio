import { useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import type { LineChartProps } from '@/modules/charts/domain/line-chart';
import { areaPath, chartGeometry, linePath, nearestIndex } from '@/modules/charts/utils/chart-geometry';
import { axisLabel } from '@/modules/charts/utils/axis-label';
import { smoothSeries } from '@/modules/charts/utils/smooth-series';
import '@/modules/charts/components/LineChart/line-chart.css';

const TICK_GAP = 8;
const TEXT_BASELINE = 3.5;
const X_LABEL_INSET = 4;
const END_RADIUS = 4;
const BARE_END_RADIUS = 3;
const ANNOTATION_GAP = 9;
const ANNOTATION_BASELINE = 4;
const ANNOTATION_FLIP_AT = 0.6;
const TIP_OFFSET_X = 12;
const TIP_OFFSET_Y = 46;
const TIP_INSET = 4;
const DIGITS = 1;

const tickAnchor = (tick: number, x0: number, x1: number): 'start' | 'end' | 'middle' => {
    if(tick === x0){
        return 'start';
    }
    if(tick === x1){
        return 'end';
    }

    return 'middle';
};

const LineChart = (props: LineChartProps) => {
    const { xs, ys, width, height, bare, plotMode } = props;
    const [hover, setHover] = useState<number | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const tipRef = useRef<HTMLSpanElement>(null);
    const geometry = chartGeometry({ xs, ys, width, height, bare, xDomain: props.xDomain, yRange: props.yRange });
    const { margin, scale, sx, sy, x0, x1 } = geometry;
    const shown = plotMode === 'raw' ? ys : smoothSeries(ys);
    const plotted = xs.length > 1;
    const hoverX = hover === null ? 0 : sx(xs[hover]);
    const hoverY = hover === null ? 0 : sy(shown[hover]);

    useLayoutEffect(() => {
        const tip = tipRef.current;
        const svg = svgRef.current;
        const card = tip?.offsetParent;

        if(!tip || !svg || !card){
            return;
        }

        const box = svg.getBoundingClientRect();
        const frame = card.getBoundingClientRect();
        const left = box.left - frame.left + (hoverX / width) * box.width;
        const top = box.top - frame.top + (hoverY / height) * box.height;

        tip.style.left = `${Math.min(Math.max(left + TIP_OFFSET_X, TIP_INSET), frame.width - tip.offsetWidth - TIP_INSET)}px`;
        tip.style.top = `${Math.max(TIP_INSET, top - TIP_OFFSET_Y)}px`;
    }, [hover, hoverX, hoverY, width, height]);

    const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
        if(!plotted){
            return;
        }

        const box = event.currentTarget.getBoundingClientRect();

        setHover(nearestIndex(geometry, xs, ((event.clientX - box.left) / box.width) * width));
    };

    const grid = bare ? [] : scale.ticks;
    const xTicks = bare ? [] : props.xTicks;
    const endX = plotted ? sx(xs[xs.length - 1]) : 0;
    const endY = plotted ? sy(shown[shown.length - 1]) : 0;

    return (
        <>
            <svg
                ref={svgRef}
                className='chart-svg'
                viewBox={`0 0 ${width} ${height}`}
                width={width}
                height={height}
                role='img'
                aria-label={props.label}
                onPointerMove={onPointerMove}
                onPointerLeave={() => setHover(null)}
            >
                {grid.map((tick) => (
                    <g key={tick}>
                        <line className='grid-line' x1={margin.left} x2={width - margin.right} y1={sy(tick).toFixed(DIGITS)} y2={sy(tick).toFixed(DIGITS)} />
                        <text className='axis-text' x={margin.left - TICK_GAP} y={(sy(tick) + TEXT_BASELINE).toFixed(DIGITS)} textAnchor='end'>{axisLabel(tick, scale.step)}</text>
                    </g>
                ))}
                {xTicks.map((tick) => (
                    <text key={tick} className='axis-text' x={sx(tick).toFixed(DIGITS)} y={height - X_LABEL_INSET} textAnchor={tickAnchor(tick, x0, x1)}>{props.formatTick(tick)}</text>
                ))}
                {plotted && (
                    <>
                        <path className='area' d={areaPath(geometry, xs, shown, props.areaBase ?? scale.lo)} />
                        {plotMode === 'both' && !bare && <path className='line raw' d={linePath(geometry, xs, ys)} />}
                        <path className='line' d={linePath(geometry, xs, shown)} />
                        <circle className='end' cx={endX.toFixed(DIGITS)} cy={endY.toFixed(DIGITS)} r={bare ? BARE_END_RADIUS : END_RADIUS} />
                    </>
                )}
                {props.annotations.map((annotation) => {
                    const ax = sx(annotation.x);
                    const ay = sy(annotation.y);
                    const right = ax < width * ANNOTATION_FLIP_AT;

                    return (
                        <g key={annotation.label}>
                            <circle className='annot-dot' cx={ax.toFixed(DIGITS)} cy={ay.toFixed(DIGITS)} r={END_RADIUS} />
                            <text className='annot' x={(ax + (right ? ANNOTATION_GAP : -ANNOTATION_GAP)).toFixed(DIGITS)} y={(ay + ANNOTATION_BASELINE).toFixed(DIGITS)} textAnchor={right ? 'start' : 'end'}>{annotation.label}</text>
                        </g>
                    );
                })}
                {hover !== null && (
                    <>
                        <line className='cross' x1={hoverX} x2={hoverX} y1={margin.top} y2={height - margin.bottom} />
                        <circle className='end' r={END_RADIUS} cx={hoverX} cy={hoverY} />
                    </>
                )}
                <rect x={margin.left} y={0} width={width - margin.left - margin.right} height={height} fill='transparent' />
            </svg>
            {hover !== null && (
                <span ref={tipRef} className='chart-tip glass'>
                    {props.formatX(xs[hover])}
                    <br />
                    <b>{props.formatY(ys[hover])}</b>
                    {plotMode === 'both' && <span className='muted'> · smoothed {props.formatY(shown[hover])}</span>}
                </span>
            )}
        </>
    );
};

export default LineChart;
