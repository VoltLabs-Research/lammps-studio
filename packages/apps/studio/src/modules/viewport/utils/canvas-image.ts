const PNG = 'image/png';

export const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if(blob){
                resolve(blob);
                return;
            }

            reject(new DOMException('The canvas could not be encoded as PNG', 'EncodingError'));
        }, PNG);
    });
};

export const blobToDataUrl = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
};
