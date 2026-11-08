import type { Rgb, SceneTheme, ThemeName } from '@/modules/viewport/domain/scene';

const BYTE = 255;
const READ_BACK: CanvasRenderingContext2DSettings = {
    willReadFrequently: true
};

let probe: CanvasRenderingContext2D | null = null;

export const context2d = (canvas: HTMLCanvasElement, settings: CanvasRenderingContext2DSettings): CanvasRenderingContext2D => {
    const context = canvas.getContext('2d', settings);

    if(!context){
        throw new DOMException('This browser cannot draw a 2D canvas', 'NotSupportedError');
    }

    return context;
};

const probeContext = (): CanvasRenderingContext2D => {
    if(probe){
        return probe;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    probe = context2d(canvas, READ_BACK);

    return probe;
};

export const readToken = (name: string): string => {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
};

export const currentTheme = (): ThemeName => {
    return getComputedStyle(document.documentElement).colorScheme === 'dark' ? 'dark' : 'light';
};

export const tokenRgb = (name: string): Rgb => {
    const context = probeContext();

    context.clearRect(0, 0, 1, 1);
    context.fillStyle = '#000';
    context.fillStyle = readToken(name);
    context.fillRect(0, 0, 1, 1);

    const [r, g, b] = context.getImageData(0, 0, 1, 1).data;

    return [r / BYTE, g / BYTE, b / BYTE];
};

export const readSceneTheme = (): SceneTheme => {
    return {
        name: currentTheme(),
        viewport: tokenRgb('--viewport'),
        canvas: tokenRgb('--canvas'),
        muted: tokenRgb('--muted')
    };
};
