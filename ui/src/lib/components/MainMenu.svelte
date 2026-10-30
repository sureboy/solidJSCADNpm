<script lang="ts" module> 
import {createVerticalCheckbox} from "#lib/function/checkbox.ts"
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
  main:string,
  key?:string,
  option?:{[k:string]:any}, 
} )=>{ 
  if (menu)menu.innerHTML="" 
 
  //Details.style.display="inline"
  if (solidName)solidName.textContent = "main"
  tmpDiv.style.display = 'inline'
  //basename = opt.basename
  //console.log("change Main name",solidName)
  opt.list.forEach(m=>{
    let checked = m===opt.main
    if (!checked)
      for (const g of geometrys){
        if (g.tag ===m){
          checked = true
          break;
        }
      }  
 
    const box = createVerticalCheckbox({checked,name:m,text:m,value:m,onChange:(c,v)=>{
 
      opt.Clickhandle?.(c,v)
    }})
    
    /*
    const btn = tmpDiv.cloneNode(true) as HTMLButtonElement
    //div.style.display='inline'
    //div.disabled=!opt.show
    btn.onclick = (e)=>{*/
      /*
      geometrys.forEach((g)=>{
        if (g.tag!==m){
          g.show=false
        }else{
          g.show=true
        }
      })*/
     /* solidName.textContent=m
      opt.Clickhandle?.(m)
    }
    btn.textContent = m;*/
    menu.appendChild(box)
  }) 
  if (opt.option){
    const btn = tmpDiv.cloneNode(true) as HTMLButtonElement
    btn.onclick = (e)=>{
      console.log(opt.option)
 
      //openModal()
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

 

 
 