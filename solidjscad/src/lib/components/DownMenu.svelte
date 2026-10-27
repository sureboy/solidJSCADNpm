<script lang="ts">
//import {downloadOpfsAsTarGz} from '$lib/function/OPFS'
import type { ThrelteContext } from '@threlte/core'
import {  WebGLRenderer } from 'three';
import {createPng} from '#lib/function/localImg.js'
import { exportTo3MF } from 'three-3mf-exporter'; 
import {STLExporter} from "three/addons/exporters/STLExporter.js" ;  
import {downloadOpfsAsTarGz} from '#lib/function/tar.js'
//let Details:HTMLDetailsElement
import { type DirInfoType } from '#lib/function/fileHandle.js';  
const {title,DownHandle,
  DirInfo,
  //show,
  children } :{  
    DirInfo?:DirInfoType ,
  DownHandle:  (fn:(e:ThrelteContext<WebGLRenderer>)=>any)=>void, 
  title:string,
  //show:boolean,
  children?:any,
} = $props()
const downSTLclick=()=>{
  DownHandle( ( e )=>{
    const { scene} = e
    const res = new STLExporter().parse(scene,{binary: true});
    const blob = new Blob([res.buffer as ArrayBuffer], { type: 'application/octet-stream' })
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    //console.log(workermsg)
    link.download = `${title}.stl`; 
    link.click();
    URL.revokeObjectURL(link.href); 
  })
}
const down3MFclick=()=>{
  DownHandle(async ( e )=>{
    const { scene} = e
    const blob = await exportTo3MF(scene)
    // const blob = new Blob(data,{ type: mimeType3mf } )
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    console.log(blob,link.href)
    link.download = `${title}.3mf`; 
    link.click();
    URL.revokeObjectURL(link.href);      
  })
}
const downPngClick=()=>{
  //const context = await DownHandle()
  DownHandle( ( e )=>{
    const {renderer:mainRenderer,scene,camera} = e 
    const width = mainRenderer.domElement.width;
    const height = mainRenderer.domElement.height;
    const pixelRatio = mainRenderer.getPixelRatio();

    // 1. 创建离屏渲染器（不添加到 DOM）
    const offscreenRenderer = new WebGLRenderer({
      preserveDrawingBuffer: true, // 关键！
      antialias: true, // 可选，保持抗锯齿
      alpha: true, // 如果需要透明背景，可设为 true
    });
    offscreenRenderer.setSize(width, height);
    offscreenRenderer.setPixelRatio(pixelRatio);
    offscreenRenderer.render(scene, camera.current); 
    const screenCanvas = createPng(offscreenRenderer.domElement) 
    let aTag = document.createElement('a'); 
    aTag.download = `${title}.png`;  
    aTag.href = screenCanvas?.toDataURL()||"";
    aTag.click();
    //screenImgList.add(href)
    URL.revokeObjectURL(aTag.href);  
    offscreenRenderer.dispose(); 
  })
} 
</script>
<details       >
    <summary style="cursor:pointer;height:48px;text-align:left;line-height: 48px;" >
       Function
    </summary>
    <div >
    <button style="height:48:px;line-height:48px;cursor: pointer;" onclick={async(e)=>{
      console.log(e)
      const fileName = `${title}.tar.gz`
      try{
 
        if (window.confirm(`Download ${fileName}  now?`)){ 
          await downloadOpfsAsTarGz(DirInfo,fileName) 
        }
      }catch(err){
        
        console.error(err)
        window.alert(err)
      }
    }} >Gzip</button>  
          <button style="height:48:px;line-height:48px;cursor: pointer;" onclick={downPngClick} >Png</button>      

          <button style="height:48:px;line-height:48px;cursor: pointer;" onclick="{downSTLclick}" >STL</button>  
      <button style="height:48:px;line-height:48px;cursor: pointer;" onclick="{down3MFclick}" >3MF</button>  
{@render children?.()} 
   


        </div> 
 
</details>


 