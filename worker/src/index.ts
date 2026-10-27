import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import { dirname, join } from 'node:path';
import {type baseConfig,defaultConfig} from '#lib/utils/baseConfig.ts'
export { startHttp } from './http.ts';

//const workerPath = import.meta.resolve('./worker.ts');
//const worker = new Worker(pathToFileURL(workerPath));
let worker:Worker|undefined = undefined

export const startWorker = (opt:baseConfig)=>{ 
  //startHttp()
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const workerPath = join(__dirname, 'worker.ts');
  worker = new Worker(workerPath) 
  new Promise<void>((resolve, reject) => {
    worker?.once('exit', (code:any) => {
      if (code === 0) resolve();
      else reject(new Error(`worker exited with code ${code}`));
    });
    worker?.once('error', reject);   // 别漏了 error，否则错误会挂住
  }); 

  //worker.on('message',(val)=>{
  //  console.log(val)
  //})
  worker.postMessage({baseConfig:Object.assign({},defaultConfig,opt)})
  return worker
}
export const postMessage = (msg:any)=>{
  worker?.postMessage(msg)
}