import { LucideIcon } from 'lucide-react';
import { IconSize } from '@/shared/contracts/ui';
import { classNames } from '@/shared/utils/class-names';
import '@/shared/components/Icon/icon.css';

interface IconProps{
    glyph: LucideIcon;
    size?: IconSize;
    spin?: boolean;
}

const Icon = ({ glyph: Glyph, size = 'md', spin = false }: IconProps) => (
    <Glyph className={classNames('icon', size !== 'md' && size, spin && 'spin')} aria-hidden='true' />
);

export default Icon;
