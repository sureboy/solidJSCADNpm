<!-- src/routes/+page.svelte -->
<script lang="ts">
import { Canvas } from '@threlte/core'
import Menu from '#lib/components/Menu.svelte'   
import { csg2Geo } from "#lib/function/csg2Three.js"; 
import { onMount } from 'svelte'; 
import {  Vector3,WebGLRenderer } from 'three';
import OrthoScene,{refreshCamera,refreshCameraInit,
  type ConfigType}  from '#lib/components/OrthoScene.svelte'; 
//import DownMenu from "#lib/components/DownMenu.svelte"; 
import Camera,{toggleCamera}  from "#lib/components/Camera.svelte";
import MainMenu ,{moduleInit} from "#lib/components/MainMenu.svelte";  
//import Exchange,{QRCodeHandle } from '#lib/components/Exchange.svelte';  
import {type ThrelteContext } from '@threlte/core'
//import { getWorker,terminateWorker } from '#lib/worker/globalWorker.js';
import {
  BufferGeometry,
} from "three";  
import {type GeometryMeta,
  MAX_PAYLOAD,
  decodeFrame,
  decodeMeta
} from "#lib/function/geometry-protocol.ts";
import {
  onMeta,
  finalizeGeometry,
  disposeStream,
  //buildMaterial,
  isComplete,streams,MAX_MESSAGE_SIZE,
  onDataFrame
} from "#lib/function/geoGet.ts"
import { dev } from '$app/env';
let geometrys:{geometry:any,material:any,type:string,show:boolean,tag:string}[] = $state([])
let stopTicker = $state(false) 
let showMenu = $state(false) 
let errHtml:HTMLElement
let refreshCameraTimer:any
const solidControlConfig:ConfigType = $state({  
  Light:true,
  Axes:true,Grid:true,main:[],
  isOrthographic:false,
  MaxSize :new Vector3(),
  GridSize:10, 
  getAspect:()=>{
    if (!solidControlConfig.Context)return 1
    const {size} = solidControlConfig.Context
    return size.current.width/size.current.height
  } 
})
let beginTime =  0
let showRunTime = $state(0)
const  tickRunTime =()=>{
  let t = ( Date.now() - beginTime)/1000
  if (stopTicker){
    showRunTime=t
    return;
  }
  if ((t|0) !== (showRunTime|0)){
    showRunTime =t
  }
  
  requestAnimationFrame(tickRunTime);
} 
const Clickhandle=(k:string|{[key:string]:any}|null)=>{
  if (!k)return;
  if (typeof k === 'string'){
      //console.log(k)
      switchView(k)
      return
  }
  if (k.id in solidControlConfig){
      (solidControlConfig as {[key:string]:any})[k.id] = k.checked
  }
} 
// import {  PUBLIC_API_BASE } from '$app/env/public';
    let eventSource: EventSource;
const rootUrl = dev?"http://localhost:3000":""

