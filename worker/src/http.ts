import express from 'express';
import {type baseConfig,defaultConfig} from '#lib/utils/baseConfig.ts'
import { fileURLToPath,pathToFileURL } from 'url';
import { dirname,join } from 'path';
import type { Response as ExpressResponse } from 'express';
import cors from 'cors';
//import * as path from 'path'
//const __dirname  = dirname(fileURLToPath(import.meta.url))
export const startHttp =async (opt:baseConfig,handle:(config:baseConfig,res: ExpressResponse)=>Promise<any> )=>{ 
    //console.log("solidjscad",t)
    const config = Object.assign({},defaultConfig,opt)
    const app = express();
    app.use(cors());
    const PORT = process.env.PORT || 3000; 
    app.use("/run",async (req,res)=>{
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        try {
            await handle(config,res)
            //res.status(200).json({ok:true,msg});   
        } catch (err:any) {
            res.status(500).json({ ok: false, error: err.message });
        }
    })
    app.use('/src',express.static(config.srcDir ))
 
    app.use('/preview',express.static(
        config.uiDir||
        join(dirname(fileURLToPath(import.meta.url)),"ui")  
    ));
    if (config.tmpDir)
    app.use('/tmp',express.static(config.tmpDir, { 
        index: false, 
        setHeaders: (res, path) => {
            // 可选：添加缓存头
        }
    }));
    /*
    app.get('/events', (req, res) => {
        // 1. 设置 SSE 必需的响应头
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // 2. 发送初始消息，告知客户端连接成功
        //res.write('data: Connected to event stream\n\n');

        // 3. 定期推送数据
        const intervalId = setInterval(() => {
            const data = { time: new Date().toTimeString(), message: 'Server update' };
            // SSE 消息格式：`data: ${内容}\n\n`
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        }, 5000);

        // 4. 客户端断开时，清理定时器，避免资源浪费
        req.on('close', () => {
            clearInterval(intervalId);
        });
    });*/
    app.listen(PORT, () => {
    console.log('Server running at http://localhost:3000');
    });
}