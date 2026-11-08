import { ComponentProps } from 'react';
import { ControlSize, TipSide } from '@/shared/contracts/ui';
import { classNames } from '@/shared/utils/class-names';
import '@/shared/components/IconButton/icon-button.css';

interface IconButtonProps extends Omit<ComponentProps<'button'>, 'type' | 'aria-label'>{
    label: string;
    tip?: string;
    tipSide?: TipSide;
    size?: ControlSize;
    pressed?: boolean;
}

const IconButton = ({ label, tip, tipSide, size = 'md', pressed, className, ...rest }: IconButtonProps) => (
    <button
        type='button'
        className={classNames('icon-btn', size === 'sm' && 'sm', className)}
        aria-label={label}
        aria-pressed={pressed}
        data-tip={tip}
        data-tip-side={tipSide === 'bottom' ? undefined : tipSide}
        {...rest}
    />
);

export default IconButton;
