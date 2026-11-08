import type { ValueRange } from '@/modules/viewport/domain/scene';

export const columnRange = (values: Float32Array): ValueRange => {
    let min = Infinity;
    let max = -Infinity;

    for(let i = 0; i < values.length; i++){
        const value = values[i];

        if(value < min){
            min = value;
        }
        if(value > max){
            max = value;
        }
    }

    return {
        min,
        max
    };
};
