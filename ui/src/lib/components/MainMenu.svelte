<script lang="ts" module> 
import {createVerticalCheckbox} from "#lib/function/checkbox.ts"
import {openModal,closeModal} from '#lib/components/Dialog.svelte';  
import {ShowSubmit} from "#lib/utils/jsonToForm.ts"
import {getDialogDiv} from '#lib/components/Menu.svelte';  
import { type geometrysType}  from '#lib/components/OrthoScene.svelte'; 
import {Color,MeshStandardMaterial} from 'three'
let menu:HTMLElement
let tmpDiv:HTMLButtonElement 
let solidName:HTMLElement; 
export const moduleInit = (
  opt:{  
    geometrys:geometrysType,
    Clickhandle?:(value: string|{ [k: string]: any;},show: boolean )=>void,
    list:string[], 
    option?:{[k:string]:any}, 
  })=>{ 
  if (menu)menu.innerHTML=""   
  if (solidName)solidName.textContent = "main"
  tmpDiv.style.display = 'inline' 
  opt.list.forEach(m=>{
    const meshOpt = {position:{x:0,y:0,z:0},color_comment:"",transparent:false,opacity:1}
    const box = createVerticalCheckbox({checked:false,name:m,text:m,value:m,onChange:(v,e)=>{ 
      if (e.target instanceof HTMLInputElement){
        opt.Clickhandle?.(v, e.target.checked )
      }else{  
        opt.Clickhandle?.(v, true) 
        ShowSubmit(getDialogDiv(v), { color:Object.keys(Color.NAMES), 
          transparent_comment:"启用透明渲染",
          opacity_comment:"range:0.1~1.0",...meshOpt},(db)=>{ 
          //console.log(db); 
          //if (!db.color )return;
          meshOpt.color_comment = db.color
          meshOpt.opacity = db.opacity||1
          meshOpt.transparent = db.transparent || false; 
          Object.assign(meshOpt.position,db.position);
          (()=>{
            for (let g of opt.geometrys){
              if (g.tag===v){
                g.position = Object.assign(g.position||{},db.position) 
                if (!db.color)return;
                const m = new MeshStandardMaterial({
                  color:db.color,
                  opacity:db.opacity,
                  transparent:db.transparent
                })  
                g.geometry.forEach(geo=>{
                  geo.material = m
                })
                return
              }
            }
          })()
          
          //opt.option = Object.assign(opt.option||{},db)
          //const v = (window.localStorage.getItem("main")||"main")+"?opt="+encodeURIComponent(JSON.stringify(opt.option)) 
          //opt.Clickhandle?.(Object.assign(opt.option||{},db) ,true) 
          closeModal()    
        })
        openModal()
      }
    }}) 
    menu.appendChild(box)
  }) 
  if (opt.option){
    const btn = tmpDiv.cloneNode(true) as HTMLButtonElement
    btn.onclick = (e)=>{
      //console.log(opt.option) 
      ShowSubmit(getDialogDiv(),opt.option,(db)=>{ 
        //opt.option = Object.assign(opt.option||{},db)
        //const v = (window.localStorage.getItem("main")||"main")+"?opt="+encodeURIComponent(JSON.stringify(opt.option)) 
        opt.Clickhandle?.(Object.assign(opt.option||{},db) ,true) 
        closeModal()    
      })
      openModal()
    }
    btn.textContent = "Option";
    menu.appendChild(btn)
  }
  
 
  //menu.append(tmpDiv)
}
</script>
<script lang="ts">

 const {show}:{show:boolean}  = $props() 

 //let DialogDiv:HTMLDivElement 
</script>
 
<details>
<summary bind:this={solidName} style="
cursor: pointer;height:48px;text-align: left;line-height: 48px;"  >
...
</summary> 

<div  style="color:white;text-align: center;{show?"":"display:none;"}" id="module_list" bind:this={menu}     >  
  <button bind:this={tmpDiv}    style="display:none;height:48:px;line-height:48px;cursor: pointer;" >
    ...
  </button> 
</div> 

</details>

 

 
 