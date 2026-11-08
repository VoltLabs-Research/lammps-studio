import { Minus, Plus } from 'lucide-react';
import Icon from '@/shared/components/Icon';
import '@/shared/components/Stepper/stepper.css';

interface StepperProps{
    label: string;
    value: number;
    min: number;
    max: number;
    onChange: (value: number) => void;
}

const Stepper = ({ label, value, min, max, onChange }: StepperProps) => (
    <span className='stepper'>
        <span className='stepper__v num'>{value}</span>
        <span className='stepper__btns'>
            <button type='button' aria-label={`Fewer ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
                <Icon glyph={Minus} size='xs' />
            </button>
            <button type='button' aria-label={`More ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
                <Icon glyph={Plus} size='xs' />
            </button>
        </span>
    </span>
);

export default Stepper;
