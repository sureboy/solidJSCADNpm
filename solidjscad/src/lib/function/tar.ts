import { createTarPacker,createTarDecoder } from 'modern-tar';
//import { getWorker } from '$lib/worker/globalWorker';
//import {} from "$lib/function/fileHandle"
import {getDirHandle, type DirInfoType } from '#lib/function/fileHandle.js'; 
export async function extractTarStreamToOPFS( tarFile:File) { 
    const fileStream = tarFile.stream(); 
    const decompressedStream = fileStream.pipeThrough(new DecompressionStream('gzip')); 
    const tarStream = decompressedStream.pipeThrough(createTarDecoder());
    const PathName = tarFile.name.split('.')[0]
    //const decompressedStream = tarFile.stream()
    //    .pipeThrough(new DecompressionStream('gzip'));
    
    // 将解压后的流（TAR 数据）转换为 Uint8Array
    //const tarBuffer = new Uint8Array(await new Response(decompressedStream).arrayBuffer());
    //const tarStream = decompressedStream.pipeThrough(createTarDecoder());
    // 使用 modern-tar 解包 TAR 数据
    //const entries = await unpackTar(tarBuffer);
    const dirHandle = getDirHandle(PathName,{create:true})
     
    //const root = await navigator.storage.getDirectory();
    //const dirHandle =await root.getDirectoryHandle(PathName,{create:true})
    const reader = tarStream.getReader();
    try {
        while (true) {
            const { value: entry, done } = await reader.read();
            if (done) break;

            //const path = entry.header.name.replace(/^\.?\/?/, '');
            //const lastSlash = path.lastIndexOf('/');
            //const parentDir = lastSlash !== -1 ? path.substring(0, lastSlash) : '';

            if (entry.header.type === 'file') { 
              console.log(entry)
              const handle = dirHandle.getFileHandle(encodeURIComponent(entry.header.name) )
              //dirHandle.getFileHandle()
              //const f =await getFileHandleFromOPFS( entry.header.name,{create:true,root}) 
              const w =await  handle.createWriteStream()//.createWritable() 
              const reader = entry.body.getReader() 
              while (true) {
                const { done, value } = await reader.read(); // value 是 Uint8Array
                if (done) break;
                await w.write(value)
               // result += decoder.decode(value, { stream: true }); // 逐块解码为字符串
              }
              await w.close()
              
              //await entry.body.pipeTo(w); 
            }
        }
    } finally {
        reader.releaseLock();
    } 
} 
/*
export const getFileData = async (name:string)=>{
  const w =await getWorker()
  return new Promise<{name:string,db:string}>((resolve,reject)=>{
    const handle = (e:any)=>{
      if (e.data.name && e.data.db && e.data.name === name){
        w.removeEventListener("message",handle)
        resolve({name,db:e.data.db})
      }
    }
    w?.addEventListener("message",handle)
    w.postMessage({name,src:true})
  }) 
}
export const getFileList =async (DirInfo:DirInfoType,getFile:(db:{name:string,db:string},_w: Worker)=>void)=>{
  const w =await getWorker()
  await new Promise((resolve,reject)=>{
    const files = new Set<string>() 
    const handleFiles = (e:any)=>{
      //console.log("get list",e.data,files)
      if (e.data.path && e.data.files){
        e.data.files.forEach((f:any) => {
          w.postMessage({name:decodeURIComponent(f.name),src:true})
          files.add(f.name)
        });
        console.log(e.data)
      }
      if (e.data.name && e.data.db){
        getFile(e.data,w)
        files.delete(e.data.fileName || encodeURIComponent(e.data.name) )
        if (files.size===0){
          files.clear()
          
          w.removeEventListener("message",handleFiles)
          resolve(undefined)
        }
      }
    }
    w?.addEventListener("message",handleFiles)
    w?.postMessage({path,files:true})
  }) 
  
}*/
export async function  downloadOpfsAsTarGz(DirInfo?:DirInfoType, archiveName = 'archive.tar.gz') {
  // 1. 创建 tar 打包器
  const { readable, controller } = createTarPacker();
  const encoder = new TextEncoder()
  DirInfo?.DirHandle?.files().then(async (list)=>{ 
    try{
      for (let v of list){ 
        const fileStream = controller.add({name:decodeURIComponent(v.name),size:v.size!,type: 'file'})
        const writer = fileStream.getWriter();
        const db = await DirInfo.DirHandle?.getFileHandle(v.name).read() 
        await writer.write(encoder.encode(db));
        await writer.close(); 
      }
    }finally {
      // 所有文件添加完成后，必须 finalize
      controller.finalize();
    }
    
  });
  
  //})();

  // 3. 使用浏览器原生 API 进行 gzip 压缩
  const compressedStream = readable.pipeThrough(new CompressionStream('gzip'));

  // 4. 将压缩流转换为 Blob 并触发下载
  const reader = compressedStream.getReader();
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const blob = new Blob(chunks, { type: 'application/gzip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = archiveName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}