import type { Frame, FrameBox, FrameHeader } from '@lammps-studio/contracts/run/frame';
import { FRAME_MAGIC } from '@lammps-studio/contracts/run/frame';
import { FrameErrors } from '../shared/errors';

const PREFIX_BYTES = 8;
const FLOAT_BYTES = 4;
const HEADER_ALIGNMENT = 4;
const SPACE = 0x20;
const AXES = 3;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const isVector = (value: unknown): value is [number, number, number] => {
    return Array.isArray(value) && value.length === AXES && value.every((entry) => typeof entry === 'number');
};

const isBox = (value: unknown): value is FrameBox => {
    return typeof value === 'object' && value !== null && 'low' in value && 'high' in value && isVector(value.low) && isVector(value.high);
};

const isHeader = (value: unknown): value is FrameHeader => {
    if(typeof value !== 'object' || value === null || !('step' in value && 'atoms' in value && 'box' in value && 'columns' in value)){
        return false;
    }

    return Number.isInteger(value.step)
        && Number.isInteger(value.atoms)
        && Number(value.atoms) >= 0
        && isBox(value.box)
        && Array.isArray(value.columns)
        && value.columns.every((column) => typeof column === 'string');
};

export const encodeFrame = (frame: Frame): ArrayBuffer => {
    const { header } = frame;
    const json = encoder.encode(JSON.stringify(header));
    const headerBytes = Math.ceil(json.length / HEADER_ALIGNMENT) * HEADER_ALIGNMENT;
    const floats = header.atoms * (AXES + header.columns.length);
    const buffer = new ArrayBuffer(PREFIX_BYTES + headerBytes + floats * FLOAT_BYTES);
    const view = new DataView(buffer);

    view.setUint32(0, FRAME_MAGIC, true);
    view.setUint32(FLOAT_BYTES, headerBytes, true);

    const headerView = new Uint8Array(buffer, PREFIX_BYTES, headerBytes);
    headerView.fill(SPACE);
    headerView.set(json);

    const body = new Float32Array(buffer, PREFIX_BYTES + headerBytes, floats);
    body.set(frame.positions);
    header.columns.forEach((name, index) => {
        body.set(frame.columns[name], header.atoms * (AXES + index));
    });

    return buffer;
};

const readHeader = (buffer: ArrayBuffer): FrameHeader => {
    if(buffer.byteLength < PREFIX_BYTES){
        throw FrameErrors.Truncated(`${buffer.byteLength} bytes`);
    }

    const view = new DataView(buffer);
    if(view.getUint32(0, true) !== FRAME_MAGIC){
        throw FrameErrors.BadMagic(view.getUint32(0, true).toString(16));
    }

    const headerBytes = view.getUint32(FLOAT_BYTES, true);
    if(headerBytes % HEADER_ALIGNMENT !== 0 || PREFIX_BYTES + headerBytes > buffer.byteLength){
        throw FrameErrors.BadHeader(`header of ${headerBytes} bytes`);
    }

    const header: unknown = JSON.parse(decoder.decode(new Uint8Array(buffer, PREFIX_BYTES, headerBytes)));
    if(!isHeader(header)){
        throw FrameErrors.BadHeader('unexpected header shape');
    }

    return header;
};

export const decodeFrame = (buffer: ArrayBuffer): Frame => {
    const header = readHeader(buffer);
    const offset = PREFIX_BYTES + new DataView(buffer).getUint32(FLOAT_BYTES, true);
    const floats = header.atoms * (AXES + header.columns.length);

    if(offset + floats * FLOAT_BYTES !== buffer.byteLength){
        throw FrameErrors.Truncated(`expected ${offset + floats * FLOAT_BYTES} bytes, got ${buffer.byteLength}`);
    }

    const columns = Object.fromEntries(header.columns.map((name, index) => [
        name,
        new Float32Array(buffer, offset + header.atoms * (AXES + index) * FLOAT_BYTES, header.atoms)
    ]));

    return {
        header,
        positions: new Float32Array(buffer, offset, header.atoms * AXES),
        columns
    };
};
