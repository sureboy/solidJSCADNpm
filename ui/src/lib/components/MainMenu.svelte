<script lang="ts" module> 
import {createVerticalCheckbox} from "#lib/function/checkbox.ts"
import {openModal,closeModal} from '#lib/components/Dialog.svelte';  
import {ShowSubmit} from "#lib/utils/jsonToForm.ts"
import {getDialogDiv} from '#lib/components/Menu.svelte';  
let menu:HTMLElement
let tmpDiv:HTMLButtonElement 
let solidName:HTMLElement;
//let basename:string
//let spinner:HTMLElement;

export const moduleInit = (geometrys: {
    geometry: {
        type: string;
        material: any;
        geo: any;
    }[];
    show: boolean;
    tag: string;
}[],  opt:{  
      Clickhandle?:(checked: boolean, value: string)=>void,
  list:string[],
  tag:string,
  key?:string,
  option?:{[k:string]:any}, 
} )=>{ 
  if (menu)menu.innerHTML=""   
  if (solidName)solidName.textContent = "main"
  tmpDiv.style.display = 'inline' 
  opt.list.forEach(m=>{
    let checked = m===opt.tag
    if (!checked)
      for (const g of geometrys){
        if (g.tag ===m && g.show){
          checked = true
          break;
        }
      }  
 
    const box = createVerticalCheckbox({checked,name:m,text:m,value:m,onChange:(c,v)=>{ 
      opt.Clickhandle?.(c,v)
    }}) 
    menu.appendChild(box)
  }) 
  if (opt.option){
    const btn = tmpDiv.cloneNode(true) as HTMLButtonElement
    btn.onclick = (e)=>{
      //console.log(opt.option) 
      ShowSubmit(getDialogDiv(),opt.option,(db)=>{ 
        opt.option = Object.assign(opt.option||{},db)
        const v = (window.localStorage.getItem("main")||"main")+"?opt="+encodeURIComponent(JSON.stringify(opt.option)) 
        //console.log(db,opt.option)
        opt.Clickhandle?.(true,v)
        //const msg = {name:"./index.js",onlyInit:true,update:opt.key,type:"workerInit",...opt}
        //console.log(msg)
         
        //DirInfo?.workerHandle?.(msg)  
        //DirInfo?.channeldb?.postMessage(msg)
        //}
        closeModal()
        /*
        getWorker().then(w=>{ 
          w.postMessage({name:"./index.js",...opt})  
        })*/
              
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

 

 
 