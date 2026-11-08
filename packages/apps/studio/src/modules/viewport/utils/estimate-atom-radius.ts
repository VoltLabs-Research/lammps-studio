import type { CellGrid } from '@/modules/viewport/domain/scene';

export const FALLBACK_RADIUS = 1.28;

const SAMPLES = 512;
const CELL_SCALE = 1.25;
const MIN_EXTENT = 1e-6;
const AXES = [0, 1, 2];

const bounds = (positions: Float32Array, count: number): number[] => {
    const box = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];

    for(let atom = 0; atom < count; atom++){
        for(const axis of AXES){
            const value = positions[atom * 3 + axis];
            box[axis] = Math.min(box[axis], value);
            box[axis + 3] = Math.max(box[axis + 3], value);
        }
    }

    return box;
};

const cellSize = (box: number[], count: number): number => {
    const extents = AXES.map((axis) => box[axis + 3] - box[axis]).filter((extent) => extent > MIN_EXTENT);
    const volume = extents.reduce((product, extent) => product * extent, 1);

    return extents.length ? CELL_SCALE * Math.pow(volume / count, 1 / extents.length) : 1;
};

const cellOf = (grid: CellGrid, atom: number, axis: number): number => {
    const offset = (grid.positions[atom * 3 + axis] - grid.origin[axis]) / grid.size;

    return Math.min(grid.dims[axis] - 1, Math.floor(offset));
};

const cellIndex = (grid: CellGrid, x: number, y: number, z: number): number => {
    return (z * grid.dims[1] + y) * grid.dims[0] + x;
};

const buildGrid = (positions: Float32Array, count: number): CellGrid => {
    const box = bounds(positions, count);
    const size = cellSize(box, count);
    const dims = AXES.map((axis) => Math.max(1, Math.ceil((box[axis + 3] - box[axis]) / size)));
    const grid: CellGrid = {
        positions,
        origin: box.slice(0, 3),
        size,
        dims,
        starts: new Int32Array(dims[0] * dims[1] * dims[2] + 1),
        order: new Int32Array(count)
    };
    const cells = new Int32Array(count);

    for(let atom = 0; atom < count; atom++){
        cells[atom] = cellIndex(grid, cellOf(grid, atom, 0), cellOf(grid, atom, 1), cellOf(grid, atom, 2));
        grid.starts[cells[atom] + 1]++;
    }
    for(let cell = 1; cell < grid.starts.length; cell++){
        grid.starts[cell] += grid.starts[cell - 1];
    }

    const cursor = grid.starts.slice(0, -1);

    for(let atom = 0; atom < count; atom++){
        grid.order[cursor[cells[atom]]++] = atom;
    }

    return grid;
};

const squaredDistance = (positions: Float32Array, a: number, b: number): number => {
    const dx = positions[a * 3] - positions[b * 3];
    const dy = positions[a * 3 + 1] - positions[b * 3 + 1];
    const dz = positions[a * 3 + 2] - positions[b * 3 + 2];

    return dx * dx + dy * dy + dz * dz;
};

const nearestInCell = (grid: CellGrid, atom: number, cell: number, best: number): number => {
    let nearest = best;

    for(let slot = grid.starts[cell]; slot < grid.starts[cell + 1]; slot++){
        const other = grid.order[slot];

        if(other !== atom){
            nearest = Math.min(nearest, squaredDistance(grid.positions, atom, other));
        }
    }

    return nearest;
};

const nearestSquared = (grid: CellGrid, atom: number): number => {
    const [hx, hy, hz] = AXES.map((axis) => cellOf(grid, atom, axis));
    const span = (home: number, axis: number) => [Math.max(0, home - 1), Math.min(grid.dims[axis] - 1, home + 1)];
    const [x0, x1] = span(hx, 0);
    const [y0, y1] = span(hy, 1);
    const [z0, z1] = span(hz, 2);
    let best = Infinity;

    for(let z = z0; z <= z1; z++){
        for(let y = y0; y <= y1; y++){
            for(let x = x0; x <= x1; x++){
                best = nearestInCell(grid, atom, cellIndex(grid, x, y, z), best);
            }
        }
    }

    return best;
};

export const estimateAtomRadius = (positions: Float32Array): number => {
    const count = Math.floor(positions.length / 3);

    if(count < 2){
        return FALLBACK_RADIUS;
    }

    const grid = buildGrid(positions, count);
    const stride = Math.max(1, Math.floor(count / SAMPLES));
    const distances: number[] = [];

    for(let atom = 0; atom < count; atom += stride){
        const nearest = nearestSquared(grid, atom);

        if(nearest <= grid.size * grid.size){
            distances.push(Math.sqrt(nearest));
        }
    }
    if(distances.length === 0){
        return FALLBACK_RADIUS;
    }

    distances.sort((a, b) => a - b);

    return distances[Math.floor(distances.length / 2)] / 2;
};
