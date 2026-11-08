import { useLayoutEffect, useRef, useState } from 'react';
import type { BentoItem, ChartSizing, ChartsBentoProps } from '@/modules/charts/domain/bento';
import type { BentoSeries } from '@/modules/charts/domain/chart';
import ChartTile from '@/modules/charts/components/ChartTile';
import FeaturedTile from '@/modules/charts/components/FeaturedTile';
import StatTile from '@/modules/charts/components/StatTile';
import { BENTO_GAP, BENTO_ROW, bentoColumns, bentoInnerWidth, featuredSpan, tileSpan, tileWidth } from '@/modules/charts/utils/bento-layout';
import { bentoSeries, sectionSteps } from '@/modules/charts/utils/bento-series';
import { seriesPeak } from '@/modules/charts/utils/series-chart';
import '@/modules/charts/components/ChartsBento/charts-bento.css';

const TILE_PADDING_X = 32;
const TILE_PADDING_Y = 28;
const FEATURED_HEAD = 58;
const TILE_HEAD = 46;
const TILE_GAP = 10;
const STAT_POSITION = 2;
const STAT_KEY = 'stat';

const bentoItems = (series: BentoSeries[], featured: BentoSeries): BentoItem[] => {
    const items: BentoItem[] = series
        .filter((entry) => entry.key !== featured.key)
        .map((entry) => ({ kind: 'chart', series: entry }));

    items.splice(STAT_POSITION, 0, { kind: 'stat', series: featured });

    return items;
};

const ChartsBento = ({ sections, units, plotMode, totalSteps, featured, onFeature }: ChartsBentoProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);

    useLayoutEffect(() => {
        const element = ref.current;

        if(!element){
            return;
        }

        const observer = new ResizeObserver(() => setWidth(element.clientWidth));

        observer.observe(element);
        setWidth(element.clientWidth);

        return () => observer.disconnect();
    }, []);

    const section = sections[sections.length - 1];
    const series = section && section.rows.length ? bentoSeries(section, units) : [];
    const lead = series.find((entry) => entry.key === featured) ?? series[0];

    if(!section || !lead || width === 0){
        return <div ref={ref} className='bento' />;
    }

    const steps = sectionSteps(section);
    const inner = bentoInnerWidth(width);
    const columns = bentoColumns(inner);
    const leadSpan = featuredSpan(columns);
    const sizing = (span: number, big: boolean): ChartSizing => ({
        width: tileWidth(inner, columns, span) - TILE_PADDING_X,
        height: big ? BENTO_ROW * 2 + BENTO_GAP - TILE_PADDING_Y - FEATURED_HEAD - TILE_GAP : BENTO_ROW - TILE_PADDING_Y - TILE_HEAD - TILE_GAP,
        big,
        plotMode,
        totalSteps
    });

    return (
        <div ref={ref} className='bento' style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            <FeaturedTile series={lead} steps={steps} span={leadSpan} sizing={sizing(leadSpan, true)} />
            {bentoItems(series, lead).map((item, index) => {
                const span = tileSpan(index, columns);

                if(item.kind === 'stat'){
                    return <StatTile key={STAT_KEY} peak={seriesPeak(item.series)} span={span} />;
                }

                return <ChartTile key={item.series.key} series={item.series} steps={steps} span={span} sizing={sizing(span, false)} onFeature={onFeature} />;
            })}
        </div>
    );
};

export default ChartsBento;
