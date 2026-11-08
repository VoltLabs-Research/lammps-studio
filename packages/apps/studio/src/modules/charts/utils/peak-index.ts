export const peakIndex = (values: number[]): number => {
    let best = 0;

    for(let index = 1; index < values.length; index++){
        if(values[index] > values[best]){
            best = index;
        }
    }

    return best;
};
