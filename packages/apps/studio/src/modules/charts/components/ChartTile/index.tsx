import type { TileProps } from '@/modules/charts/domain/bento';
import LineChart from '@/modules/charts/components/LineChart';
import TileHead from '@/modules/charts/components/TileHead';
import { seriesChart, seriesValue } from '@/modules/charts/utils/series-chart';

const ChartTile = ({ series, span, sizing, onFeature, steps }: TileProps) => {
    return (
        <button
            type='button'
            className='chart-card tile'
            style={span > 1 ? { gridColumn: `span ${span}` } : undefined}
            aria-label={`Show ${series.label} large`}
            onClick={() => onFeature(series.key)}
        >
            <TileHead label={series.label} value={seriesValue(series)} unit={series.unit} />
            <LineChart {...seriesChart(series, steps, sizing)} />
        </button>
    );
};

export default ChartTile;
