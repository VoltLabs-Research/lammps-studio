export type IconSize = 'xs' | 'sm' | 'md' | 'lg';

export type ControlSize = 'md' | 'sm';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export type TipSide = 'bottom' | 'top' | 'left' | 'right';

export type ChipTone = 'neutral' | 'info' | 'warn' | 'danger' | 'ok';

export type ModalFocus = 'first' | 'dialog';

export type ModalPlacement = 'center' | 'top';

export interface SegOption<V extends string>{
    value: V;
    label: string;
    count?: number;
}
