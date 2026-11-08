import { ShaderMaterial, Vector3 } from 'three';
import type { IUniform } from 'three';

export type AtomUniforms = {
    uScale: IUniform<number>;
    uSize: IUniform<number>;
    uRadius: IUniform<number>;
    uBg: IUniform<Vector3>;
    uCueNear: IUniform<number>;
    uCueFar: IUniform<number>;
    uCue: IUniform<number>;
};

const ATOM_VERTEX = `
attribute vec3 aColor;
uniform float uScale;
uniform float uSize;
uniform float uRadius;
varying vec3 vColor;
varying float vDepth;
void main() {
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mv.z;
    gl_PointSize = max(1.5, uRadius * uSize * uScale / -mv.z);
    gl_Position = projectionMatrix * mv;
}`;

const ATOM_FRAGMENT = `
precision highp float;
varying vec3 vColor;
varying float vDepth;
uniform vec3 uBg;
uniform float uCueNear;
uniform float uCueFar;
uniform float uCue;
void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float d2 = dot(p, p);
    if (d2 > 1.0) discard;
    vec3 n = vec3(p.x, -p.y, sqrt(1.0 - d2));
    vec3 L = normalize(vec3(-0.42, 0.62, 0.72));
    float diff = max(dot(n, L), 0.0);
    float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 30.0);
    float rim = smoothstep(0.62, 1.0, d2);
    vec3 c = vColor * (0.34 + 0.74 * diff) + vec3(0.2 * spec);
    c *= 1.0 - 0.42 * rim;
    float cue = smoothstep(uCueNear, uCueFar, vDepth) * uCue;
    gl_FragColor = vec4(mix(c, uBg, cue), 1.0);
}`;

export const createAtomUniforms = (): AtomUniforms => {
    return {
        uScale: { value: 1 },
        uSize: { value: 1 },
        uRadius: { value: 1 },
        uBg: { value: new Vector3(1, 1, 1) },
        uCueNear: { value: 0 },
        uCueFar: { value: 1 },
        uCue: { value: 0 }
    };
};

export const createAtomMaterial = (uniforms: AtomUniforms): ShaderMaterial => {
    return new ShaderMaterial({
        vertexShader: ATOM_VERTEX,
        fragmentShader: ATOM_FRAGMENT,
        uniforms
    });
};
