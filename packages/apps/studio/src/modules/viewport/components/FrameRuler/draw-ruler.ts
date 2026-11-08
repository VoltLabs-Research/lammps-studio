import type { RulerModel, RulerPaint, StepScale } from '@/modules/viewport/domain/components';
import { compact } from '@/modules/charts/utils/compact';
import { niceTicks } from '@/modules/charts/utils/nice-ticks';
import { context2d, readToken } from '@/modules/viewport/utils/theme-tokens';

export const RULER_PAD = 6;

const MAX_PIXEL_RATIO = 2;
const TRACK_Y = 9;
const TRACK_ALPHA = 0.35;
const TRACK_DASH = [2, 3];
const MAJOR_EVERY = 25;
const MAJOR_TICK = [3, 15];
const MINOR_TICK = [6, 12];
const MAJOR_ALPHA = 0.9;
const MINOR_ALPHA = 0.55;
const LABEL_TICKS = 5;
const LABEL_FONT = 10;
const LABEL_BASELINE = 0.5;
const PIXEL_CENTER = 0.5;
const MARKER_HALF = 3;
const MARKER_DEPTH = 4;
const THUMB_HALF = 2;
const THUMB_TOP = 1;
const THUMB_HEIGHT = 16;
const THUMB_RADIUS = 2;
const DRAWING: CanvasRenderingContext2DSettings = {};

export const stepScale = (model: RulerModel, width: number): StepScale => {
    const span = Math.max(1, model.endStep - model.startStep);

    return (step) => RULER_PAD + ((step - model.startStep) / span) * (width - RULER_PAD * 2);
};

const drawTrack = ({ context, x, muted }: RulerPaint, model: RulerModel) => {
    const last = model.steps.length ? model.steps[model.steps.length - 1] : model.startStep;

    context.strokeStyle = muted;
    context.globalAlpha = TRACK_ALPHA;
    context.lineWidth = 1;
    context.setLineDash(TRACK_DASH);
    context.beginPath();
    context.moveTo(x(last), TRACK_Y);
    context.lineTo(x(model.endStep), TRACK_Y);
    context.stroke();
    context.setLineDash([]);
};

const drawTicks = ({ context, x, fg, muted }: RulerPaint, model: RulerModel) => {
    model.steps.forEach((step, index) => {
        const major = index % MAJOR_EVERY === 0;
        const [top, bottom] = major ? MAJOR_TICK : MINOR_TICK;

        context.strokeStyle = major ? fg : muted;
        context.globalAlpha = major ? MAJOR_ALPHA : MINOR_ALPHA;
        context.beginPath();
        context.moveTo(x(step) + PIXEL_CENTER, top);
        context.lineTo(x(step) + PIXEL_CENTER, bottom);
        context.stroke();
    });
    context.globalAlpha = 1;
};

const labelAlign = (step: number, model: RulerModel): CanvasTextAlign => {
    if(step === model.startStep){
        return 'left';
    }
    if(step === model.endStep){
        return 'right';
    }

    return 'center';
};

const drawLabels = ({ context, x, muted, height }: RulerPaint, model: RulerModel) => {
    context.fillStyle = muted;
    context.font = `${LABEL_FONT}px ${readToken('--font-sans')}`;
    context.textBaseline = 'alphabetic';

    for(const step of niceTicks(model.startStep, model.endStep, LABEL_TICKS).ticks){
        if(step >= model.startStep && step <= model.endStep){
            context.textAlign = labelAlign(step, model);
            context.fillText(compact(step), x(step), height - LABEL_BASELINE);
        }
    }
};

const drawMarker = ({ context, x, muted }: RulerPaint, marker: number) => {
    const mark = x(marker);

    context.fillStyle = muted;
    context.beginPath();
    context.moveTo(mark - MARKER_HALF, 0);
    context.lineTo(mark + MARKER_HALF, 0);
    context.lineTo(mark, MARKER_DEPTH);
    context.fill();
};

const drawThumb = ({ context, x, fg }: RulerPaint, model: RulerModel) => {
    const index = Math.min(Math.max(model.index, 0), model.steps.length - 1);
    const thumb = x(model.steps[index]);

    context.fillStyle = fg;
    context.beginPath();
    context.roundRect(thumb - THUMB_HALF, THUMB_TOP, THUMB_HALF * 2, THUMB_HEIGHT, THUMB_RADIUS);
    context.fill();
};

export const drawRuler = (canvas: HTMLCanvasElement, model: RulerModel) => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if(!width){
        return;
    }

    const ratio = Math.min(MAX_PIXEL_RATIO, window.devicePixelRatio || 1);
    const context = context2d(canvas, DRAWING);
    const paint: RulerPaint = {
        context,
        x: stepScale(model, width),
        fg: readToken('--fg'),
        muted: readToken('--muted'),
        height
    };

    canvas.width = width * ratio;
    canvas.height = height * ratio;
    context.scale(ratio, ratio);
    context.clearRect(0, 0, width, height);
    drawTrack(paint, model);
    drawTicks(paint, model);
    drawLabels(paint, model);

    if(model.marker !== null){
        drawMarker(paint, model.marker);
    }
    if(model.steps.length){
        drawThumb(paint, model);
    }
};
