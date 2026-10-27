import {
  clearCurrent,
  handleCurrentMsg,
  getCurrent,
  objUrlMap,type currentObj} from '#lib/function/ImportParser.js'
import {getCsgObjArray} from '#lib/function/csgChange.js' 
import {sendGeometry} from '#lib/function/geoSend.js'
import {parseError} from '#lib/utils/parseError.js';
import {type DirInfoType,createDirInfo} from "#lib/function/fileHandle.js"

const includeImport:{[key:string]:string} = {
  "@jscad/modeling": "./lib/modeling.esm.js",
  //"csgChange": "./lib/csgChange.js",
  "manifold-3d":"./lib/manifold/manifold.js"
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
  //basename?:string
  option:{[k:string]:any}
  DirHandle?:DirInfoType
} = {
  option:{}
}
const readFile =async (name:string)=>{
  try{
    const res =await fetch(new URL(name,new URL(import.meta.url).origin)) 
    if (!res.ok){
      return
    }
    const v = await res.blob() 
    return await  v.text() 
  }catch(e){
    console.error(e)
    return
  }
 
}
const postMessage = async (e:any)=>{
  //if ()
  //let db
  let p = includeImport[e.path]
  if (!p){
    //db = e.path
    try{
      handleCurrentMsg({name:e.path,db:await readFile(e.path)},postMessage)
      return
    }catch(err){
      console.error(err)
    }
  } 
  const cur = handleCurrentMsg({name:e.path })
  cur.getUri = async ()=>new URL( p||e.path,new URL(import.meta.url).origin).toString(); 
  
}
const postMessage1 = async (e:any)=>{ 
  console.log("postMsg",e.path)
  if (e.path){  
    try{ 
      const res =await fetch(new URL(e.path,new URL(import.meta.url).origin)) 
      if (!res.ok){

      }
        const v = await res.blob() 
        const db =await  v.text()  
        handleCurrentMsg({ db,name:e.path },postMessage) 
      
       /*
      //const name = 
      const handle =globalOption.DirHandle?.DirHandle?.getFileHandle(
        encodeURIComponent(e.path),
      ) 
      
      if (handle){
        const db = await handle.read()
        //console.log("postMsg read",db)
        handleCurrentMsg({ db,name:e.path },postMessage) 
        //console.log("postMsg init",cur)
      }*/
      
    }catch(err){  
      console.error(err )
      
      //if (cur)
      //console.log(cur)
      //const u=includeImport[e.path]
      //if (u){
        const cur = handleCurrentMsg({name:e.path})
        cur.getUri = async ()=>new URL( includeImport[e.path]||e.path,new URL(import.meta.url).origin).toString();  
      //}else{
        //handleCurrentMsg({name:e.path},postMessage)
      //}
      
      //console.log(await cur.getUri())
    } 
  }  
}
const getIndex = (c:currentObj )=>{
  if (c.persons && c.persons.size>0){
    const li:currentObj[] = []
    c.persons.forEach(_c=>{
      const _c_ = getIndex(_c)
      if (li.includes(_c_)){
        return
      }
      li.push(_c_) 
    })
    return li[0] 
  }else{
    //li.add(c)
    return c
  } 
}
//  console.log("listen worker")
const runCode = async (indexCurrent:currentObj,update?:string)=>{
  self.postMessage({ startTicker: true,update }); 
  globalOption.DirHandle?.channeldb?.removeEventListener("message",runHandle)
  const u = await indexCurrent.getUri() 
  //console.log(indexCurrent,u)
  const src = await  import(/* @vite-ignore */u) 
  const fnlist = Object.keys(src)
  if (!fnlist){
    throw "not have function"
  } 
  const fnlistSet = new Set<string>() 
  let opt:{[k:string]:any}={}
  fnlist.forEach(l=>{
    if (l==="default"){
      Object.assign(opt,src[l])
      //opt['def'] = src[l]
      return
    }
    if (typeof src[l] ==="function"){
      fnlistSet.add(l)
    }else{
      opt[l] = src[l]
    }
  }) 
  const workerHandle =async (ev:MessageEvent<{
    type:string,run?:string,key:string,msg:any,end:boolean}>)=>{
    switch (ev.data.type){
      case "workerRun":
        if (ev.data.key !== globalOption.DirHandle?.key  ){ 
          return;
        }
        if (!ev.data.run ){
          return
        }
        if (!fnlistSet.has(ev.data.run)){
          return
        }
        //globalOption.DirHandle?.channeldb?.postMessage({type:"workerData",run:ev.data.run,msg:{ start: true }})
        fnlistSet.delete(ev.data.run)  
        //console.log(ev.data,globalOption.DirHandle?.key) 
        let tmpDB = src[ev.data.run](globalOption.option)
        if (tmpDB.then){
          tmpDB = await tmpDB
        }
        //console.log("worker open",ev.data.run,tmpDB)
        await getCsgObjArray(tmpDB,async(msg:any)=>{ 
          
          // console.log(msg)
          if (msg.type==="mesh") 
            await sendGeometry({send:(db)=>{ 
              globalOption.DirHandle?.channeldb?.postMessage({
                key:globalOption.DirHandle.key,
                update,
                type:"workerData",mesh:true,run:ev.data.run,msg:{db} 
              })  
            }},msg as any)
          else  
            globalOption.DirHandle?.channeldb?.postMessage({
              key:globalOption.DirHandle.key,
              update,
              type:"workerData",run:ev.data.run,msg 
            })
        })  
        globalOption.DirHandle?.channeldb?.postMessage({
          update,
          key:globalOption.DirHandle.key,
          type:"workerData",run:ev.data.run,  end: true })
        break;
      case "workerData":
        if (!ev.data.run || !fnlistSet.has(ev.data.run)){
          return
        }
        if (ev.data.end){ 
          fnlistSet.delete(ev.data.run)
        }
        //self.postMessage(Object.assign(ev.data.msg,{tag:ev.data.run}),getArrayBufferList(ev.data.msg) )
        break
      default:
        return
    }
    if (fnlistSet.size>0){ 
      return
    }
    globalOption.DirHandle?.channeldb?.removeEventListener("message",workerHandle) 
    self.postMessage({ stopTicker: true }); 
    globalOption.DirHandle?.channeldb?.addEventListener("message",runHandle)
  }
  globalOption.DirHandle?.channeldb?.addEventListener("message",workerHandle)
  return {fnlistSet,opt}
} 
const RunCode =async (
  indexCurrent:currentObj,
  initOption:boolean = true,
  update?:string  ,
  postMsg?:(db:any)=>void,
)=>{
  
  try{ 
    const {fnlistSet,opt} = await runCode(indexCurrent,update)
 
    if (initOption ){
      if (opt){
        //let def = src['default']()
        //globalOption.Option = 
        //if (def.then){
        //  def = await def
        //} 
        Object.assign(globalOption.option,opt)
        //fnlistSet.delete("default")
      }
      const db = {
        key:globalOption.DirHandle?.key,
        type:"workerInit",
        list:[...fnlistSet] ,
        name:indexCurrent.name,
        update,
        option:globalOption.option 
      }
      postMsg?.(db)
      //console.log(db)
      //globalOption.DirHandle?.channeldb?.postMessage(db)
    }else{
      //if (fnlistSet.has("default")){
      //  fnlistSet.delete("default")
      //}
      postMsg?.({
              type:"worker",
              //run:true,
              update,//:e.data.update,//?true:false,
              //list:e.data.list,
              //path:globalOption.DirHandle.path,
              key:globalOption.DirHandle?.key
            })
    }
    const module = {
      list:[...fnlistSet],
      path:globalOption.DirHandle?.path,
      option:globalOption.option
    } 
    self.postMessage({module,update}) 
  }catch(err){
    //globalOption.indexCurrent=undefined
    self.postMessage({err:parseError(err as Error,objUrlMap)})
    //throw err 
    console.error(err)
  } 
  //globalOption.DirHandle?.channeldb?.addEventListener("message",runHandle)
}

