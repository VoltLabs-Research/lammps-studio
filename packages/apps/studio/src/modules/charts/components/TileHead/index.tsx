import type { TileHeadProps } from '@/modules/charts/domain/bento';
import '@/modules/charts/components/TileHead/tile-head.css';

const TileHead = ({ label, value, unit }: TileHeadProps) => {
    return (
        <div className='tile__head'>
            <span className='tile__label'>{label}</span>
            <span className='tile__value num'>{value}<small>{unit}</small></span>
        </div>
    );
};

export default TileHead;
