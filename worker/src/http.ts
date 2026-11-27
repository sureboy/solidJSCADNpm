import express from 'express';
import {type baseConfig,defaultConfig} from '#lib/utils/baseConfig.ts'
import { fileURLToPath,pathToFileURL } from 'url';
import { dirname,join ,resolve,relative} from 'path';
import { build } from 'esbuild';
import os from 'os';
import { createHash } from 'crypto';
//import type { Response as ExpressResponse } from 'express';
import cors from 'cors';
import ip from 'ip'
import qrcode from 'qrcode'
import fs from 'fs';
const TMP_CACHE_DIR = join(os.tmpdir(), 'esm-modules-cache');
fs.mkdirSync(TMP_CACHE_DIR, { recursive: true });
/** 解析包的入口文件：exports -> module -> main -> index.js */
function resolveEntry(pkgRoot: string, pkg: any): string {
    const pick = (exp: any): string | undefined =>
        typeof exp === 'string' ? exp :
        exp?.['.'] && (
            (typeof exp['.'] === 'string' ? exp['.'] :
             exp['.'].import ?? exp['.'].browser ?? exp['.'].default ?? exp['.'].require)
        );
    const fromExports = pick(pkg.exports);
    if (fromExports) return resolve(pkgRoot, fromExports);
    if (pkg.module) return resolve(pkgRoot, pkg.module);
    if (pkg.main)   return resolve(pkgRoot, pkg.main);
    return resolve(pkgRoot, 'index.js');
}
 
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
    app.post("/err",async (req,res)=>{
        const text = req.body ?? "";
        text.split(/\r?\n/).filter(Boolean).forEach((line:any) => console.log(line));
        res.sendStatus(200);
    })
    app.use('/src',express.static(config.srcDir ))
    //app.use('/tmp',express.static(TMP_CACHE_DIR))
    app.get('/modules/*path',async (req,res)=>{
        let  pkgPath  = req.params.path;
        const p = join(config.srcDir,"node_modules",...pkgPath )

        if (/\.(wasm|wasm\.map)$/i.test(pkgPath[pkgPath.length-1])) {
            return res.redirect(302, `/src/node_modules/${pkgPath.join("/")}`);
        }
        const packageConfig = JSON.parse(fs.readFileSync(join(p,"package.json"),'utf-8'))
        if (packageConfig.type === "module" && (packageConfig.main as string).endsWith('.js')){
            const mainRel = packageConfig.main.replace(/^\.\//, '');
            const rel = ['node_modules', ...pkgPath , mainRel].join('/');
            return res.redirect(302, `/src/${rel}`);
        //}else{
            //esbuild 转 esm 
        }
         const entry = resolveEntry(p, packageConfig);

        // 缓存 key：包路径 + 版本 + 入口，版本不变则复用
        const cacheKey = createHash('sha256')
            .update(`${p}|${packageConfig.version ?? ''}|${entry}`)
            .digest('hex')
            .slice(0, 20);
        const outFile = join(TMP_CACHE_DIR,...pkgPath, `${cacheKey}.js`);

        try {
            if (!fs.existsSync(outFile)) {
                // 写临时文件名再 rename，避免并发请求同时写同一文件
                const tmpOut = `${outFile}.${process.pid}.${Date.now()}.tmp`;
                await build({
                    entryPoints: [entry],
                    bundle: true,                  // 关键：把所有依赖打进来
                    format: 'esm',
                    platform: 'browser',
                    target: ['es2020'],
                    outfile: tmpOut,
                    define: {
                        'process.env.NODE_ENV': '"production"',
                    },
                    // 浏览器用不到的包可以走空模块，避免 Node 内置模块报错
                    // 若包确实需要 node:fs 等，应返回错误而不是静默失败
                    logLevel: 'silent',
                });
                fs.renameSync(tmpOut, outFile);
            }

            res.type('application/javascript');
            res.set('Cache-Control', 'public, max-age=3600');
            return res.sendFile(outFile);
        } catch (err: any) {
            console.error(`[esbuild] 转换 ${pkgPath} 失败:`, err?.message || err);
            return res.status(500).json({
                error: 'esbuild transform failed',
                package: pkgPath,
                message: err?.message,
            });
        }
    })
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