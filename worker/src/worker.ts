import path from 'path';
//import {baseConfig} from '#lib/utils/baseConfig.ts'; 
//import { fileURLToPath } from 'url';
import { pathToFileURL } from 'url';
import {getCsgObjArray} from '#lib/function/csgChange.ts' 
import {createStorage} from '#lib/storage-adapter/factory.ts'
import  { StorageAdapter   } from '#lib/storage-adapter/adapter.ts';
import {sendGeometry} from '#lib/function/geoSend.ts'
import { defaultConfig,type baseConfig } from '#lib/utils/baseConfig.ts';
//const __dirname = path.dirname(fileURLToPath(import.meta.url));
// ============ Worker 兼容层 ============
const isNode = typeof process !== 'undefined' && !!process.versions?.node
let nodeParentPort: any = null
if (isNode) {
  try {
    nodeParentPort = (await import('node:worker_threads')).parentPort
  } catch {}
}

const postMain =(msg: any, transfer?: Transferable[]) => {
  if (nodeParentPort) {
    transfer ? nodeParentPort.postMessage(msg, transfer) : nodeParentPort.postMessage(msg)
  } else {
    const w = self as unknown as Worker
    transfer ? w.postMessage(msg, transfer) : w.postMessage(msg)
  }
}

const onMainMessage = (handler: (data: any) => void) => {
  if (nodeParentPort) nodeParentPort.on('message', handler)
  else self.onmessage = (e: MessageEvent) => handler(e.data)
}

let storage:StorageAdapter|undefined =undefined // = createStorage({baseDir:baseConfig.baseDir})
//const config:baseConfig = 
onMainMessage(async (event) => {
  if (event.baseConfig){
    Object.assign(defaultConfig,event.baseConfig)
    storage = createStorage({baseDir:defaultConfig.tmpDir})
  }
  if (event.name) {
    const target = path.resolve(defaultConfig.srcDir  , event.name);
    let fileName = pathToFileURL(target).href
    const mod = await import(fileName);
    await storage?.deleteDirectory(path.join( event.name))
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