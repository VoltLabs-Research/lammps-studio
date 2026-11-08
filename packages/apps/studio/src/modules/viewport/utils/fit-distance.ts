import type { FitInput } from '@/modules/viewport/domain/scene';

const FIT_MARGIN = 48;
const MIN_FREE = 0.45;
const DEGREES_PER_HALF_TURN = 180;

export const fitDistance = (input: FitInput): number => {
    const [hx, hy, hz] = input.size.map((extent) => extent / 2);
    const tan = Math.tan((input.fov / 2) * (Math.PI / DEGREES_PER_HALF_TURN));
    const sinTheta = Math.sin(input.theta);
    const cosTheta = Math.cos(input.theta);
    const sinPhi = Math.sin(input.phi);
    const cosPhi = Math.cos(input.phi);
    const freeY = Math.max(MIN_FREE, (input.height - input.bottomInset - FIT_MARGIN) / input.height);
    const freeX = Math.max(MIN_FREE, (input.width - FIT_MARGIN) / input.width);
    const halfWidth = hx * Math.abs(sinTheta) + hy * Math.abs(cosTheta);
    const halfHeight = hx * Math.abs(sinPhi * cosTheta) + hy * Math.abs(sinPhi * sinTheta) + hz * cosPhi;

    return Math.max(halfHeight / (tan * freeY), halfWidth / (tan * (input.width / input.height) * freeX));
};
