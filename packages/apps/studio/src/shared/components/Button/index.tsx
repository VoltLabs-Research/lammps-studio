import { ComponentProps } from 'react';
import { ButtonVariant, ControlSize } from '@/shared/contracts/ui';
import { classNames } from '@/shared/utils/class-names';
import '@/shared/components/Button/button.css';

interface ButtonProps extends Omit<ComponentProps<'button'>, 'type'>{
    variant?: ButtonVariant;
    size?: ControlSize;
    iconOnly?: boolean;
    submit?: boolean;
}

const Button = ({ variant = 'secondary', size = 'md', iconOnly = false, submit = false, className, ...rest }: ButtonProps) => (
    <button
        type={submit ? 'submit' : 'button'}
        className={classNames('btn', variant, size === 'sm' && 'sm', iconOnly && 'icon-only', className)}
        {...rest}
    />
);

export default Button;
