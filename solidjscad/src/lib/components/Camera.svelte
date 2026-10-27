<script lang="ts" module>
let isPerspective = true;
let view = $state(["Perspective [ V ]",""])
let cameraType:'[ V ]' | '[ U ]' = $state("[ U ]")
export function initView(){  
  view[0] = isPerspective ?'Perspective [ V ]' : 'Orthographic [ U ]';
  view[1] = '[ Z ]'
}
export function toggleCamera() {
    isPerspective = !isPerspective; 
    cameraType = isPerspective ?'[ U ]' : '[ V ]';
    return isPerspective ? 'Perspective' : 'Orthographic'; 
}
</script>
<script lang="ts" >
import FullscreenWakeLockManager from '#lib/utils/FullscreenWakeLockManager.js';
  //import { HelperGroupChange} from "./function/threeScene" 
import {onMount} from "svelte"
const {
  Clickhandle,
  //show
}:{
  //show:boolean,
  Clickhandle:(name:string|{[k:string]:any}|null)=>void } = $props()
let manager: FullscreenWakeLockManager 
  //let inputCheckBoxStruct = HelperGroupChange(3)
onMount(()=>{
  manager =new FullscreenWakeLockManager()
})
  const kMap:{[k:string]:string} = {
    "x":"right",
    "X":"left",
    "z":"bottom",
    "Z":"top",
    "y":"back",
    "Y":"front",
    "U":"camera",
    "V":"camera",
    "R":"refresh",  
  }
  const handleKeydown = (e:any) => {
		//console.log(`pressed the ${e.key} key`);
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            
      return;
    }
    const key = kMap[e.key]
    if (key){
      Clickhandle?.(key)
    }
	}
</script>
<svelte:window onkeydown={handleKeydown}  />
<details  >
  <summary style="cursor:pointer;height:48px;text-align:left;line-height: 48px;" >
    {view.join(" ")}
  </summary>
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions --> 
<div style="color:white;"   onclick="{(e)=>{
  const button = (e.target  as HTMLInputElement).closest('button');
  //console.log(button.textContent)
  if (!button?.id ){
    return;
  }
  Clickhandle?.(button.id)
  if (button.id !== "camera"){
    view[1] = button.textContent
  } else{
    view[0] =(isPerspective ? 'Perspective' : 'Orthographic')+" "+ button.textContent
    view[1] = ""
  }
}}" >
<button id="camera" title="camera"   style="height:48:px;line-height:48px;cursor: pointer;" >{cameraType}</button>
<button id="front" title="front"    style="height:48:px;line-height:48px;cursor: pointer;">[ Y ]</button>
<button id="back" title="back"    style="height:48:px;line-height:48px;cursor: pointer;">[ y ]</button>

<button id="left" title="left"     style="height:48:px;line-height:48px;cursor: pointer;">[ X ]</button>
<button id="right" title="right"   style="height:48:px;line-height:48px;cursor: pointer;">[ x ]</button>
<button id="top" title="top"     style="height:48:px;line-height:48px;cursor: pointer;">[ Z ]</button>
<button id="bottom" title="bottom"   style="height:48:px;line-height:48px;cursor: pointer;">[ z ]</button>
<!--
<button id="refresh" title="refresh"   style="height:48:px;line-height:48px;cursor: pointer;" >[ R ]</button> 
-->
</div>
<div>
<p> 
    <label><input checked  onclick={(e)=>{ 
    Clickhandle?.(e.target)
  }} type="checkbox"   value="Light" name="Light" id="Light" > Light</label>
  <label><input checked  onclick={(e)=>{ 
    Clickhandle?.(e.target)
  }} type="checkbox"   value="Axes" name="Axes" id="Axes" > Axes</label>
  <label><input checked  onclick={(e)=>{
    Clickhandle?.(e.target)
  }} type="checkbox"   value="Grid" name="Grid" id="Grid"  > Grid</label>

  <label><input onclick={(e)=>{
    //Clickhandle?.(e.target)
    const ht = e.target as HTMLInputElement
    if (ht.checked){
      manager.enterFullscreen();
    }else{
      manager.exitFullscreen();
    }
    
  }} type="checkbox"   value="Fullscreen" name="Fullscreen" id="Fullscreen" /> Fullscreen </label>
</p>
<p>Right-click and drag, or use two-finger touch and drag</p>
</div>

</details>