#!/usr/bin/env node
import {startWorker,postMessage,startHttp} from '../src/index.ts' 
import {  type baseConfig} from '#lib/utils/baseConfig.ts'
import {binaryReplacer} from '#lib/utils/workerLib.ts'; 
import { Readable } from "node:stream";
//import type { Response as ExpressResponse } from 'express';
import path from 'path';
import {walk,mtime} from '#lib/utils/walkFile.ts'
import fs from 'fs';
import  { pipeline }  from "stream/promises" ;

const __dirname = process.cwd(); 
//console.log(__dirname)
const Config:baseConfig = {srcDir:__dirname,Port:3000}
const data = fs.readFileSync('./package.json','utf-8')
const packageConfig = JSON.parse(data);
const REL =packageConfig.main || './index.js';
const worker = startWorker(Config)
const tmp = new Map<string,ArrayBuffer>()
let tmpMain = "main"
function* chunks(buf: Buffer, size = 64 * 1024) {
  for (let i = 0; i < buf.length; i += size) {
    yield buf.subarray(i, i + size);
  }
}
startHttp(Config,(app)=>{
  app.get("/tmp/:token",async (req,res)=>{
    //console.log(req)
    const { token } = req.params;
    
    const entry = tmp.get(encodeURIComponent(token))
    if (!entry) {
      return res.status(404).end(); // 不存在或已过期，统一 404
    }
     const baseHeaders = {
      "Content-Type":   "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(token)}"`,
      "Cache-Control": "no-store, must-revalidate",
      "Accept-Ranges": "bytes",
    };
    const isHead = req.method === "HEAD";
    const range = req.headers.range;
    //res.writeHead(200, { ...baseHeaders, "Content-Length": entry.byteLength });
    console.log(token,req.path,entry.byteLength,isHead,range)
    if (!range) {
      res.writeHead(200, { ...baseHeaders, "Content-Length":  entry.byteLength });
      if (isHead) return res.end();

      try {
        //console.log(entry)
        //console.log("[4] writeHead done, headersSent =", res.headersSent);
        await pipeline(Readable.from(chunks(Buffer.from(entry))), res);
        //console.log("[5] pipeline finished OK");
      } catch (err: any) {
        console.log(err)
        if (err?.code === "ERR_STREAM_PREMATURE_CLOSE") return;
        if (!res.headersSent) {
          try { res.status(500).end(); } catch {}
        } else {
          res.destroy();
        }
      }
      return;
    }
    
  })
  app.use("/run",async (req,res)=>{
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    try { 
    const srcFile = path.join(Config.srcDir, REL);
    const tmpFile = path.join(Config.tmpDir||"./", REL);
    function isSrcNewer() {
        const s = mtime(srcFile);
        const t = mtime(tmpFile);
        //console.log(s,t)
        if (s < 0) return false;      // 源不存在
        if (t < 0) return true;       // tmp 不存在，视为需要同步
        return s > t;
    }
    const handMsg = (msg:any)=>{
      //console.log(msg)
      if (msg.main){
        tmpMain = msg.main
       
      }
      if (msg.index){
         //tmp.set(`${REL+currMainFunctionName}${msg.index}`,msg)
        res.write(`data: ${JSON.stringify(
          Object.assign(msg,{tag:tmpMain}),(k:string,v:any)=>{
          const val = binaryReplacer(v)
          try{
            if (val.__type){
              const tmpName = encodeURIComponent(`${REL+tmpMain}${msg.index}${k}`)
              tmp.set(tmpName,val.data)
              return {__type:val.__type,url:"/tmp/"+tmpName}
            }
          }catch(e){
            //console.error(e)
          } 
          return val 
        })}\n\n`)
      }else{
        res.write(`data: ${JSON.stringify(msg)}\n\n`)
      }

      if (msg.end){
        worker.removeListener("message",handMsg)
        res.end()
      } 
    }
    //if (isSrcNewer()) {
      //console.log("run")
        postMessage({name:REL})
        worker.addListener("message",handMsg)
        /*
    }else{
      const mainList:string[] = []
      for (let f of walk(tmpFile,conf.tmpDir)  ){
        //console.log(f.rel)
        if (f.type === "dir"){
          mainList.push(path.basename(f.rel))
          continue
        }
        res.write(`data: ${JSON.stringify({tmpPart:f.rel,run:mainList[mainList.length-1]})}\n\n`)
      }
      res.write(`data: ${JSON.stringify({mainList})}\n\n`)
      res.end();
    }*/
    //console.log(walk(tmpFile));
    //const tmpfile = walk(tmpFile)
    //return {tmpfile,...conf}
 
            //res.status(200).json({ok:true,msg});   
        } catch (err:any) {
            res.status(500).json({ ok: false, error: err.message });
        }
    })
},) 