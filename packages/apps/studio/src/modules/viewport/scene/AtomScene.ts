import { BoxGeometry, Color, EdgesGeometry, LineBasicMaterial, LineSegments, MathUtils, PerspectiveCamera, Scene, SRGBColorSpace, Vector2, Vector3, WebGLRenderer } from 'three';
import type { Frame, FrameBox } from '@lammps-studio/contracts/run/frame';
import type { ColorMode, OrbitDrag, ThemeName, ViewListener } from '@/modules/viewport/domain/scene';
import { AtomBuffers } from '@/modules/viewport/scene/AtomBuffers';
import { createAtomMaterial, createAtomUniforms } from '@/modules/viewport/scene/atom-material';
import { canvasToBlob } from '@/modules/viewport/utils/canvas-image';
import { estimateAtomRadius, FALLBACK_RADIUS } from '@/modules/viewport/utils/estimate-atom-radius';
import { fitDistance } from '@/modules/viewport/utils/fit-distance';
import { currentTheme, tokenRgb } from '@/modules/viewport/utils/theme-tokens';
import { watchTheme } from '@/modules/viewport/utils/watch-theme';

const FOV = 28;
const FIT_THETA = -0.62;
const FIT_PHI = 0.2;
const ROTATE_SPEED = 0.008;
const PHI_LIMIT = 1.45;
const ZOOM_SPEED = 0.0012;
const CLOSEST_ZOOM = 0.15;
const FARTHEST_ZOOM = 10;
const MAX_PIXEL_RATIO = 2;
const CUE_NEAR = 0.25;
const CUE_FAR = 0.6;
const NEAR_SHARE = 0.01;
const FAR_REACH = 4;
const RIGHT_BUTTON = 2;
const CUE: Record<ThemeName, number> = { dark: 0.5, light: 0.35 };
const BOX_OPACITY: Record<ThemeName, number> = { dark: 0.5, light: 0.45 };

export class AtomScene{
    private readonly canvas = document.createElement('canvas');
    private readonly renderer: WebGLRenderer;
    private readonly scene = new Scene();
    private readonly camera = new PerspectiveCamera(FOV, 1, 1, 2);
    private readonly uniforms = createAtomUniforms();
    private readonly atoms = new AtomBuffers(createAtomMaterial(this.uniforms));
    private readonly boxMaterial = new LineBasicMaterial({ transparent: true });
    private readonly box = new LineSegments(new EdgesGeometry(new BoxGeometry(1, 1, 1)), this.boxMaterial);
    private readonly target = new Vector3();
    private readonly center = new Vector3();
    private readonly size = new Vector3(1, 1, 1);
    private readonly onView: ViewListener;
    private readonly stopWatching: () => void;
    private frame: Frame | null = null;
    private colorMode: ColorMode = 'structure';
    private theme: ThemeName = 'light';
    private showBox = true;
    private atomScale = 1;
    private radius = FALLBACK_RADIUS;
    private width = 1;
    private height = 1;
    private bottomInset = 0;
    private theta = FIT_THETA;
    private phi = FIT_PHI;
    private distance = 1;
    private fitted = 1;
    private fitPending = true;
    private touched = false;
    private drag: OrbitDrag | null = null;
    private request = 0;
    private shownTheta = Number.NaN;
    private shownPhi = Number.NaN;

    constructor(host: HTMLElement, onView: ViewListener){
        this.onView = onView;
        host.prepend(this.canvas);
        this.renderer = new WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setPixelRatio(Math.min(MAX_PIXEL_RATIO, window.devicePixelRatio || 1));
        this.camera.up.set(0, 0, 1);
        this.scene.add(this.atoms.points, this.box);
        this.canvas.addEventListener('pointerdown', this.onPointerDown);
        this.canvas.addEventListener('pointermove', this.onPointerMove);
        this.canvas.addEventListener('pointerup', this.onPointerUp);
        this.canvas.addEventListener('pointercancel', this.onPointerUp);
        this.canvas.addEventListener('contextmenu', this.onContextMenu);
        this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
        this.canvas.addEventListener('dblclick', this.onDoubleClick);
        this.stopWatching = watchTheme(() => this.applyTheme());
        this.applyTheme();
    }

    get atomRadius(): number{
        return this.radius;
    }

    setFrame(frame: Frame){
        if(!this.frame || this.frame.header.atoms !== frame.header.atoms){
            this.radius = estimateAtomRadius(frame.positions);
        }

        this.frame = frame;
        this.atoms.setPositions(frame.positions);
        this.atoms.paint(frame, this.colorMode, this.theme);
        this.placeBox(frame.header.box);

        if(this.fitPending){
            this.fit();
        }

        this.invalidate();
    }

    setColorMode(mode: ColorMode){
        this.colorMode = mode;
        this.repaint();
    }

    setShowBox(show: boolean){
        this.showBox = show;
        this.invalidate();
    }

    setAtomScale(scale: number){
        this.atomScale = scale;
        this.invalidate();
    }

    setBottomInset(inset: number){
        this.bottomInset = inset;
        this.applyViewOffset();
        this.keepFitted();
        this.invalidate();
    }

    resize(width: number, height: number){
        this.width = Math.max(1, width);
        this.height = Math.max(1, height);
        this.renderer.setSize(this.width, this.height, false);
        this.camera.aspect = this.width / this.height;
        this.applyViewOffset();

        const buffer = this.renderer.getDrawingBufferSize(new Vector2()).y;
        this.uniforms.uScale.value = buffer / Math.tan(MathUtils.degToRad(FOV / 2));
        this.keepFitted();
        this.draw();
    }

    resetView(){
        this.fitPending = true;
        this.fit();
        this.invalidate();
    }

