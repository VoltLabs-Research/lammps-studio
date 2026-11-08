import { BufferAttribute, BufferGeometry, DynamicDrawUsage, Points } from 'three';
import type { ShaderMaterial } from 'three';
import type { Frame } from '@lammps-studio/contracts/run/frame';
import type { ColorMode, ThemeName } from '@/modules/viewport/domain/scene';
import { fillAtomColors } from '@/modules/viewport/utils/atom-colors';

const markRange = (attribute: BufferAttribute, count: number) => {
    attribute.clearUpdateRanges();
    attribute.addUpdateRange(0, count * 3);
    attribute.needsUpdate = true;
};

export class AtomBuffers{
    readonly points: Points<BufferGeometry, ShaderMaterial>;
    private positionArray = new Float32Array(0);
    private colorArray = new Uint8Array(0);
    private positions = new BufferAttribute(this.positionArray, 3);
    private colors = new BufferAttribute(this.colorArray, 3, true);
    private capacity = 0;
    private count = 0;

    constructor(material: ShaderMaterial){
        this.points = new Points(new BufferGeometry(), material);
        this.points.frustumCulled = false;
    }

    setPositions(positions: Float32Array){
        const count = Math.floor(positions.length / 3);

        this.reserve(count);
        this.positionArray.set(positions);
        markRange(this.positions, count);
        this.points.geometry.setDrawRange(0, count);
        this.count = count;
    }

    paint(frame: Frame, mode: ColorMode, theme: ThemeName){
        fillAtomColors(frame, mode, theme, this.colorArray);
        markRange(this.colors, this.count);
    }

    dispose(){
        this.points.geometry.dispose();
    }

    private reserve(count: number){
        if(count <= this.capacity){
            return;
        }

        const geometry = new BufferGeometry();

        this.positionArray = new Float32Array(count * 3);
        this.colorArray = new Uint8Array(count * 3);
        this.positions = new BufferAttribute(this.positionArray, 3).setUsage(DynamicDrawUsage);
        this.colors = new BufferAttribute(this.colorArray, 3, true).setUsage(DynamicDrawUsage);
        geometry.setAttribute('position', this.positions);
        geometry.setAttribute('aColor', this.colors);
        this.points.geometry.dispose();
        this.points.geometry = geometry;
        this.capacity = count;
    }
}
