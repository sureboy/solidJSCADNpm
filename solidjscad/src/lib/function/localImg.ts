 
export const createPng = (el:HTMLCanvasElement )=> {
    //console.log("get png")
    const screenCanvas = document.createElement('canvas');
    const ctx = screenCanvas.getContext("2d")
    if (!ctx){
        return
    }
    //ctx.d
    //const img = new Image()
    //img.src = el.toDataURL()
    //img.onload = ()=>{
    
        screenCanvas.width  = el.width
        screenCanvas.height = el.height
        ctx.drawImage(el,0,0)
        const imagedata = ctx.getImageData(0, 0, el.width, el.height)
        let imgData = imagedata.data
        let minX = el.width;
        let minY = el.height;
        let maxX = -1;
        let maxY = -1;
        for (let y = 0; y < el.height; y++) {
        for (let x = 0; x < el.width; x++) {
            const index = (y * el.width + x) * 4; 
            const red = imgData[index];
            const green = imgData[index + 1];
            const blue = imgData[index + 2]; 
            if (red === 0 && green === 0 && blue === 0) {
                continue
            } else {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }
        }
        const croppedWidth = maxX - minX + 1;
        const croppedHeight = maxY - minY + 1;
        screenCanvas.width = croppedWidth;
        screenCanvas.height = croppedHeight; 
        //console.log(minX, minY, maxX, maxY,croppedWidth,croppedHeight)
        ctx.drawImage(el, minX, minY, croppedWidth, croppedHeight, 0, 0, croppedWidth, croppedHeight);
        //URL.revokeObjectURL(img.src); 
        //back(screenCanvas);
        return screenCanvas
    //};
}