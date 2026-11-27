import {
  clearCurrent,
  handleCurrentMsg,
  getCurrent,
  objUrlMap,type currentObj} from 'worker/src/lib/function/ImportParser'
import {getCsgObjArray} from 'worker/src/lib/function/csgChange' 
import {createStorage} from 'worker/src/lib/storage-adapter/factory'
import { StorageAdapter } from 'worker/src/lib/storage-adapter/adapter.ts';
//import tsBlankSpace from "ts-blank-space"; 
import {parseError} from 'worker/src/lib/utils/parseError';
import {postMain,onMainMessage,getTransferableList} from 'worker/src/lib/utils/workerLib.ts';  
const includeImport:{[key:string]:string} = {}
const defaultOption:{
  list:string[],
  option:{[key:string]:any},name:string,mod:{[key:string]:any}} = {
  //main:"main",
  list:[],
  option:{},
  name:"./index.js",
  mod:{},
  //dist:new Map<string,any[]>()
}
 
const globalOption:{
  rootUrl?:string
  option:{[k:string]:any}
  DirHandle?:StorageAdapter
} = {
  option:{}
}

fetch("/lib/include_import.json").then(r=>{
  if (r.ok){
    r.json().then(db=>{
      Object.assign(includeImport,db)
    })
  }
})
const postMsg =async (e:any)=>{
  console.log("postMsg",e.path)
  if (!e.path){  
    return
  }
  const ispath = (e.path as string).startsWith('./')
  if (ispath){
    try{  
      let db = await globalOption.DirHandle?.readFile(e.path ,"utf8") 
      //if ((e.path as string).endsWith(".ts")){
      //  db = tsBlankSpace(db)
      //}
      handleCurrentMsg({ db,name:e.path },postMsg)   
      return
    }catch(err){   
    } 
  }
  
  const p = includeImport[e.path]  
  if (p){
    handleCurrentMsg({name:e.path})!.getUri = async ()=>new URL(
      p ,
      new URL(import.meta.url).origin).toString();  
    return;
  }
 
  if (!ispath){

    let rootUri= new URL(import.meta.url).origin
 
    handleCurrentMsg({name:e.path})!.getUri = async ()=>{
      return new URL(
      "/modules/"+e.path ,
      rootUri).toString();
    } 
    return
  } 
  handleCurrentMsg({name:e.path})!.getUri = async ()=>{
      const uri= new URL(
      e.path ,
      globalOption.rootUrl).toString();  
      return uri
    }
}
const errHandle =async (e:Error)=>{
  const err =await parseError(e  ,async (frame)=>{
      if (!frame.fileName){
        return
      } 
      const name =objUrlMap.get(frame.fileName) 
      if (name){ 
        const source = frame.source?.replace(frame.fileName,name)
        const c = await getCurrent(name)  
        Object.assign(frame,{name,source,fileText:c.db})
      }
    })
  self.postMessage({err})
  //fetch("/err",{method:"POST",body:err})
  console.error(e)
}
onMainMessage(async (event) => { 
  if (event.option){
    defaultOption.option =Object.assign(defaultOption.option,event.option) 
  } 
  if (event.reload){
    defaultOption.option={}
  }
  if (event.remote){
    console.log(event)
    globalOption.rootUrl = event.remote.rootUrl
    globalOption.DirHandle = createStorage({remote:event.remote})
  }
  if (event.name || event.tag){
     postMain({start:true})
  }
  if (event.name  ) { 
   
    const cur =await getCurrent(event.name,postMsg)
    const fileName = await cur.getUri()  
    try{
      const mod = await import(/* @vite-ignore */fileName ); 
      defaultOption.mod = mod
      defaultOption.list  =[]// new Set<string>() 
      const fnlist = Object.keys(mod)
      //let opt:{[k:string]:any}={}
      fnlist.forEach(l=>{
        if (l==="default"){
          Object.assign(defaultOption.option,mod[l]) 
          return
        }
        if (typeof mod[l] ==="function"){
          defaultOption.list.push(l)
          //fnlistSet.add(l)
        }else{
          defaultOption.option[l] = mod[l]
        }
      }) 
      //const list = [...fnlistSet]
      postMain({list:defaultOption.list ,option:defaultOption.option,tag:event.tag||""})  
    }catch(e){
      errHandle(e as Error)
      
    }
  }

  if (  event.tag) { 
    try{
      let tag = event.tag as string
      console.log(tag,defaultOption.list)
      if (!defaultOption.list.includes(tag)){
        if (!defaultOption.list.includes("main"))
          tag = defaultOption.list[0]
        else
          tag = "main"
      } 
      //Object.assign(opt,defaultOption.option)
      //console.log(list) 
     
      let db = defaultOption.mod[ tag ](defaultOption.option)
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
        
      })
    }catch(e){
      errHandle(e as Error)
      //console.error(e)
    }
    postMain({end:event.tag})
    //console.log(mod,mod['bottom']() )
  }
})
export {};