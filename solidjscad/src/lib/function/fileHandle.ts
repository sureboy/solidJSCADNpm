import type {EntryInfo,ListDirectoryOptions,WriteStream} from "#lib/storage-adapter/types.js"
import {createStorage} from '#lib/storage-adapter/factory.js' 
import {diffUpdate,updateDoc,initDocEasy} from '#lib/utils/yjs.js' 
import { getWorker } from "#lib/worker/globalWorker.js"
export const newPackageCode:string = `/*
import modeling from '@jscad/modeling';
import  manifold from 'manifold-3d';
  const Manifold = await  manifold()
export const manifold_main= (opt)=>{   

  Manifold.setup()
  const option = Object.assign({size:2},opt);   
  const box = Manifold.Manifold.cube(option.size,true);    
  const sphere = Manifold.Manifold.sphere(1.2, 48);     
  const sphereTranslated = sphere.translate([0.8, 0.8, 0.8]); 
  const result = box.subtract(sphereTranslated);
  const meshData = result.getMesh();
  const vertices= meshData.vertProperties;
  const indices = meshData.triVerts;   
  box.delete();
  sphere.delete();
  sphereTranslated.delete();
  result.delete();
  return [{vertices,indices},option]
}
export const main=(opt)=>{
  const option = Object.assign({size:10},opt)
  return [modeling.primitives.cube(option),option]
}
*/`
type myFileHandleType = {
    write:(data:{db:string|ArrayBuffer,origin?:string} )=>Promise<void>,
    writeAndBroad?:(data:{db:string|ArrayBuffer,origin?:string} )=>Promise<void>,
    read:()=>Promise<string>,
    del:()=>Promise<void>,
    createWriteStream(): Promise<WriteStream>
    //list:()=>Promise<string[]>
}
export type DirHandleType = {
    getFileHandle:(name:string)=>myFileHandleType,
    name:string,
    //root:StorageAdapter,
    files:()=>Promise<EntryInfo[]>
}
interface DataChannel  {
    readonly name: string;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/BroadcastChannel/message_event) */
    onmessage?: ((this: BroadcastChannel, ev: MessageEvent) => any)  ;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/BroadcastChannel/messageerror_event) */
    //onmessageerror: ((this: BroadcastChannel, ev: MessageEvent) => any) | null;
    /**
     * The **`close()`** method of the BroadcastChannel interface terminates the connection to the underlying channel, allowing the object to be garbage collected. This is a necessary step to perform as there is no other way for a browser to know that this channel is not needed anymore.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/BroadcastChannel/close)
     */
    close(): void;
    /**
     * The **`postMessage()`** method of the BroadcastChannel interface sends a message, which can be of any kind of Object, to each listener in any browsing context with the same origin. The message is transmitted as a message event targeted at each BroadcastChannel bound to the channel.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/BroadcastChannel/postMessage)
     */
    postMessage(message: any): void;
    //addEventListener<K extends keyof BroadcastChannelEventMap>(type: K, listener: (this: BroadcastChannel, ev: BroadcastChannelEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
    addEventListener:(type: string, listener: (e:MessageEvent)=>void, options?: boolean | AddEventListenerOptions)=> void;
    //removeEventListener<K extends keyof BroadcastChannelEventMap>(type: K, listener: (this: BroadcastChannel, ev: BroadcastChannelEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
    removeEventListener:(type: string, listener: (e:MessageEvent)=>void, options?: boolean | EventListenerOptions)=> void;


}
export type DirInfoType = {
    create?:boolean,
    path:string,
    channeldb?:DataChannel,
    //channeldb?:BroadcastChannel|DataChannel,
    DirHandle?:DirHandleType,
    key?:string
    workerHandle?:(data:any,send?:(data:any)=>void)=>any
    //islocal?:boolean
    Preview?:(data:any)=>any,
    RunWorker?:(name:string)=>void
}

export const getDirHandle =(name:string,create?:ListDirectoryOptions)=>{
  const root = createStorage() 
  const getFileHandle = (file:string ) => {
    const p = `${name}/${file}`  
    return { 
        createWriteStream:()=>{
            return root.createWriteStream(p)
        },
         
        write:async function (data:{db:string|ArrayBuffer,origin?:string} ){
            const handle = initDocEasy(file)
            if (typeof data.db ==="string"){ 
                if (handle){ 
                    diffUpdate(data.db,handle.ydoc,data.origin)
                }
                await  root.writeFile(p,data.db)
            }else{ 
                if (handle){
                    updateDoc(data.db,handle.ydoc,data.origin||"")
                    data.db = handle.ydoc.getText("content").toString()
                    await root.writeFile(p,data.db)
                }
            }
            
        },
        read:async function (){ 
            return await root.readFile(p,'utf8') as string 
        },
        del:function(){
            return root.deleteFile(p)
        }
    } as myFileHandleType
  }
  return {files:()=>root.listFilesInDirectory(name,create),name,getFileHandle} as DirHandleType
}
 
