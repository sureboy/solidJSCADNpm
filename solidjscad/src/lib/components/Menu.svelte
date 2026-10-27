<script lang="ts"> 
 
const {
  
  children,
}:{
  children?:any,
 
} = $props() 
</script>

<div style="position: absolute;left:5px;top:5px;z-index: 11;cursor: pointer;" class="pointer-events-auto" >
 <div style="color:white;text-align: left;"> 
   <a style="color:white;cursor: pointer;height:48px;text-align: left;line-height: 48px;"  
     href="/" data-sveltekit-reload >Home</a>
    <a style="color:white;cursor: pointer;height:48px;text-align: left;line-height: 48px;" 
    href="/docs/" data-sveltekit-reload >Docs</a>
</div>


{@render children?.()} 
 
</div>