import path from 'path';
//import { Worker } from 'worker_threads';
import {postMain,onMainMessage,getTransferableList} from '#lib/utils/workerLib.ts'; 
//import { fileURLToPath } from 'url';
import { pathToFileURL } from 'url';
import {getCsgObjArray} from '#lib/function/csgChange.ts' 
import {createStorage} from '#lib/storage-adapter/factory.ts'
import  { StorageAdapter   } from '#lib/storage-adapter/adapter.ts';
import {sendGeometry} from '#lib/function/geoSend.ts'
import { defaultConfig,type baseConfig } from '#lib/utils/baseConfig.ts';
//const __dirname = path.dirname(fileURLToPath(import.meta.url));
//import { fileURLToPath } from 'url';
//import { dirname, join } from 'node:path';

let storage:StorageAdapter|undefined =undefined // = createStorage({baseDir:baseConfig.baseDir})
const defaultOption = {
  main:"main",
  option:{},
  name:"./index.js",
  //dist:new Map<string,any[]>()
}
onMainMessage(async (event) => {
  if (event.baseConfig){
    Object.assign(defaultConfig,event.baseConfig)
    storage = createStorage({baseDir:defaultConfig.tmpDir})
    //createChileWorker()
  }
  if (event.option){
    Object.assign(defaultOption.option,event.option)
  }
  if (event.main){
    defaultOption.main = event.main
  }
  if (event.buffer){
    //postMain()
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
    const mainList = [...fnlistSet]
   
    if (!fnlistSet.has(defaultOption.main)){
      if (!fnlistSet.has("main"))
        defaultOption.main = mainList[0]
      else
        defaultOption.main = "main"
    }
     postMain({mainList ,opt,main:defaultOption.main}) 
    //defatuleOption.main = fnlistSet.has(defatuleOption.main)?defatuleOption.main:mainList[0]
    let db = mod[ defaultOption.main ](Object.assign(opt,defaultOption.option))
    if (db.then){
      db = await db
    }
    //let index = 0
    await getCsgObjArray(db,async (msg: any)=>{
      //console.log(msg)
      if (!msg.index)return; 
      let transfer:Transferable[] = []
      getTransferableList(msg,transfer)
      postMain(msg,transfer)
      /*
      await sendGeometry(
        {
          send: async (val) => {
            //console.log(val)
            index++
            const tmpPart = path.join( event.name  ,defatuleOption.main,`${index}.tmp`)
            await storage?.writeFile(tmpPart,val)
            postMain({tmpPart,run:defatuleOption.main})
          },
        },
        msg as any,
      )  */        
    })
  
    postMain({end:true})
    //console.log(mod,mod['bottom']() )
  }
})
export {}