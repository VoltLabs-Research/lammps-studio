import { ControlSize, SegOption } from '@/shared/contracts/ui';
import { classNames } from '@/shared/utils/class-names';
import '@/shared/components/Seg/seg.css';

interface SegProps<V extends string>{
    label: string;
    options: SegOption<V>[];
    value: V;
    onChange: (value: V) => void;
    size?: ControlSize;
}

const Seg = <V extends string>({ label, options, value, onChange, size = 'md' }: SegProps<V>) => (
    <div className={classNames('seg', size === 'sm' && 'sm')} role='group' aria-label={label}>
        {options.map((option) => (
            <button key={option.value} type='button' aria-pressed={option.value === value} onClick={() => onChange(option.value)}>
                {option.label}
                {option.count === undefined ? null : <span className='count'>{option.count}</span>}
            </button>
        ))}
    </div>
);

export default Seg;
