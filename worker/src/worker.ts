import path from 'path';
import { Worker } from 'worker_threads';
import {postMain,onMainMessage} from '#lib/utils/workerLib.ts'; 
//import { fileURLToPath } from 'url';
import { pathToFileURL } from 'url';
import {getCsgObjArray} from '#lib/function/csgChange.ts' 
import {createStorage} from '#lib/storage-adapter/factory.ts'
import  { StorageAdapter   } from '#lib/storage-adapter/adapter.ts';
import {sendGeometry} from '#lib/function/geoSend.ts'
import { defaultConfig,type baseConfig } from '#lib/utils/baseConfig.ts';
//const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { fileURLToPath } from 'url';
import { dirname, join } from 'node:path';

let storage:StorageAdapter|undefined =undefined // = createStorage({baseDir:baseConfig.baseDir})
//const config:baseConfig = 
const workerPool = []
const createChileWorker = ()=>{
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const workerPath = join(__dirname, 'childWorker.ts');
  const num = defaultConfig.workerNum || 2
  for (let i=0;i<num;i++){
    const worker = new Worker(workerPath) 
    workerPool.push({busy:false,worker})
  }


}
onMainMessage(async (event) => {
  if (event.baseConfig){
    Object.assign(defaultConfig,event.baseConfig)
    storage = createStorage({baseDir:defaultConfig.tmpDir})
    createChileWorker()
  }
  if (event.name) {
    const target = path.resolve(defaultConfig.srcDir  , event.name);
    let fileName = pathToFileURL(target).href 
    await storage?.deleteDirectory(path.join("", event.name))
    const  mod = await import(`${fileName}?v=${Date.now()}`); 
    const fnlistSet = new Set<string>() 
    const fnlist = Object.keys(mod)
    let opt:{[k:string]:any}={}
    fnlist.forEach(l=>{
      if (l==="default"){
        Object.assign(opt,mod[l])
        //opt['def'] = src[l]
        return
      }
      if (typeof mod[l] ==="function"){
        fnlistSet.add(l)
      }else{
        opt[l] = mod[l]
      }
    }) 


    
    //  const src = await import(path.join(__dirname,event.name))
    const mainList:string[] = []
    
    for (let k of Object.keys(mod)){
      if (typeof mod[k] === "function"){
        let db = mod[k]()
        if (db.then){
          db = await db
        }
        mainList.push(k)
        let index = 0
        await getCsgObjArray(db,async (msg: any)=>{
          //console.log(msg)
          await sendGeometry(
            {
              send: async (val) => {
                //console.log(val)
                index++
                const tmpPart = path.join( event.name  ,k,`${index}.tmp`)
                await storage?.writeFile(tmpPart,val)
                postMain({tmpPart,run:k})
              },
            },
            msg as any,
          )          
        })
      }
    }
    postMain({mainList})
    postMain({end:true})
    //console.log(mod,mod['bottom']() )
  }
})
export {}