export const createDirInfo = (path:string )=>{
    const f:DirInfoType = {path}
    initFileHandle(f)
    return f
}
const messageChannelListenClient = (FileInfo:DirInfoType )=>{
    const oldHandle = FileInfo.DirHandle!.getFileHandle
    FileInfo.DirHandle!.getFileHandle =function(name:string){ 
        return Object.assign({},oldHandle.call(this,name), {
            write: (data:{db:string|ArrayBuffer,origin?:string})=>{ 
                return new Promise<void>((resolve,reject)=>{ 
                    function w(e:MessageEvent<{type:string,key:string}>){
                        if (e.data.type ==="writeRes" && e.data.key ===FileInfo.key){
                            clearTimeout(timeOut)
                            resolve()
                            FileInfo.channeldb?.removeEventListener("message",w)
                        }                            
                    }
                    const timeOut = setTimeout(()=>{ 
                        FileInfo.DirHandle?.getFileHandle(name).write(data)
                        FileInfo.DirHandle = undefined; 
                        initFileHandle(FileInfo) 
                    },500)
                    FileInfo.channeldb?.addEventListener("message",w)
                    FileInfo.channeldb?.postMessage({name,key:FileInfo.key,data,type:"write"}) 
                })
            },         
        });
    }
}
 
export const initFileHandle = (FileInfo:DirInfoType,initChannnel?:(FileInfo:DirInfoType)=>DataChannel) =>{ 
    
    if (!FileInfo.path)return; 
    if (FileInfo.DirHandle && FileInfo.DirHandle.name === FileInfo.path){
        return
    }
    FileInfo.key =  Date.now().toString(32).slice(4);
    FileInfo.DirHandle = getDirHandle(
        FileInfo.path,{create:FileInfo.create},) 
    if (FileInfo.channeldb)FileInfo.channeldb.close();
    FileInfo.channeldb = initChannnel?initChannnel(FileInfo):(new BroadcastChannel(FileInfo.path+"_db" ) as DataChannel); 

    let workerSet:(string|null)[] = [] 
    const workerRunHistory = new Map<string,string[]>()
    //const workerTmp:any[] = []

    const sendWorkerRun = (data:{key:string,update?:string},postMsg?:(data:any)=>void)=>{
        if (!workerSet)return;
        const runList  = workerRunHistory.get(data.key)  
        let run =null
        if (runList){
            for (let v in runList){
                const i = workerSet.indexOf(v)
                if (i>=0){
                    run = v
                    workerSet[i] = null
                    break
                }
            } 
        } 
        while(run===null){
            run = workerSet.shift()  
        }    
        if (run){
            //workerTmp.push({type:"workerData",run,msg:{ start: true }})
            const db = {
                key:data.key,run,update:data.update,
                //list:workerSet ,
                type:"workerRun"
            }
            //console.log("send worker",db)
            if (postMsg){
                postMsg(db)
            }else{
                FileInfo.channeldb?.postMessage(db) 
            }            
        } 
    }
 
    FileInfo.workerHandle = (data:{
        list?:string[],
        //msg:any,
        onlyInit?:boolean,
        end:boolean,
        run:string,
        update?:string,
        type:string,
        key:string},postMsg?:(data:any)=>void)=>{
            
        switch (data.type){ 
            
            case "workerInit":
                workerSet =  data.list || []
                //sendWorkerRun(data,postMsg)
                if (data.onlyInit)return;
                break;
                
            case "worker":  
            
                //sendWorkerRun(data,postMsg)
                break
            case "workerData":
                if (!data.end){
                    return 
                }
                const runList = workerRunHistory.get(data.key) ||[]
                if (!runList.includes(data.run)){
                    runList.push(data.run)
                    workerRunHistory.set(data.key,runList)
                }
                
                break 
            default:
                return;
        } 
        //console.log(data)
        sendWorkerRun(data,postMsg)
    }
    FileInfo.channeldb?.addEventListener("message",(ev)=>{ 
        FileInfo.workerHandle?.(ev.data,(data)=>{
            FileInfo.channeldb?.postMessage(data)
        }) 
    })
    const oldHandle = FileInfo.DirHandle!.getFileHandle
    FileInfo.RunWorker = (name:string)=>{
        //workerTmp.length = 0
        getWorker().then(w=>{
            w.postMessage({name:decodeURIComponent(name)})
        })
        //return 
    }
    FileInfo.DirHandle!.getFileHandle=function(name:string){ 
        const old = oldHandle.call(this,name)
        return Object.assign({}, old, {
            writeAndBroad: async (data:{db:string|ArrayBuffer,origin?:string})=>{ 
                await old.write(data);
                FileInfo.RunWorker?.(name) 
            }
        })
    } 

    const initHandle =async (ev:MessageEvent<{type:string,list:string[],data:any,name:string,key:string}>)=>{  
        switch (ev.data.type){
            case "write":
                if(ev.data.data && ev.data.name){ 
                    await FileInfo.DirHandle?.getFileHandle(ev.data.name).write?.(ev.data.data)  
                    FileInfo.RunWorker?.(ev.data.name) 
                }
                return; 
            case "init":
                if (ev.data.key === FileInfo.key){ 
                    messageChannelListenClient(FileInfo) 
                    FileInfo.workerHandle  = undefined;
                    FileInfo.channeldb?.removeEventListener("message",initHandle)
                }else{
                    FileInfo.channeldb?.postMessage(ev.data)
                } 
                return 
        }     
    }
    FileInfo.channeldb?.addEventListener("message",initHandle) 
    FileInfo.channeldb?.postMessage({type:"init",key:FileInfo.key}) 
}