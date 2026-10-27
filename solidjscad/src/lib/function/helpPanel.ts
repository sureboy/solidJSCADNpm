// helpPanel.ts
import { StateEffect, StateField } from "@codemirror/state";
import { showPanel, EditorView, keymap } from "@codemirror/view";
import type {   Panel } from "@codemirror/view";
import type {FileInfoType} from "$lib/components/Edit.svelte"
import { getImport } from "$lib/function/parsingCode"
// 1. 定义用于切换面板状态的效果 (Effect)
const toggleHelpEffect = StateEffect.define<boolean>(); 
let dom:HTMLDivElement|undefined = undefined
 
export const appendChildToDom = (...childrenNode:HTMLElement[])=>{
    if (!dom)return
    dom.innerHTML=""
    dom.append(...childrenNode)
 
    const docs = document.createElement("a")
    docs.href = "/docs/"
    docs.target = "_blank"
    docs.textContent="Docs"
    
    docs.style.marginRight="6px"
    docs.style.float = "right"
    const home = docs.cloneNode() as HTMLAnchorElement
    home.href="/"
    home.textContent="Home"
    dom.append(home,docs)
    //dom.appendChild(docs)
}
// 2. 定义状态字段 (StateField) 来管理面板的显示/隐藏
const helpPanelStateField = StateField.define<boolean>({
    create: () => true,
    update(value, transaction) {
        for (let effect of transaction.effects) {
            if (effect.is(toggleHelpEffect)) {
                value = effect.value;
            }
        }
        return value;
    },
    // 当状态为 true 时，通过 showPanel 提供面板
    provide: (field) => showPanel.from(field, (isVisible) => 
        isVisible ? createHelpPanel : null
    ),
});

// 3. 创建面板的 DOM 元素
function createHelpPanel(view: EditorView): Panel {
    dom = document.createElement("div");
    dom.className = "cm-menu-panel";
/*
    // 创建下拉列表
    select = document.createElement("select");
    

    // 创建一个用于显示帮助内容的区域
    content = document.createElement("span");
    content.style.marginRight = '6px';
    //content.appendChild(createButton("del"))
    dom.appendChild(createButton("delete","X",(e)=>{
        const fileName = select?.value
        if (fileName && window.confirm(`delete ${fileName} ?`)){
            
        }
        
    }))
   

    dom.appendChild(select);
    dom.appendChild(content);
    dom.appendChild(createButton("save","✓"))
    */
    return { top: true, dom };
}

// 4. 定义键盘快捷键 (F1)
const helpKeymap = keymap.of([
    {
        key: "F1",
        run(view: EditorView) {
            const isVisible = view.state.field(helpPanelStateField);
            view.dispatch({
                effects: toggleHelpEffect.of(!isVisible),
            });
            return true;
        },
    },
]);

 
const helpTheme = EditorView.baseTheme({
  ".cm-menu-panel": {
    padding: "5px 10px",
    backgroundColor: "#525353",
  },
  ".cm-menu-panel span": {
    color:"#fff",
    fontFamily: "monospace"
  }
})
// 6. 导出最终的扩展函数
export function helpPanel() {
    return [helpPanelStateField, helpKeymap, helpTheme];
}
export function createButton(id:string,name?:string,onclick?:(e?:PointerEvent)=>void){
    const but = document.createElement("button")
    but.id=id
    but.textContent=name||id
    but.onclick=(e)=>{
        onclick?.(e)
    }
    but.style.marginRight = '6px';
    return but
}


const createInputElement = ( FileInfo: FileInfoType)=>{
    const input = document.createElement("input")
    input.type = "text"
    input.placeholder="./index.js"
    input.autofocus
    input.onkeydown = (e)=>{
        if (e.key === 'Enter' && input.value){
            if (!FileInfo.path){
                FileInfo.path = input.value
                FileInfo.create = true
                //window.location.hash = encodeURIComponent(
                //    JSON.stringify({path:input.value,create:true  }))  
            }else{
                let name = input.value
                if (!name.startsWith("./")){
                    name = "./"+name
                }
                if (!name.endsWith(".js")){
                    name += ".js"
                } 
                //FileInfo.path = path
                FileInfo.name = name
                //window.location.hash = encodeURIComponent(
                //    JSON.stringify({name ,path  })) 
            }
            //getDirHandle(FileInfo.path)
            //window.location.reload() 
            FileInfo.initEditorView()//.then(()=>{
              //  initPanel(FileInfo) 
           // })
        }
    }
    return input
}

export const createSelect = ( FileInfo: FileInfoType)=>{
 //const files:string[] = []
    const select = document.createElement("select")
    const firstOpt = document.createElement("option");
    firstOpt.textContent="--New file--"
    const content = document.createElement("span");
    content.style.marginRight = '6px';
    //select.on
    select.appendChild(firstOpt); 
    selectClickHandle(select,FileInfo).then(()=>{
        for (const child of select.childNodes.values()){
            const opt = (child as HTMLOptionElement)
            if (opt.value === (FileInfo.name ||'./index.js')){
                opt.defaultSelected = true
                break
            }
        }
    })
    
    select.onchange=(e)=>{
        if (!select.value)return;
        if (select.value ===firstOpt.textContent) { 
            //console.log("new file") 
            content.append(createInputElement(FileInfo))
            
            //input.focus()
            //appendChildToDom(input)
            return
        }else{
            FileInfo.name = select.value;
            FileInfo.initEditorView(
                //cm_view,
                )
            //window.location.hash = encodeURIComponent(
            //JSON.stringify({name:select.value ,path:FileInfo.path})) 
            //window.location.reload()
        }
    }
    return [select,content]
}

const selectClickHandle =async (
    select: HTMLSelectElement,FileInfo: FileInfoType)=>{
    if (!FileInfo.DirHandle){ 
        return
    };
    const oldItem:string[] =[] 
    for (let i = 1; i<select.childNodes.length;i++){
        oldItem.push((select.childNodes.item(i) as HTMLOptionElement).value)
    }
    const files = await FileInfo.DirHandle?.files() ||[]
    if ( !oldItem.includes(FileInfo.name)){
        let opt = document.createElement("option");
        opt.textContent =FileInfo.name; 
        opt.value = FileInfo.name
        opt.defaultSelected=true
        oldItem.push(FileInfo.name)
        select.appendChild(opt);
        //return
    }
    //console.log("select click",files,FileInfo)
    for  (const f of  files){ 
        //console.log("l1",f)
        if (f.isDirectory){
            continue;
        }
        const k = decodeURIComponent(f.name)
        if (oldItem.includes(k)){
            continue
        }
        let opt = document.createElement("option");
        opt.textContent = k; 
        opt.value = k
        //opt.defaultSelected=k===(FileInfo.name ) 
        const handle = FileInfo.DirHandle?.getFileHandle(f.name) 
        handle?.read().then(doc=>{
            console.log("select add new file",f.name)
            getImport(doc,k) 
        }) 
        select.appendChild(opt);
    }
}

export const createPackage = (FileInfo: FileInfoType)=>{
    const input = createInputElement(FileInfo)
    if (FileInfo.path){
        input.value = FileInfo.path 
    }else{
        input.placeholder="create a project"
    }
    appendChildToDom(input,createButton("create","create",(e)=>{
        if (input.value){

            window.location.hash = encodeURIComponent(
            JSON.stringify({path:input.value,create:true  }))  
            window.location.reload() 
        }                
    }))
}

