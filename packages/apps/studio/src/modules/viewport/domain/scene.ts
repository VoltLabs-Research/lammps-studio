export type ColorMode = 'structure' | 'energy' | 'type';

export type ThemeName = 'light' | 'dark';

export type Rgb = [number, number, number];

export interface SceneTheme{
    name: ThemeName;
    viewport: Rgb;
    canvas: Rgb;
    muted: Rgb;
}

export interface BoxExtent{
    center: [number, number, number];
    size: [number, number, number];
}

export interface FitInput{
    size: [number, number, number];
    theta: number;
    phi: number;
    fov: number;
    width: number;
    height: number;
    bottomInset: number;
}

export interface PreviewOptions{
    width: number;
    height: number;
    theme: SceneTheme;
}

export interface ValueRange{
    min: number;
    max: number;
}

export interface CellGrid{
    positions: Float32Array;
    origin: number[];
    size: number;
    dims: number[];
    starts: Int32Array;
    order: Int32Array;
}
