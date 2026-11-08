import type { ViewportLegendProps } from '@/modules/viewport/domain/components';
import type { LegendSwatch } from '@/modules/viewport/domain/legend';
import '@/modules/viewport/components/ViewportLegend/viewport-legend.css';

const PERCENT = 100;
const SHARE_DIGITS = 1;
const RANGE_DIGITS = 2;

const ViewportLegend = ({ legend }: ViewportLegendProps) => {
    if(legend.kind === 'energy'){
        const stops = legend.stops.map((stop, index) => `${stop} ${(index / (legend.stops.length - 1)) * PERCENT}%`).join(',');

        return (
            <div className='vp-legend'>
                <span className='vp-legend__title'>Energy</span>
                <b className='num'>{legend.min.toFixed(RANGE_DIGITS)}</b>
                <span className='vp-legend__ramp' style={{ background: `linear-gradient(90deg,${stops})` }} />
                <b className='num'>{legend.max.toFixed(RANGE_DIGITS)} {legend.unit}</b>
            </div>
        );
    }

    const structure = legend.kind === 'structure';
    const amount = (item: LegendSwatch) => structure ? `${(PERCENT * item.share).toFixed(SHARE_DIGITS)}%` : item.count.toLocaleString('en-US');

    return (
        <div className='vp-legend'>
            <span className='vp-legend__title'>{structure ? 'Structure' : 'Type'}</span>
            {legend.items.map((item) => (
                <span key={item.name} className='vp-legend__item'>
                    <i style={{ background: item.color }} />
                    {item.name}
                    <b>{amount(item)}</b>
                </span>
            ))}
        </div>
    );
};

export default ViewportLegend;
