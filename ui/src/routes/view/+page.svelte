<!-- src/routes/view/+page.svelte -->
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
//import tsBlankSpace from "ts-blank-space";
import { getWorker,terminateWorker } from '#lib/worker/globalWorker.ts';
//import { getWorker,terminateWorker } from '#lib/worker/globalWorker.js';
import {
  BufferGeometry,
} from "three";  
//import {postMain,onMainMessage,getTransferableList} from "worker/src/lib/utils/workerLib.js"
//import { dev } from '$app/env';
//    import { loadConfigFromFile } from 'vite';
let geometrys:{
  geometry:{
    type:string, 
    material:any,
    geo:any,
    transforms:any
  }[], show:boolean,tag:string
}[] = 
  $state([])
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
let rootUrl =  "http://localhost:3000/src/" 

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
  //console.log("update",data)
  const geo = csg2Geo(data,{} )
  if (geo){ 
    //console.log(geo);
    (()=>{
      for (const g of geometrys){
        if (g.tag===data.tag){
          g.geometry.push(geo)  
          return
        }
      }
      geometrys.push( {geometry:[geo],tag:data.tag,show:true})
      //console.log("push",geometrys.length)
    })()    
    setMaxSize(geo.geo) 
  }  
}
 
onMount(() => {  
  getWorker((e)=>{
    //console.log(e)
    const newData =  e.data;
    if (newData.index){ 
      updateGeometrys(newData)
    }
    if (newData.list){ 
      //console.log(newData)
      moduleInit(
        geometrys,
      Object.assign({ 
        Clickhandle:(checked: boolean, value: string)=>{
          //console.log("runEvent",value)
          if (checked){
            (()=>{
              const i = value.indexOf('?')
              let v = value
              if (i===-1){
                for (const g of geometrys){
                  if (g.tag ===value){
                    g.show = true
                    return
                  }
                }
              }else{
                v = value.slice(0,i)
                geometrys = []

              } 
              if (window.localStorage.getItem("main") !== v){
                window.localStorage.setItem("main",v)
              } 
              getWorker().then(w=>{
                w.postMessage({tag:value})
              })
              //runEvent(value)
            })()
          }else{
            for (const g of geometrys){
              if (g.tag ===value){
                g.show=false
                return
              }
            }
          }          
        },
        key:"",
        path:"test",
        //list:newData.mainList
      },
      newData )) 
    }
    if (newData.end){
      clearTimeout(refreshCameraTimer)
      refreshCameraTimer = setTimeout(()=>{
        refreshCameraInit(solidControlConfig  )
      },1000) as any
      
      if (!showMenu) showMenu = true
      //eventSource?.close();
      stopTicker=true
    }
  }).then(w=>{
    const name =(window.location.hash.slice(1)||"/src/index.js") 
    const u = new URL(name,rootUrl)
    //const i = u.href.lastIndexOf("/") 
    w.postMessage({
      remote:{
        baseUrl:u.href,//.slice(0,i+1)
        rootUrl,
      },
      name:"."+u.href.slice(u.href.lastIndexOf("/")),
      tag:window.localStorage.getItem("main")||"main"})
  })
  
  
  //runEvent()
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