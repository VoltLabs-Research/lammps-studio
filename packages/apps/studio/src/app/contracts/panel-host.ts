import { CSSProperties } from 'react';

export interface PanelStyle extends CSSProperties{
    '--panel-w'?: string;
}

export interface PanelDrag{
    pointerX: number;
    width: number;
}
