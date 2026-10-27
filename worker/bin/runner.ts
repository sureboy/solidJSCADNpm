#!/usr/bin/env node
import {startWorker,postMessage,startHttp} from '../src/index.ts' 
import {type baseConfig} from '#lib/utils/baseConfig.ts'
import type { Response as ExpressResponse } from 'express';
import path from 'path';
import {walk,mtime} from '#lib/utils/walkFile.ts'
 

const __dirname = process.cwd(); 
console.log(__dirname)
const baseConfig = {srcDir:__dirname}
const worker = startWorker(baseConfig)
startHttp(baseConfig,async (conf:baseConfig,res: ExpressResponse)=>{
    const REL = './index.js';
    const srcFile = path.join(conf.srcDir, REL);
    const tmpFile = path.join(conf.tmpDir||"./", REL);
    function isSrcNewer() {
        const s = mtime(srcFile);
        const t = mtime(tmpFile);
        if (s < 0) return false;      // 源不存在
        if (t < 0) return true;       // tmp 不存在，视为需要同步
        return s > t;
    }
    const handMsg = (msg:any)=>{
      //console.log(msg)
      res.write(`data: ${JSON.stringify(msg)}\n\n`)
      if (msg.end){
        worker.removeListener("message",handMsg)
        res.end()
      } 
    }
    if (isSrcNewer()) {
        postMessage({name:"./index.js"})
        worker.addListener("message",handMsg)
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
    }
    //console.log(walk(tmpFile));
    //const tmpfile = walk(tmpFile)
    //return {tmpfile,...conf}
}) 