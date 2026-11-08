import type { FeaturedTileProps } from '@/modules/charts/domain/bento';
import LineChart from '@/modules/charts/components/LineChart';
import TileHead from '@/modules/charts/components/TileHead';
import { seriesChart, seriesValue } from '@/modules/charts/utils/series-chart';
import '@/modules/charts/components/FeaturedTile/featured-tile.css';

const FEATURED_ROWS = 2;

const FeaturedTile = ({ series, steps, span, sizing }: FeaturedTileProps) => {
    return (
        <div className='chart-card tile tile--feat' style={{ gridColumn: `span ${span}`, gridRow: `span ${FEATURED_ROWS}` }}>
            <TileHead label={series.label} value={seriesValue(series)} unit={series.unit} />
            <LineChart {...seriesChart(series, steps, sizing)} />
        </div>
    );
};

export default FeaturedTile;