function handleMeshMessage(data:{msg:{db:any},run:string}) {
  const frame = decodeFrame(data.msg.db);
  if (!frame) return;

  const { msgId, seq, totalLen, attrId, offset, payload, isLast, isMeta } = frame;

  // 基本校验
  if (totalLen === 0 || totalLen > MAX_MESSAGE_SIZE) {
    console.warn(`[rtc] msg ${msgId} invalid totalLen ${totalLen}`);
    return;
  }
  if (payload.byteLength > MAX_PAYLOAD) {
    console.warn(`[rtc] msg ${msgId} payload too large ${payload.byteLength}`);
    return;
  }

  // meta 帧
  if (isMeta) {
    let meta: GeometryMeta;
    try {
      meta = decodeMeta(payload);
    } catch (e) {
      console.error(`[rtc] msg ${msgId} meta parse failed`, e);
      return;
    } 
    const st = onMeta(msgId, totalLen, meta); 
    streams.set(msgId,st)
    geometrys.push( {tag:data.run,show:true,...st}) 
    return;
  }

  // 数据帧
  const st = streams.get(msgId);
  if (!st) {
    console.warn(`[rtc] msg ${msgId} data before meta`);
    return;
  }
  onDataFrame(st, attrId, offset, payload);
  if (isComplete(st)) {
    finalizeGeometry(st);
    setMaxSize(st.geometry)
    disposeStream(st.msgId);
  }
}
const setMaxSize = (geometry:BufferGeometry)=>{
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const size = new Vector3(); 
  box?.getSize(size) 
  if (size.x>solidControlConfig.MaxSize.x) solidControlConfig.MaxSize.setX(size.x)
  if (size.y>solidControlConfig.MaxSize.y) solidControlConfig.MaxSize.setY(size.y)
  if (size.z>solidControlConfig.MaxSize.z) solidControlConfig.MaxSize.setZ(size.z)

  let helpSize = size.x>size.z?size.x:size.z;
  if (size.y>helpSize){
    helpSize = size.y
  }
  if (helpSize>solidControlConfig.GridSize ){
    solidControlConfig.GridSize  = Math.ceil(helpSize )+1 
  } 
}
const updateGeometrys = (data:any)=>{
  //console.log("old update")
  const geo = csg2Geo(data,{} )
  if (geo){ 
    geometrys.push(Object.assign({tag:data.tag,show:true},geo)) 
    setMaxSize(geo.geometry)
     
  }  
}
onMount(() => {  
  eventSource = new EventSource(rootUrl+'/run');
  //fetch("http://localhost:3000/run")
  eventSource.onopen = ()=>{
    geometrys = []
    solidControlConfig.GridSize=10
    solidControlConfig.MaxSize.set(10,10,10)
    showMenu=false
    stopTicker=false
    beginTime=Date.now() 
    tickRunTime() 
  }
  eventSource.onmessage = async (event) => {
    const newData = JSON.parse(event.data);
    console.log(newData) 
    if (newData.index){

      for (const [k,v] of Object.entries(newData)){
        
        if (v && typeof v ==="object"  && "url" in v && "__type" in v){
          try{
            const res  = await fetch(v.url as string) 
            if (!res.ok){
              return
            }
            const data = await  res.arrayBuffer() 
            if (v.__type!=="ArrayBuffer"){
              const Ctor = (globalThis as any)[v.__type as string];
              if (Ctor) {
                newData[k] = new Ctor(data);
                continue
              }
            }
            newData[k] = data 
          }catch(err){
            console.error(err)
            return
            newData[k]=undefined
          }
        
        } 
      }
      updateGeometrys(newData)
    }
     
 
    if (newData.tmpPart){
      fetch(rootUrl+'/tmp/'+newData.tmpPart).then(res=>{
        if (res.ok){
          res.arrayBuffer().then(db=>{
            handleMeshMessage({msg:{db},run:newData.run})
          })
        }
      })
    }
    if (newData.mainList){
    

      moduleInit(geometrys, Object.assign({ 
      key:"",
      path:"test",
      list:newData.mainList
      } ))
   
       
    }
  };
  eventSource.onerror = (err) => {
    //console.error('SSE 错误:', err); 
    clearTimeout(refreshCameraTimer)
    refreshCameraTimer = setTimeout(()=>{
      refreshCameraInit(solidControlConfig  )
    },1000) as any
     
    if (!showMenu) showMenu = true
    eventSource?.close();
    stopTicker=true

  };
  
  
  return () => {
        eventSource?.close();
    }
});
function switchView(direction:string) {
  if (direction==="camera"){ 
    solidControlConfig.isOrthographic = toggleCamera()==='Orthographic'
    setTimeout(()=>{
      refreshCameraInit(solidControlConfig )
    })
    return;
  }  
  refreshCamera(direction,solidControlConfig.isOrthographic,solidControlConfig.MaxSize)
}  
 

const getContext = (Context: ThrelteContext<WebGLRenderer>)=>{
  solidControlConfig.Context = Context
}
//let editBtn:HTMLAnchorElement
</script>
<svelte:head><title>{solidControlConfig.title||"SolidJScad"}</title>
<style>
  body {
  margin: 0;
}
</style>
</svelte:head>
<div   class="preview"> 
<Canvas   >
 <OrthoScene {geometrys} {solidControlConfig}  {getContext} ></OrthoScene>
</Canvas>  
 
 <Menu    >
<MainMenu show={showMenu}  ></MainMenu>
{#if showMenu}
<Camera {Clickhandle}   ></Camera>
 
{/if}
{#if !stopTicker}
  <div style="color:white;text-align: left;"  ><p class="spinner" >...</p><p>{showRunTime}s</p></div>
 {/if}
 
  <div style="color:white;text-align: left;">
 
   {#if stopTicker}<p>{showRunTime}s</p>{/if}
  </div>
 <div style="color:white;text-align: left;" bind:this={errHtml}></div>
</Menu>


</div>
<style>

.preview {
  width: 100vw; 
  height: 100vh;
  font-family: system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color-scheme: light dark;
  color: rgba(255, 255, 255, 1);
  background-color: #242424;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
 
.spinner {
  width: 24px; height: 24px;
  border: 3px solid #eee;
  border-top-color: #333;
  border-radius: 50%;
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>