const runHandle =(e:MessageEvent<{
  list:any,type:string,name:string,update?:string,option:any}>)=>{
  switch (e.data.type){  
    case "workerInit":
      if (!e.data.list){
        return;
      }
      
      if (
        e.data.option 
        //&& (!globalOption.option || e.data.onlyInit)
      ){
        Object.assign(globalOption.option , e.data.option)
      }
      console.log("init",e.data,globalOption.option)
      if (e.data.name){
        //handleCurrentMsg({})
        if (!e.data.update){
          clearCurrent()
        }
        getCurrent(e.data.name,postMessage).then(cur=>{
          //console.log("run",e.data)
          RunCode(cur,false,e.data.update,(db)=>{ 
            globalOption.DirHandle?.channeldb?.postMessage(db)
          })          
        })
      }      
      return;
  }
}
self.onmessage   = async (event: MessageEvent) => {  

  if ( event.data.path){ 
    if (
      !globalOption.DirHandle || 
      globalOption.DirHandle.path !== event.data.path 
    ){  
      globalOption.DirHandle = createDirInfo(event.data.path);
    }
    self.postMessage({type:"init"}) 
  } 
  if (event.data.name ){
    if (!event.data.update){
      clearCurrent()
    }
    //console.log("run code")
    await RunCode(
      await getCurrent(event.data.name,postMessage),
      true,
      event.data.update ,
      (db)=>{
        //console.log("main",db)
        globalOption.DirHandle?.channeldb?.postMessage(db)
      }
    ); 
  }  else{
    globalOption.DirHandle?.channeldb?.addEventListener("message",runHandle)
  }
};
 

export {};