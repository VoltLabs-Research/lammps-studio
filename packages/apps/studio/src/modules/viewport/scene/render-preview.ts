import { PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import type { Frame } from '@lammps-studio/contracts/run/frame';
import type { AlignedPositions, PreviewOptions, PreviewRig } from '@/modules/viewport/domain/scene';
import { AtomBuffers } from '@/modules/viewport/scene/AtomBuffers';
import { createAtomMaterial, createAtomUniforms } from '@/modules/viewport/scene/atom-material';
import { blobToDataUrl, canvasToBlob } from '@/modules/viewport/utils/canvas-image';
import { estimateAtomRadius } from '@/modules/viewport/utils/estimate-atom-radius';

const FOV = 26;
const THETA = 1.32;
const PHI = 0.32;
const FRAMING = 1.18;
const LIFT_SHARE = 46 / 512;
const CUE = 0.25;
const CUE_NEAR = 0.6;
const CUE_FAR = 1.2;
const NEAR_SHARE = 0.01;
const FAR_REACH = 4;
const DEGREES_PER_HALF_TURN = 180;

let shared: PreviewRig | null = null;

const previewRig = (): PreviewRig => {
    if(shared){
        return shared;
    }

    const canvas = document.createElement('canvas');
    const uniforms = createAtomUniforms();
    const atoms = new AtomBuffers(createAtomMaterial(uniforms));
    const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
    const scene = new Scene();
    const camera = new PerspectiveCamera(FOV, 1, 1, 2);

    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 0);
    camera.up.set(0, 0, 1);
    scene.add(atoms.points);
    shared = {
        canvas,
        renderer,
        scene,
        camera,
        uniforms,
        atoms
    };

    return shared;
};

const alignLongestAxis = (frame: Frame): AlignedPositions => {
    const { low, high } = frame.header.box;
    const size = [0, 1, 2].map((axis) => high[axis] - low[axis]);
    const longest = size.indexOf(Math.max(...size));
    const order = [longest, (longest + 1) % 3, (longest + 2) % 3];
    const center = order.map((axis) => (low[axis] + high[axis]) / 2);
    const source = frame.positions;
    const positions = new Float32Array(source.length);

    for(let atom = 0; atom < frame.header.atoms; atom++){
        for(let slot = 0; slot < 3; slot++){
            positions[atom * 3 + slot] = source[atom * 3 + order[slot]] - center[slot];
        }
    }

    return {
        positions,
        half: size[longest] / 2
    };
};

export const renderPreview = async (frame: Frame, options: PreviewOptions): Promise<string> => {
    const { canvas, renderer, scene, camera, uniforms, atoms } = previewRig();
    const { width, height, theme } = options;
    const { positions, half } = alignLongestAxis(frame);
    const tan = Math.tan((FOV / 2) * (Math.PI / DEGREES_PER_HALF_TURN));
    const distance = (half * FRAMING) / (tan * (width / height));

    renderer.setSize(width, height, false);
    atoms.setPositions(positions);
    atoms.paint(frame, 'structure', theme.name);
    camera.aspect = width / height;
    camera.near = distance * NEAR_SHARE;
    camera.far = distance + half * FAR_REACH;
    camera.position.set(distance * Math.cos(PHI) * Math.cos(THETA), distance * Math.cos(PHI) * Math.sin(THETA), distance * Math.sin(PHI));
    camera.lookAt(0, 0, 0);
    camera.setViewOffset(width, height, 0, height * LIFT_SHARE, width, height);
    camera.updateProjectionMatrix();
    uniforms.uBg.value.set(...theme.canvas);
    uniforms.uCue.value = CUE;
    uniforms.uScale.value = height / tan;
    uniforms.uSize.value = 1;
    uniforms.uRadius.value = estimateAtomRadius(frame.positions);
    uniforms.uCueNear.value = distance - half * CUE_NEAR;
    uniforms.uCueFar.value = distance + half * CUE_FAR;
    renderer.render(scene, camera);

    return blobToDataUrl(await canvasToBlob(canvas));
};
