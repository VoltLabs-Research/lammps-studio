import { LucideIcon } from 'lucide-react';
import Icon from '@/shared/components/Icon';
import '@/modules/simulations/components/OptionCard/option-card.css';

interface OptionCardProps{
    icon: LucideIcon;
    title: string;
    sub: string;
    checked: boolean;
    disabled?: boolean;
    onSelect: () => void;
}

const OptionCard = ({ icon, title, sub, checked, disabled = false, onSelect }: OptionCardProps) => (
    <button type='button' className='mach-opt' role='radio' aria-checked={checked} disabled={disabled} onClick={onSelect}>
        <Icon glyph={icon} size='sm' />
        <span>
            <span>{title}</span>
            <small>{sub}</small>
        </span>
    </button>
);

export default OptionCard;
