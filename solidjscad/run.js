#!/usr/bin/env node
import { handler } from './build/handler.js';
import express from 'express';
//import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;
const currentDir = process.cwd();
//app.use(cors());

// 自定义 API 路由（优先于 SvelteKit 处理）
app.use(express.static(currentDir, {
  dotfiles: 'deny',       // 拒绝 . 开头的文件
  index: false,           // 不自动列出 index
  setHeaders: (res, path) => {
    // 可选：添加缓存头
  }
}));

// 其余请求交由 SvelteKit 处理（包括 UI 页面和静态资源）
app.use(handler);

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});