import {tmpdir} from 'os'; 
//import { fileURLToPath,pathToFileURL } from 'url';
import { dirname,join } from 'path';
//export const __dirname = dirname(fileURLToPath(import.meta.url));
export type baseConfig = {
    //__dirname?:string,
    Port?:number,
    srcDir:string,uiDir?:string,tmpDir?:string}

export const defaultConfig:baseConfig = { 
    //__dirname:dirname(fileURLToPath(import.meta.url)),
    srcDir : "",
    //uiDir: 'ui',
    tmpDir : join(tmpdir(), 'solidjscad-storage')
}