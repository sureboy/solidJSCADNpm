import express from 'express';
import {type baseConfig,defaultConfig} from '#lib/utils/baseConfig.ts'
import { fileURLToPath,pathToFileURL } from 'url';
import { dirname,join } from 'path';
import type { Response as ExpressResponse } from 'express';
import cors from 'cors';
import ip from 'ip'
import qrcode from 'qrcode'
//import * as path from 'path'
//const __dirname  = dirname(fileURLToPath(import.meta.url))
export const startHttp =async (opt:baseConfig,getApp:(app: express.Express)=>void )=>{ 
    //console.log("solidjscad",t)
    const config = Object.assign({},defaultConfig,opt)
    const app = express();
    app.use(cors());
    const PORT = opt.Port || 3000; 
    getApp(app)
    /*
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
    })*/
    app.use('/src',express.static(config.srcDir ))
 
    app.use(express.static(
        config.uiDir||
        join(dirname(fileURLToPath(import.meta.url)),"ui")  
    ));
    /*
    if (config.tmpDir)
    app.use('/tmp',express.static(config.tmpDir, { 
        index: false, 
        etag: false,          // 关闭 ETag（否则浏览器仍会发条件请求）
        lastModified: false,  // 关闭 Last-Modified
        setHeaders: (res, filePath) => {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
            res.setHeader('Pragma', 'no-cache');        // 兼容 HTTP/1.0
            res.setHeader('Expires', '0');              // 兼容老浏览器
            res.setHeader('Surrogate-Control', 'no-store'); // 针对 CDN / 反向代理
        }
    }));*/
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
        const Ruri = `http://${ip.address()}:${PORT}`
        qrcode.toString(Ruri, { type: 'terminal'  }, (err, string) => {
            console.log(string);
        });
        //    console.log(Ruri); 
        console.log(`Server running at ${Ruri}\n http://localhost:${PORT}`);
    });
}