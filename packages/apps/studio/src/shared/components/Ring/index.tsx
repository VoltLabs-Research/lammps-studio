import '@/shared/components/Ring/ring.css';

interface RingProps{
    value: number;
}

const RADIUS = 6;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const Ring = ({ value }: RingProps) => (
    <svg className='ring' viewBox='0 0 16 16' aria-hidden='true'>
        <circle cx='8' cy='8' r={RADIUS} />
        <circle
            className='ring__v'
            cx='8'
            cy='8'
            r={RADIUS}
            strokeDasharray={`${(CIRCUMFERENCE * value).toFixed(2)} ${CIRCUMFERENCE.toFixed(2)}`}
            transform='rotate(-90 8 8)'
        />
    </svg>
);

export default Ring;
