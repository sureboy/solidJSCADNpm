import { 
    //autocompletion,
    CompletionContext } from '@codemirror/autocomplete'; 
//import jscadCompletions from '$lib/assets/jscadCompletions.json';
import { snippets } from '@codemirror/lang-javascript';
import type {CompletionResult,Completion} from '@codemirror/autocomplete'
import { javascriptLanguage, } from '@codemirror/lang-javascript';
//import {TreeCursor}  from '@codemirror/lang-javascript'
import { type TreeCursor } from '@lezer/common'; 
import {hoverTooltip} from "@codemirror/view"

export const wordHover = hoverTooltip((view, pos, side) => {
  let {from, to, text} = view.state.doc.lineAt(pos)
  let start = pos, end = pos
  while (start > from && /[\w.]+/.test(text[start - from - 1])) start--
  while (end < to && /[\w.]+/.test(text[end - from])) end++
  if (start == pos && side < 0 || end == pos && side > 0)
    return null

    const code = text.slice(start - from, end - from)
   //console.log(code.slice(0,code.indexOf('.')),cadImport)
    let opt = cadImport[code.slice(0,code.indexOf('.'))] as Completion[]
    //if (cadImport)
    if (!opt) return null
    //const item = opt[code]
    opt = opt.filter(item=>{
        if (
            item.label.startsWith(code) &&
            item.info
        ){
            return true;
        }else
            return false
    })
    
    if (opt.length===0)return null
    //console.log(code,opt)
  return {
    pos: start,
    end,
    above: true,
    create: (view)=> {
        let dom = document.createElement("div") 
        //dom.style.width="100%"
        if (opt.length===1){
            const item = opt[0]
            if (  typeof item.info ===  'string'){
                const p = document.createElement("p")
                p.textContent = JSON.stringify(item.info)
                dom.appendChild(p) 
            }else{
                  
                 const objdom =  item.info?.(item)
                 if (objdom &&  'dom' in objdom){
                    //(objdom.dom as HTMLElement).style.width="500px"
                    const textareaDom = objdom.dom as HTMLTextAreaElement
                    textareaDom.style.width = `${window.innerWidth/2}px`;
                    textareaDom.style.minWidth="300px"
                    dom.appendChild(textareaDom)
                 }
                 
            }
        }else
        opt.forEach(item => { 
            //if (!item.info)return
            //if (  typeof item.info ===  'string'){
            //console.log(item)
            if (item.sortText){
                const p = document.createElement("p")
                p.textContent =  (item.sortText as string ) 
                dom.appendChild(p)
            }
                /*
            }else{
                 
                 const objdom = await item.info?.(item)
                 if (objdom &&  'dom' in objdom){
                    //(objdom.dom as HTMLElement).style.width="500px"
                    const textareaDom = objdom.dom as HTMLTextAreaElement
                    textareaDom.style.width = `${window.innerWidth/2}px`;
                    textareaDom.style.minWidth="300px"
                    dom.appendChild(textareaDom)
                 }
                 
            }*/ 
        }) 
        return {dom} 
    }
  }
})
const cadImport:{[k:string]:Completion[]} = {}
let VariableList:any[] = []
const ImportVarList:{[k:string]:{doc:string,tree:TreeCursor,list:any[]}}  = {}
export function jscadModelingCompletionSource (context:CompletionContext): CompletionResult | null  {
    let word = context.matchBefore(/[\w.]+/);
    if (!word || (word.from == word.to && !context.explicit)) return null; 
    let opt = cadImport[word.text.slice(0,word.text.indexOf('.'))] as Completion[]
    if (opt){
        const lastd =word.text.lastIndexOf(".")
        
        const k = word.text.slice(lastd+1)
        //console.log(lastd,k)
        opt = opt.filter(item => item.label.startsWith(word.text))
        if (k){
            return { 
                from: word.from , 
                options: opt,
                validFor: /^[\w.]*$/ 
            };
        }else{
            //return null
            return { 
                from: word.from , 
                options: opt.filter(item =>  item.label.lastIndexOf(".") ===lastd ) ,
                validFor: /^[\w.]*$/ 
            };
        }
    }else{
         
        if (ImportVarList){
            for (const [k,v] of Object.entries(ImportVarList)){
                VariableList.push(...v.list )
                v.list = []
                //while (v.list.length) VariableList.push(v.list.shift())
              
            }
            //VariableList.push(...ImportVarList)
            //ImportVarList.length = 0; 
        }
        //console.log(VariableList)
        opt = VariableList.filter(item=>item.label.startsWith(word.text))
        //opt = opt.concat(...ImportVarList.filter(item=>item.label.startsWith(word.text)));
        if (opt.length>0)
        return { 
            from: word.from , 
            options: opt  ,
            validFor: /^[\w.]*$/ 
        };
        //else{
            
        //}
    }
 
    return {
        from: word.from,
        options:snippets 
    };
   
};
//const baseExtensions = 

