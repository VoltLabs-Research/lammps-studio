export type IconSize = 'xs' | 'sm' | 'md' | 'lg';

export type ControlSize = 'md' | 'sm';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export type TipSide = 'bottom' | 'top' | 'left' | 'right';

export type ChipTone = 'neutral' | 'info' | 'warn' | 'danger' | 'ok';

export interface SegOption<V extends string>{
    value: V;
    label: string;
    count?: number;
}
