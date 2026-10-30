#!/usr/bin/env node
import {startWorker,postMessage,startHttp} from '../src/index.ts' 
import {  type baseConfig} from '#lib/utils/baseConfig.ts'
import {binaryReplacer} from '#lib/utils/workerLib.ts'; 
import { Readable } from "node:stream";
//import type { Response as ExpressResponse } from 'express';
import path from 'path';
import {maxMtimeRecursive} from '#lib/utils/walkFile.ts'
import fs from 'fs';
import  { pipeline }  from "stream/promises" ;

//const __dirname = process.cwd(); 
//console.log(__dirname)
const Config:baseConfig = {srcDir:process.cwd(),Port:3000} 
const worker = startWorker(Config)
const tmp = new Map<string,ArrayBuffer>()
//let tmpMain = "main"
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
    //console.log(token,req.path,entry.byteLength,isHead,range)
    if (!range) {
      res.writeHead(200, { ...baseHeaders, "Content-Length":  entry.byteLength });
      if (isHead) return res.end(); 
      try {
 
        await pipeline(Readable.from(chunks(Buffer.from(entry))), res); 
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
  app.get("/run/:main",async (req,res)=>{
    let { main } = req.params;
    //if (!main)main="main"
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    try {  
      const packageConfig = JSON.parse(fs.readFileSync('./package.json','utf-8'));
      const REL =packageConfig.main || './index.js';
      const handMsg = (msg:any)=>{  
        if (msg.index){
          //tmp.set(`${REL+currMainFunctionName}${msg.index}`,msg)
          res.write(`data: ${JSON.stringify(
            msg,(k:string,v:any)=>{
            const val = binaryReplacer(v)
            try{
              if (val.__type){
                const tmpName = encodeURIComponent(`${REL+msg.main}${msg.index}${k}`)
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
      postMessage({name:REL,main,time:await maxMtimeRecursive(Config.srcDir)})
      worker.addListener("message",handMsg) 
    } catch (err:any) {
        console.error(err)
        res.status(500).json({ ok: false, error: err.message });
    }
  })
},) 