export function getImportAliases(doc: string,name?:string) { 
    if (!name)return;
    const tree = javascriptLanguage.parser.parse(doc); 
    let iter = tree.cursor();
    let val = ImportVarList[name]
    if (!val){
        val = {doc,tree:iter,list:[]}
    }else{
        val.list=[]
        val.doc= doc
        val.tree = iter;
    }

    VariableList=[]
    do {
        switch (iter.name as string){
            case "ImportDeclaration":
                if (iter.firstChild())
                    handleTreeCursorImport (iter,doc) 
                break;
                
            case "VariableDeclaration":
                if (iter.firstChild()){
                    VariableList.push(handleTreeCursorVariable (iter,doc) )
                //}else{
                    //console.log(doc.slice(iter.from, iter.to))
                }
                break;
            case "FunctionDeclaration":
                if (iter.firstChild()){
                    VariableList.push(handleTreeCursorFunction(iter,doc))
                }
                break;
            case "ClassDeclaration": 
                if (iter.firstChild()){
                    VariableList.push( handleTreeCursorClass(iter,doc))
                }
                break
            //case "ExportDeclaration":
            //    console.log( "e",iter.name, doc.slice(iter.from, iter.to));
            //    break;
            //default:
            //    console.log("--",iter.name, doc.slice(iter.from, iter.to));
        }

    } while (iter.next());
    //VariableList = ImportVarList
    //VariableList = Array.from(new Set(VariableList))

    //return jscadKey
    //return aliases;
}

const handleTreeCursorImport  = (iter:TreeCursor,doc: string)=>{
    const importInfo = {as:'',key:''}
    do {
        switch (iter.name as string){
            case "VariableDefinition":
                importInfo.as = doc.slice(iter.from, iter.to)
                VariableList.push({type:'variable',label:importInfo.as})
                break;
            case "String":
                importInfo.key = doc.slice(iter.from, iter.to)
                break;
        }
    } while (iter.nextSibling());
    iter.parent()
    fetch(`/${importInfo.key.replace(/[^a-zA-Z0-9\-_]/g, '')}.json`).then(r=>{
        if (!r.ok)return;
        r.json().then(v=>{
            
            cadImport[importInfo.as] = v.list.map((l:any)=>{
                const oriLabel = (l.label as string)
                l.oriLabel = oriLabel
                l.label = importInfo.as +'.'+l.oriLabel
                l.sortText=  oriLabel.slice( oriLabel.lastIndexOf("."))
                const info = l.info
                l.info = ()=>{
                    const dom = document.createElement("textarea")
                    dom.value = info
                    dom.readOnly=true
                    dom.rows = 10 
                    dom.style.background="transparent"
                    dom.style.outline ="none"
                    dom.style.border = "none"
                    return {dom}
                }
                return l
            })
            //cadImport[importInfo.as] = v.list
        })
    }) 
}
const handleTreeCursorVariable  = (iter:TreeCursor,doc: string)=>{
    const Variable = {type:'variable',label:''}
    do {
        
        switch (iter.name as string){
            case "VariableDefinition":
                Variable.label=doc.slice(iter.from, iter.to);
                break
            case "ArrowFunction":
                Variable.type = "function"
                break
            //default:
                //console.log(iter.name, doc.slice(iter.from, iter.to));
        }

     } while (iter.nextSibling());
     //VariableList.push(Variable)
     iter.parent()
     return Variable
}
const handleTreeCursorClass  = (iter:TreeCursor,doc: string)=>{
    const Variable = {type:'class',label:''}
    do {     
        console.log(iter.name,doc.slice(iter.from,iter.to))
        if (iter.name === "VariableDefinition"){
            Variable.label=doc.slice(iter.from, iter.to);
            break
        } 
     } while (iter.nextSibling());
     //VariableList.push(Variable)
     iter.parent()
     return Variable
}
const handleTreeCursorFunction  = (iter:TreeCursor,doc: string)=>{
    const Variable = {type:'function',label:''}
    do {     

        if (iter.name === "VariableDefinition"){
            Variable.label=doc.slice(iter.from, iter.to);
            break
        } 
     } while (iter.nextSibling());
     //VariableList.push(Variable)
     iter.parent()
     return Variable
}
const handleTreeCursorExport  = (iter:TreeCursor,doc: string,getVar:(vari:any)=>void)=>{
    //const Variable = {type:'function',label:''}
    do {     
        switch (iter.name as string){
            case "VariableDeclaration":
                if (iter.firstChild()){
                    getVar(  handleTreeCursorVariable (iter,doc))
               
                }
                break;
            case "FunctionDeclaration":
                if (iter.firstChild()){
                    getVar(  handleTreeCursorFunction(iter,doc))
                }
                break;
            case "ClassDeclaration":
                
                if (iter.firstChild()){
                    getVar( handleTreeCursorClass(iter,doc))
                }
                break
            case "ExportGroup":
                if (iter.firstChild()){
                    do {    
                        if ("VariableName" ===iter.name) {
                            const vari = {type:'function',label:''}
                            vari.label = doc.slice(iter.from,iter.to)
                            getVar( vari)
                        }
                        console.log("ExportGroup",iter.name,doc.slice(iter.from,iter.to))
                    } while (iter.nextSibling());
                    //VariableList.push(Variable)
                    iter.parent()
                }
                break
            default:
                //console.log(iter.name,doc.slice(iter.from,iter.to))
        }
     } while (iter.nextSibling());
     //VariableList.push(Variable)
     iter.parent()
     //return Variable
}
export function getImport(doc:string,fileName:string){
    
    const tree = javascriptLanguage.parser.parse(doc); 
    let iter = tree.cursor();
    const list:any[] = []
    do {
        if ("ExportDeclaration"=== iter.name){
            if (iter.firstChild()){
                handleTreeCursorExport(iter,doc,(v)=>{
                    v.detail = fileName
                    list.push(v)
                })
            }
        } 
    } while (iter.next());
    //console.log("import",importList)
    ImportVarList[fileName] = {doc,tree:iter,list}
    //return importList
}