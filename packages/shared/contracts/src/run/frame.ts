export const FRAME_MAGIC = 0x4c534652;

export interface FrameBox{
    low: [number, number, number];
    high: [number, number, number];
}

export interface FrameHeader{
    step: number;
    atoms: number;
    box: FrameBox;
    columns: string[];
}

export interface Frame{
    header: FrameHeader;
    positions: Float32Array;
    columns: Record<string, Float32Array>;
}
