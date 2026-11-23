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
const includeImport:{[key:string]:string} = {}
const defaultOption = {
  //main:"main",
  option:{},
  name:"./index.js",
  //dist:new Map<string,any[]>()
}
 
const globalOption:{
  rootUrl?:string
  option:{[k:string]:any}
  DirHandle?:StorageAdapter
} = {
  option:{}
}
/*
fetch("/lib/include_import.json").then(r=>{
  if (r.ok){
    r.json().then(db=>{
      Object.assign(includeImport,db)
    })
  }
})*/
const postMsg =async (e:any)=>{
  console.log("postMsg",e.path)
  if (!e.path){  
    return
  }
  const ispath = (e.path as string).startsWith('./')
  if (ispath){
    try{  
      let db = await globalOption.DirHandle?.readFile(e.path ,"utf8") 
      if ((e.path as string).endsWith(".ts")){
        db = tsBlankSpace(db)
      }
      handleCurrentMsg({ db,name:e.path },postMsg)   
      return
    }catch(err){   
    } 
  }
  /*
  const p = includeImport[e.path]  
  if (p){
    handleCurrentMsg({name:e.path})!.getUri = async ()=>new URL(
      p ,
      new URL(import.meta.url).origin).toString();  
    return;
  }*/
 
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
  if (event.name && event.tag) { 
    const cur =await getCurrent(event.name,postMsg)
    const fileName = await cur.getUri()  
    try{
      const  mod = await import(/* @vite-ignore */fileName ); 
      const fnlistSet = new Set<string>() 
      const fnlist = Object.keys(mod)
      let opt:{[k:string]:any}={}
      fnlist.forEach(l=>{
        if (l==="default"){
          Object.assign(opt,mod[l]) 
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
      //console.log(list) 
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
        
      })
    }catch(e){
      console.error(e)
    }
    postMain({end:true})
    //console.log(mod,mod['bottom']() )
  }
})
export {};