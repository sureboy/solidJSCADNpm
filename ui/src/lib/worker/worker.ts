import {
  clearCurrent,
  handleCurrentMsg,
  getCurrent,
  objUrlMap,type currentObj} from 'worker/src/lib/function/ImportParser'
import {getCsgObjArray} from 'worker/src/lib/function/csgChange' 
import {createStorage} from 'worker/src/lib/storage-adapter/factory'
import { StorageAdapter } from 'worker/src/lib/storage-adapter/adapter.ts';
import tsBlankSpace from "ts-blank-space";
//import {sendGeometry} from '$lib/function/geoSend'
//import {parseError} from '#lib/utils/parseError.ts';
//import {type DirInfoType,createDirInfo} from "worker/src/lib/function/fileHandle"
import {postMain,onMainMessage,getTransferableList} from 'worker/src/lib/utils/workerLib.ts';  
const includeImport:{[key:string]:string} = {
  "@jscad/modeling": "./lib/modeling.esm.js",
  //"csgChange": "./lib/csgChange.js",
  "manifold-3d":"./lib/manifold/manifold.js"
}
const defaultOption = {
  //main:"main",
  option:{},
  name:"./index.js",
  //dist:new Map<string,any[]>()
}
/*
import {type csgObj } from "$lib/function/csg2Three";
const sendGeometry = (
  channel: {send:(db:any)=>void},
  obj: csgObj,
  options: { smooth?: boolean } = {}
)=>{
  console.log(1)
}*/
const globalOption:{
  baseUrl?:string
  option:{[k:string]:any}
  DirHandle?:StorageAdapter
} = {
  option:{}
}
//const rst = createStorage({remote:{baseUrl:"http://localhost:3000/src/"}})
const postMsg =async (e:any)=>{
  console.log("postMsg",e.path)
  if (e.path){  
    try{  
      let db = await globalOption.DirHandle?.readFile(e.path,"utf8") 
      if ((e.path as string).endsWith(".ts")){
        db = tsBlankSpace(db)
      }
      handleCurrentMsg({ db,name:e.path },postMsg)   
    }catch(err){  
      //console.error(err,globalOption,e)
      handleCurrentMsg({name:e.path})!.getUri = async ()=>new URL(
      includeImport[e.path] ||e.path  ,
      globalOption.baseUrl).toString();    
    } 
  }  
}
onMainMessage(async (event) => { 
  if (event.option){
    defaultOption.option =Object.assign(defaultOption.option,event.option)
    //console.log("opt",JSON.stringify(defaultOption.option),event.option)
  } 
  if (event.reload){
    defaultOption.option={}
  }
  if (event.remote){
    console.log(event)
    globalOption.baseUrl = event.remote.baseUrl
    globalOption.DirHandle = createStorage({remote:event.remote})
  }
  if (event.name && event.tag) {
    //console.log()
    
    const cur =await getCurrent(event.name,postMsg)
    const fileName = await cur.getUri() 
    //console.log(db)
    
    
    try{
      /*
      const res = await fetch(fileName)
      if (!res.ok)
        return
      const src =await res.text()
      console.log(src)
      return*/
      const  mod = await import(/* @vite-ignore */fileName ); 
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
      const list = [...fnlistSet]
      let tag = event.tag
      if (!fnlistSet.has(tag)){
        if (!fnlistSet.has("main"))
          tag = list[0]
        else
          tag = "main"
      }

      Object.assign(opt,defaultOption.option)
      console.log(list)
      //console.log(opt.DefaultOpt.miniWheelopt.gA)
      postMain({list ,option:opt,tag})  
    
      let db = mod[ tag ](opt)
      if (db.then){
        db = await db
      }
      //let index = 0
      //console.log(db)
      await getCsgObjArray(db,async (msg: any)=>{
        //console.log(msg)
        if (!msg.index)return; 
        let transfer:Transferable[] = []
        msg.tag = tag
        //msg.main = main
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
    }catch(e){
      console.error(e)
    }
    postMain({end:true})
    //console.log(mod,mod['bottom']() )
  }
})
export {};