    snapshot(): Promise<Blob>{
        this.camera.clearViewOffset();
        this.draw();

        const image = canvasToBlob(this.canvas);

        this.applyViewOffset();
        this.draw();

        return image;
    }

    dispose(){
        cancelAnimationFrame(this.request);
        this.stopWatching();
        this.atoms.dispose();
        this.atoms.points.material.dispose();
        this.box.geometry.dispose();
        this.boxMaterial.dispose();
        this.renderer.dispose();
        this.renderer.forceContextLoss();
        this.canvas.remove();
    }

    private repaint(){
        if(this.frame){
            this.atoms.paint(this.frame, this.colorMode, this.theme);
        }

        this.invalidate();
    }

    private applyTheme(){
        const [r, g, b] = tokenRgb('--viewport');
        const [mr, mg, mb] = tokenRgb('--muted');

        this.theme = currentTheme();
        this.renderer.setClearColor(new Color().setRGB(r, g, b, SRGBColorSpace), 1);
        this.uniforms.uBg.value.set(r, g, b);
        this.uniforms.uCue.value = CUE[this.theme];
        this.boxMaterial.color.setRGB(mr, mg, mb, SRGBColorSpace);
        this.boxMaterial.opacity = BOX_OPACITY[this.theme];
        this.repaint();
    }

    private placeBox(box: FrameBox){
        const [lx, ly, lz] = box.low;
        const [hx, hy, hz] = box.high;

        this.center.set((lx + hx) / 2, (ly + hy) / 2, (lz + hz) / 2);
        this.size.set(hx - lx, hy - ly, hz - lz);
        this.box.position.copy(this.center);
        this.box.scale.copy(this.size);
    }

    private keepFitted(){
        if(!this.touched || this.fitPending){
            this.fitPending = true;
            this.fit();
        }
    }

    private fit(){
        if(!this.frame){
            return;
        }

        this.theta = FIT_THETA;
        this.phi = FIT_PHI;
        this.target.copy(this.center);
        this.distance = fitDistance({
            size: [this.size.x, this.size.y, this.size.z],
            theta: FIT_THETA,
            phi: FIT_PHI,
            fov: FOV,
            width: this.width,
            height: this.height,
            bottomInset: this.bottomInset
        });
        this.fitted = this.distance;
        this.fitPending = false;
        this.touched = false;
    }

    private applyViewOffset(){
        if(this.bottomInset > 0){
            this.camera.setViewOffset(this.width, this.height, 0, this.bottomInset / 2, this.width, this.height);
            return;
        }

        this.camera.clearViewOffset();
    }

    private invalidate(){
        if(this.request === 0){
            this.request = requestAnimationFrame(this.draw);
        }
    }

    private readonly draw = () => {
        const { camera, distance, target } = this;
        const reach = this.size.length();
        const flat = Math.cos(this.phi);

        cancelAnimationFrame(this.request);
        this.request = 0;
        camera.position.set(
            target.x + distance * flat * Math.cos(this.theta),
            target.y + distance * flat * Math.sin(this.theta),
            target.z + distance * Math.sin(this.phi)
        );
        camera.lookAt(target);
        camera.near = distance * NEAR_SHARE;
        camera.far = distance + reach * FAR_REACH + target.distanceTo(this.center);
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();
        this.uniforms.uCueNear.value = distance - reach * CUE_NEAR;
        this.uniforms.uCueFar.value = distance + reach * CUE_FAR;
        this.uniforms.uSize.value = this.atomScale;
        this.uniforms.uRadius.value = this.radius;
        this.atoms.points.visible = this.frame !== null;
        this.box.visible = this.showBox && this.frame !== null;
        this.renderer.render(this.scene, camera);
        this.emitView();
    };

    private emitView(){
        if(this.theta === this.shownTheta && this.phi === this.shownPhi){
            return;
        }

        this.shownTheta = this.theta;
        this.shownPhi = this.phi;
        this.onView(this.camera.matrixWorldInverse.clone());
    }

    private readonly onPointerDown = (event: PointerEvent) => {
        this.canvas.setPointerCapture(event.pointerId);
        this.drag = {
            x: event.clientX,
            y: event.clientY,
            pan: event.button === RIGHT_BUTTON || event.shiftKey,
            theta: this.theta,
            phi: this.phi,
            target: this.target.clone()
        };
    };

    private readonly onPointerMove = (event: PointerEvent) => {
        const drag = this.drag;

        if(!drag){
            return;
        }

        const dx = event.clientX - drag.x;
        const dy = event.clientY - drag.y;

        if(drag.pan){
            const scale = (this.distance * Math.tan(MathUtils.degToRad(FOV / 2)) * 2) / Math.max(1, this.canvas.clientHeight);
            const right = new Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
            const up = new Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);

            this.target.copy(drag.target).addScaledVector(right, -dx * scale).addScaledVector(up, dy * scale);
        }else{
            this.theta = drag.theta - dx * ROTATE_SPEED;
            this.phi = MathUtils.clamp(drag.phi + dy * ROTATE_SPEED, -PHI_LIMIT, PHI_LIMIT);
        }

        this.touched = true;
        this.invalidate();
    };

    private readonly onPointerUp = () => {
        this.drag = null;
    };

    private readonly onContextMenu = (event: MouseEvent) => {
        event.preventDefault();
    };

    private readonly onWheel = (event: WheelEvent) => {
        event.preventDefault();
        this.distance = MathUtils.clamp(this.distance * Math.exp(event.deltaY * ZOOM_SPEED), this.fitted * CLOSEST_ZOOM, this.fitted * FARTHEST_ZOOM);
        this.touched = true;
        this.invalidate();
    };

    private readonly onDoubleClick = () => {
        this.resetView();
    };
}
