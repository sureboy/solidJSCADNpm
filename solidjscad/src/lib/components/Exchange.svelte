<script lang="ts" module>
import { 
  ShowSubmit
} from '#lib/utils/jsonToForm.js'   
import {createWebrtcConnFromCenterUrl} from "#lib/utils/postAndSSEWebrtc.js" 
import QRCode from 'qrcode'; 
import {  
  type DirInfoType  } from '#lib/function/fileHandle.js'; 
import {
  encodeMessage, 
  sendChunked,
  channelMessage
} from '#lib/function/rtcDataToBroadData.js' 
const FileBroadcastChannelMap = new Map<string,BroadcastChannel>()
const getFileBroadcastChannel = (name:string)=>{
  //name = decodeURIComponent(name)
  let b = FileBroadcastChannelMap.get(name)
  if (!b){
    b = new BroadcastChannel(name)
    FileBroadcastChannelMap.set(name,b)
  }
  return  b
}
//let dirInfo:DirInfoType

type meshInfoType = {
  conn:connType, 
  files:Map<string,{d:RTCDataChannel }>
} 
//let channel:BroadcastChannel|undefined=$state(undefined)
const meshList:(meshInfoType|null)[] =$state([])
const addMesh = (m:meshInfoType)=>{ 
  for (let i=0;i<meshList.length;i++){
    const v = meshList[i]
    if (v && v.conn.id ===m.conn.id){
      meshList[i] = m
      return
    }
  }
  const len = meshList.length;
  m.conn.onClose = ()=>{
    if (meshList[len]) meshList[len] = null
    console.log("----",m)
  }
  meshList.push(m)
}
let DialogDiv:HTMLDivElement 
export const getDialogDiv = ()=>{
  return DialogDiv
}
/*
export const previewHandle =async (data: { [k:string]:any},onmessage?: (e: MessageEvent) => void)=>{
  if (!data.basename){
    data.basename="main"
  } 
  (await getWorker( onmessage)).postMessage(data) 
   
} */
const getConnHostJsonStr = ()=>{
  return  {
    _comment:"跨网信令交换服务",
    id:Date.now().toString(32).slice(4),
    id_comment:"[加入]端需要输入[生成]端的id",
    create:true,
    create_comment:"[生成/加入]WebRtc会话",
    host_comment:"信令交换服务公共网址",
    host:"https://www.zaddone.com/rtc"
  }  
} 

const createWorkerConn = (workerConn: RTCDataChannel,dirInfo?:DirInfoType)=>{ 
  workerConn.binaryType = 'arraybuffer'; 
  workerConn.onopen=()=>{
    //console.log("worker open")
    workerConn.onmessage=(ev:MessageEvent)=>{
      channelMessage(ev, (data:any)=>{
        console.log("rtc get",data)
        switch (data.type){
          case "workerInit":
            if (dirInfo?.workerHandle){
              dirInfo.workerHandle(data,(db)=>{
                sendChunked(workerConn,encodeMessage(db))
                //dirInfo.channeldb?.postMessage(db) 
              })
            }
            dirInfo?.channeldb?.postMessage(data)
            return
          case "worker":  
            if (dirInfo?.workerHandle){
              dirInfo.workerHandle(data,(db)=>{
                sendChunked(workerConn,encodeMessage(db))
                //dirInfo.channeldb?.postMessage(db) 
              })
            //}else{
              //if (data.list)
                //dirInfo?.channeldb?.postMessage(data)  
            }
            break;
          case "workerData":   
            dirInfo?.Preview?.({data}) 
            dirInfo?.channeldb?.postMessage(data) 
            break;
          default:
            return
            //console.log("rtc get",data)
        }  
           
      }) 
    }      
    const handle = (ev:MessageEvent<{type:string,list:any}>)=>{     
      
      switch (ev.data.type){
        case "workerInit":  
          //if (!ev.data.list)
          //  return;
          //else
          break
        case "workerRun":
          break
        case "workerData":
          break
        default:
          return
      }
      console.log("rtc send",ev.data)
      sendChunked(workerConn,encodeMessage(ev.data))
    }
    dirInfo?.channeldb?.addEventListener("message",handle)
    workerConn.onclose=()=>{
      dirInfo?.channeldb?.removeEventListener("message",handle)
    }
  }
}
export const QRCodeHandle = (path:string,dirInfo?:DirInfoType)=>{  
  ShowSubmit(getDialogDiv(),getConnHostJsonStr(),(db)=>{  
    createWebrtcConnFromCenterUrl(db,async (conn)=>{  
      const mesh = {conn,files:new Map<string,{d:RTCDataChannel }>()} 
      const fs = await dirInfo?.DirHandle?.files() 
      for (let f of fs||[]){ 
        const fileHandle = dirInfo?.DirHandle?.getFileHandle(f.name)
        fileHandle?.read().then(db=>{
          const fileCHannel = conn.pc.createDataChannel(`${f.name}_${conn.dc?.label}`)
          mesh.files.set(f.name,{d:fileCHannel}); 
          fileCHannel.onopen=async ()=>{   
            fileCHannel.send(db)
            const broadcasthandle = (  ev: MessageEvent<{update:any,origin:string}>)=>{
              if (ev.data.origin !== fileCHannel.label)
                fileCHannel.send(ev.data.update)
            }
            const b = getFileBroadcastChannel(f.name)
            b.addEventListener('message', broadcasthandle )

            fileCHannel.onclose = ()=>{
              b.removeEventListener('message',broadcasthandle)
            }
            fileCHannel.onmessage=(ev)=>{
              //console.log(ev)
              const data = {db:ev.data,origin:fileCHannel.label}
              fileHandle?.writeAndBroad?.(data) || fileHandle?.write(data) 
            }              
          }
        })
      }
       
      addMesh(mesh) 
      closeModal()
      setTimeout(()=>{
        createWorkerConn(conn.pc.createDataChannel("worker",{ordered:false}),dirInfo)
      },100)
      
    }).then(ok=>{
      if (!ok){
        return
      }
      ShowQRImg(db,path)
    })
  });  
  openModal()
}
const ShowQRImg = (db:any,path:string)=>{
  let url = `${window.location.protocol}//${window.location.host}/edit#${encodeURIComponent(
    JSON.stringify({
      path,
      id:db.id,
      host:db.host})
  )}`
  console.log(url)
  QRCode.toDataURL(url,{
    width: 200, 
    color: {
      dark: '#3b82f6',
      light: '#ffffff'
    }
  }).then(src=>{
    getDialogDiv().innerHTML=`<h2>${db.id}</h2>`
    const img = document.createElement("img")
    img.src = src
    getDialogDiv().append(img)
  }) 
}

</script>
<script lang="ts">
import type {connType} from "#lib/utils/webRTCPool.js"
import type {ConfigType} from "#lib/components/OrthoScene.svelte"
import Dialog,{openModal,closeModal} from '#lib/components/Dialog.svelte';  
const {
  solidControlConfig, 
}:{ 
  solidControlConfig:ConfigType     
} = $props()  
</script>
<Dialog title = {solidControlConfig.title||""}  >
  <div bind:this={DialogDiv}>test</div> 
</Dialog>
{#each meshList as mesh,k }
{#if mesh}
  <details    >
    <summary   style="cursor: pointer; text-align: left;height:48px; line-height: 48px;"  >
        {mesh.conn.id}
    </summary>
    <div   style="color:white;text-align: center;" >
        <button onclick={(e)=>{
          console.log(e)
          return;
        }}>reload </button> 
    </div>
</details>
{/if}
{/each}