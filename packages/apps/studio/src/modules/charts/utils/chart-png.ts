import { canvasToBlob } from '@/modules/viewport/utils/canvas-image';
import { context2d } from '@/modules/viewport/utils/theme-tokens';

const SCALE = 2;
const TILE_RADIUS = 20;
const TILE_COLOR = '--tile-solid';
const SVG_TYPE = 'image/svg+xml;charset=utf-8';
const INLINED = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'font-family', 'font-size', 'font-weight', 'visibility'];
const TEXTS = '.tile__label, .tile__value';

const inlinedSvg = (source: SVGSVGElement): string => {
    const copy = document.importNode(source, true);
    const from = source.querySelectorAll('*');
    copy.querySelectorAll('*').forEach((element, index) => {
        const style = getComputedStyle(from[index]);
        element.setAttribute('style', INLINED.map((name) => `${name}:${style.getPropertyValue(name)}`).join(';'));
    });

    return new XMLSerializer().serializeToString(copy);
};

const loadImage = async (svg: string): Promise<HTMLImageElement> => {
    const image = new Image();
    image.src = `data:${SVG_TYPE},${encodeURIComponent(svg)}`;
    await image.decode();

    return image;
};

const drawText = (context: CanvasRenderingContext2D, origin: DOMRect, element: Element) => {
    for(const node of element.childNodes){
        const owner = node instanceof Element ? node : element;
        const range = document.createRange();
        range.selectNodeContents(node);
        const box = range.getBoundingClientRect();
        const style = getComputedStyle(owner);
        context.font = style.font;
        context.fillStyle = style.color;
        context.fillText(node.textContent ?? '', box.left - origin.left, box.top - origin.top + box.height / 2);
    }
};

export const chartPng = async (tile: HTMLElement): Promise<Blob> => {
    const origin = tile.getBoundingClientRect();
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(origin.width * SCALE);
    canvas.height = Math.round(origin.height * SCALE);
    const context = context2d(canvas, {});
    context.scale(SCALE, SCALE);
    context.fillStyle = getComputedStyle(tile).getPropertyValue(TILE_COLOR);
    context.beginPath();
    context.roundRect(0, 0, origin.width, origin.height, TILE_RADIUS);
    context.fill();
    context.textBaseline = 'middle';
    tile.querySelectorAll(TEXTS).forEach((element) => drawText(context, origin, element));

    const chart = tile.querySelector('svg');
    if(chart){
        const box = chart.getBoundingClientRect();
        context.drawImage(await loadImage(inlinedSvg(chart)), box.left - origin.left, box.top - origin.top, box.width, box.height);
    }

    return canvasToBlob(canvas);
};
