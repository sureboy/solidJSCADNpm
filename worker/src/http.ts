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
    app.listen(PORT, () => {
        const Ruri = `http://${ip.address()}:${PORT}`
        qrcode.toString(Ruri, { type: 'terminal'  }, (err, string) => {
            console.log(string);
        });
        //    console.log(Ruri); 
        console.log(`Server running at ${Ruri}\n http://localhost:${PORT}`);
        console.log(`Server running at ${Ruri}\n http://localhost:${PORT}/view.html#${config.index||"./src/index.js"}`);
    });
}