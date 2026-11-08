import { ReactNode } from 'react';
import { ChipTone } from '@/shared/contracts/ui';
import { classNames } from '@/shared/utils/class-names';
import '@/shared/components/Chip/chip.css';

interface ChipProps{
    tone?: ChipTone;
    mono?: boolean;
    children: ReactNode;
}

const Chip = ({ tone = 'neutral', mono = false, children }: ChipProps) => (
    <span className={classNames('chip', tone !== 'neutral' && tone, mono && 'mono')}>{children}</span>
);

export default Chip;
