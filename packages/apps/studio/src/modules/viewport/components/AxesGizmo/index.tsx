import { Vector3 } from 'three';
import type { AxesGizmoProps, AxisArm } from '@/modules/viewport/domain/components';
import '@/modules/viewport/components/AxesGizmo/axes-gizmo.css';

const ARM_LENGTH = 19;
const LABEL_REACH = 1.3;
const LABEL_BASELINE = 3.5;
const DIGITS = 1;

const AXES = [
    { name: 'x', direction: new Vector3(1, 0, 0), color: 'var(--danger)' },
    { name: 'y', direction: new Vector3(0, 1, 0), color: 'var(--success)' },
    { name: 'z', direction: new Vector3(0, 0, 1), color: 'var(--info)' }
];

const AxesGizmo = ({ view }: AxesGizmoProps) => {
    const arms: AxisArm[] = AXES
        .map(({ name, direction, color }) => {
            const projected = direction.clone().transformDirection(view);

            return { name, color, x: projected.x * ARM_LENGTH, y: -projected.y * ARM_LENGTH, z: projected.z };
        })
        .sort((a, b) => a.z - b.z);

    return (
        <svg className='vp-axes' viewBox='-32 -32 64 64' aria-hidden='true'>
            {arms.map((arm) => (
                <g key={arm.name}>
                    <line x1='0' y1='0' x2={arm.x.toFixed(DIGITS)} y2={arm.y.toFixed(DIGITS)} stroke={arm.color} strokeWidth='2' strokeLinecap='round' fill='none' />
                    <text x={(arm.x * LABEL_REACH).toFixed(DIGITS)} y={(arm.y * LABEL_REACH + LABEL_BASELINE).toFixed(DIGITS)} textAnchor='middle'>{arm.name}</text>
                </g>
            ))}
            <circle cx='0' cy='0' r='2' fill='var(--muted)' />
        </svg>
    );
};

export default AxesGizmo;
