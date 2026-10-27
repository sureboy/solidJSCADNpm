
import * as Y from 'yjs'
import diff from 'fast-diff'; 
const channelYdoc = new Map<string,{
    ydoc:Y.Doc,
    BroadcastCh?:BroadcastChannel,
    DataChannels:{
        onmessage:any,
        send:any,
        label:string,
        readyState:string}[]}>()

export const diffUpdate=(text:string,ydoc:Y.Doc,origin?:string)=>{
    const ytext = ydoc.getText('content');
    // 2. 获取当前文本
    const oldText = ytext.toString();
    //const newText = "这是只修改了几个字的新句子";
    const diffs = diff(oldText, text);
    const delta = diffs.map(([op, value]) => {
        if (op === diff.INSERT) {
            return { insert: value };
        } else if (op === diff.DELETE) {
            return { delete: value.length };
        } else { // op === diff.EQUAL
            return { retain: value.length };
        }
    });
    ydoc.transact(() => {
        ytext.applyDelta(delta);
    },origin);
}
export const initDocEasy = (filename:string)=>{
    let handle = channelYdoc.get(filename)
    if (!handle ){
        handle = {ydoc:new Y.Doc(),
            BroadcastCh:new BroadcastChannel(filename)
            ,DataChannels:[]}
        //const channelBase = new BroadcastChannel(filename)
        handle.ydoc.on("update",(update,origin)=>{ 
            handle?.BroadcastCh?.postMessage({
                update,
                origin,
                db:handle.ydoc.getText("content").toString()
            })
        })
    }
    return handle
}
export const initDoc = (filename:string,fileCHannel?: RTCDataChannel,getdb?:(t:string)=>void  )=>{
    //console.log("initDoc",filename)
    let handle = channelYdoc.get(filename)
    if (!handle && fileCHannel){
        handle = {ydoc:new Y.Doc(),DataChannels:[]}
        
        channelYdoc.set(filename,handle)
        handle.ydoc.on("update",(update,origin)=>{ 
            //if (  origin===_origin)return;
            handle?.DataChannels.forEach(c=>{
                if (c.label===origin || c.readyState!="open"){
                    return
                }
                //console.log("send",filename)
                c.send(update as Uint8Array<ArrayBuffer>)
                //if (c.readyState!="open")
            })
            
        })
    } 
    const ydoc =handle?.ydoc
    if (fileCHannel && ydoc){
        handle?.DataChannels.push(fileCHannel) 
        //console.log(fileCHannel.label,handle)
        fileCHannel.onmessage = (event)=>{  
            //console.log("get channel",event,channelYdoc.size)
            updateDoc(event.data,ydoc,fileCHannel.label)
            getdb?.(ydoc.getText("content").toString())
        }
    }

    return handle
}
export const updateDoc = (data:any,ydoc:Y.Doc,_origin:string )=>{

    if (data == null) {
        console.warn('Received null/undefined data, ignoring');
        return;
    }
  // 2. 如果是 string（可能是 Base64 或 JSON），需要转换
    if (typeof data === 'string') {
    // 假设你的发送端将 Uint8Array 编码为了 Base64 字符串
    try {
        const binaryString = atob(data); // 解码 Base64
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        Y.applyUpdate(ydoc, bytes, _origin);
    } catch (e) {
        console.error('Failed to decode Base64 string:', e);
    }
    return;
    }
    if (data instanceof Blob) {
    // 如果 binaryType 是 'blob'，需要异步读取
    const reader = new FileReader();
    reader.onload = () => {
        const update = new Uint8Array(reader.result  as ArrayBuffer);
        Y.applyUpdate(ydoc, update, _origin);
    };
    reader.readAsArrayBuffer(data);
    return;
    }
    
    if (data instanceof ArrayBuffer) {
    const update = new Uint8Array(data);
    Y.applyUpdate(ydoc, update  , _origin);
    return;
    }

    console.warn('Unsupported data type received:', typeof data);
}