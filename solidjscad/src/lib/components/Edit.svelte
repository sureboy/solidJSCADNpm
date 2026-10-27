<script lang="ts" module>
export type FileInfoType  = { 
    columnNumber?:number,
    lineNumber?:number,
    name:string, 
    cmView: EditorView,
    CurrentBroadcastChannel?:BroadcastChannel,
    setView:(cmView: EditorView)=>void,
    initEditorView:()=>any,
    //value?:string,
    fileBroadcastChannelMap:Map<string,BroadcastChannel>,
    getFileBroadcastChannel:(name?:string)=>BroadcastChannel
} & DirInfoType
</script>
<script lang="ts" > 
import FullscreenWakeLockManager from '$lib/utils/FullscreenWakeLockManager';
import CodeMirror from "$lib/components/CodeMirror.svelte";
import { javascript } from "@codemirror/lang-javascript"; 
import { EditorView,Decoration,type DecorationSet } from '@codemirror/view'; 
import { helpPanel } from "$lib/function/helpPanel";  
import {
    jscadModelingCompletionSource,
    getImportAliases,
    wordHover} from "$lib/function/parsingCode"
import { autocompletion } from '@codemirror/autocomplete';    
import {type DirInfoType} from "$lib/function/fileHandle"
import { oneDark } from '@codemirror/theme-one-dark';
   import { RangeSetBuilder, StateField } from '@codemirror/state';
import { appendChildToDom,createButton,createPackage,createSelect } from "$lib/function/helpPanel";  
//import {type DecorationSet } from "@codemirror/view";
//  import { bitNot } from 'three/tsl';
  let isDark =$state(false);
  const lightTheme = null; 
let manager: FullscreenWakeLockManager | undefined;  
const {ready,
    saveFile,
    FileInfo,
    value,
}:{
    value:string,
    saveFile:(v:string,FileInfo:FileInfoType)=>void,
    FileInfo:FileInfoType,
    ready:()=>any
} = $props() 
//let cmView: EditorView
//const themeCompartment = new Compartment();
let timeout: number;
const initPanel =async (  )=>{
    if (!FileInfo.DirHandle){
        createPackage(FileInfo) 
        return;
    } 
    appendChildToDom(...createSelect(FileInfo),
    createButton("Delete","Del",(e)=>{
        //const fileName = FileInfo.name
        if (!FileInfo.name)return
        if (window.confirm(`Delete ${FileInfo.name} ?`)){
            const handle = FileInfo.DirHandle?.getFileHandle(encodeURIComponent(FileInfo.name)) 
            handle?.del().then(()=>{
                console.log("del",FileInfo)
                FileInfo.name = "./index.js"
                FileInfo.initEditorView()
            })
        } 
    }),
    createButton("Theme","🌗",(e)=>{
        isDark = !isDark;
       
    }),
    createButton("Full screen","Full",(e)=>{
        const btn = (e!.target as HTMLButtonElement)
        if (btn.textContent==="Full"){
            manager?.enterFullscreen();
            btn.textContent="Exit"
        }else{
            btn.textContent="Full";
            manager?.exitFullscreen();
        } 
    }),createButton("Preview","Prev",(e)=>{
        //const btn = (e!.target as HTMLButtonElement)
        const width =window.screen.width/2;
        const height =window.screen.height ; 
        const top =0;
        window.open("/preview#"+encodeURIComponent(JSON.stringify({path:FileInfo.path})),
        "previewPopup",
        `width=${width},height=${height},right=${width},top=${top}`)
 
    }),createButton("Save","Save",(e)=>{ 
        saveEditor(FileInfo.cmView)
    }) )        
} 
const saveEditor = (editorView:EditorView)=>{
    StopTimeOut() 
    saveFile(editorView.state.doc.toString(),FileInfo) 
}
const StopTimeOut = ()=>{
    if (timeout===0)return;
    clearTimeout(timeout) 
    timeout=0
}
//$derived()
$effect(()=>{
    //console.log(value)
    if (value)
    initPanel() 
})
const saveKeymap = {
    // 键名使用小写，用连字符连接
    key: "Mod-s", // Mod 键在 Windows/Linux 下代表 Ctrl，macOS 下代表 Cmd
    run: (editorView:EditorView) => { 
        //if (timeout===0)return true;
        saveEditor(editorView)
        //timeout=0
        return true;
    }
} 
  const markDecoration = Decoration.mark({
    attributes: {
      style: "background-color: #ff000066; border-bottom: 2px solid red;"
    }
  });
  //const targetRow = 1;
  //const targetCol = 1;
const highlightField = StateField.define<DecorationSet>({
// create 在编辑器初始化时调用，我们在这里构建装饰
create(state) {
    
    const builder = new RangeSetBuilder<Decoration>();
    if (!FileInfo.lineNumber || !FileInfo.columnNumber){
        return builder.finish();
    }
    // 获取目标行
    const line = state.doc.line(FileInfo.lineNumber);
    // 计算字符位置（列从 1 开始，转为 0-based 索引）
    const pos = line.from + (FileInfo.columnNumber - 1);
    // 确保位置在行范围内
    if (pos >= line.from && pos < line.to) {
    builder.add(pos, line.to, markDecoration);
    }
    return builder.finish();
},
 
// update 在每次文档变化时调用，我们让标记保持固定（始终指向同一行同一列）
// 如果文档变化导致该行不存在或位置变化，可根据需要调整，这里我们保留原逻辑
update(value, tr) {
    // 简单起见，每次更新都重新计算（位置可能因编辑而变化）
    const builder = new RangeSetBuilder<Decoration>();
        /*
    const line = tr.state.doc.line(targetRow);
    const pos = line.from + (targetCol - 1);
    if (pos >= line.from && pos < line.to) {
    builder.add(pos, pos + 1, markDecoration);
    }*/
    return builder.finish();
}, 
// 提供 decorations 给编辑器视图
provide: (f) => EditorView.decorations.from(f),
});
</script>

<CodeMirror  
lineWrapping={true}
theme={isDark ? oneDark : lightTheme}
    {value} 
    extensions={[
        highlightField,
        //themeCompartment.of([]),
        wordHover,
        helpPanel(),autocompletion({
            override:[ 
                jscadModelingCompletionSource
        ]
        }), ]}
    keybindings= {[saveKeymap]}
    lang={javascript()}
    styles={{
        "&":{height: "100vh"},
    "& .cm-editor": { padding: "0",border: "none"  },  
    }} 
    onready = {(cm_view)=>{   
        FileInfo.setView(cm_view)
        manager = new FullscreenWakeLockManager();
        ready()  
    }}
    bounce={0} 
    onchange = {(v)=>{  
        StopTimeOut() ;
        timeout = window.setTimeout(() => {
            if (FileInfo.name)
            getImportAliases(v,FileInfo.name)
            //jscadKey= getJscadImportAliases(v)
            saveFile(v,FileInfo) 
            timeout=0
        },5000) 
    }} 
 /> 
<style> 
:global(html), :global(body) {
    margin: 0;
    padding: 0;
    height: 100vh;
    overflow: hidden;
}
</style>