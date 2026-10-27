import {showPanel,EditorView,keymap} from "@codemirror/view"
import {StateField, StateEffect} from "@codemirror/state"   
import {indentWithTab} from "@codemirror/commands"
function createHelpPanel(view: EditorView) {
  const dom = document.createElement("div")
 
  dom.appendChild(createButton("delete","🗑️"))
  dom.appendChild(getFileSelectList())
  dom.appendChild(createButton("save","✓"))
  dom.appendChild(createButton("view","▷"))
  dom.appendChild(createButton("docs","⌸"))

  dom.className = "cm-menu-panel"
 
  dom.addEventListener("click",(e)=>{
    switch ((e.target as HTMLElement).id){
        case "save":
            saveFileCode();
            return;
        case "docs":
            window.location.href=`/docs/`
            return
        case "view": 
            saveFileCode();          
            window.location.href="/#"+codeFile.title.split("*")[0]
            return;
        case "delete":
          if (!window.confirm("Delete document"))return
            window.localStorage.removeItem(codeFile.title)
            window.location.href="/#"+codeFile.title.split("*")[0]
            return;
        default:
            return;
    }
   // console.log("click",(e.target as HTMLElement).id )
    //document.getElementById("save").addEventListener("click",(e)=>{
        
        
   // })
  })
  return {top: true, dom}
}
const helpPanelState = StateField.define<boolean>({
  create: () => true,
  update(value, tr) {
    for (let e of tr.effects) if (e.is(toggleHelp)) value = e.value
    return value
  },
  provide: f => showPanel.from(f, on => on ? createHelpPanel : null)
})
export function helpPanel() {
  return [helpPanelState, keymap.of(helpKeymap), helpTheme]
}