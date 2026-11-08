import type { StatTileProps } from '@/modules/charts/domain/bento';
import '@/modules/charts/components/StatTile/stat-tile.css';

const StatTile = ({ peak, span }: StatTileProps) => {
    return (
        <div className='chart-card tile tile--stat' style={span > 1 ? { gridColumn: `span ${span}` } : undefined}>
            <span className='tile__label'>{peak.label}</span>
            <span className='tile__value num'>{peak.value}<small>{peak.unit}</small></span>
            <span className='tile__note'>{peak.note}</span>
        </div>
    );
};

export default StatTile;
